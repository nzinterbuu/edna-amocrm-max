import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../db/prisma.service';
import { AmocrmChatClient } from '../amocrm/amocrm-chat.client';
import { MaxIncomingWebhookParser } from '../edna/max-incoming-webhook.parser';
import { ConversationMappingService } from '../mappings/conversation-mapping.service';
import { RetryQueueService } from '../../queue/retry-queue.service';

@Injectable()
export class InboundMaxService {
  private readonly log = new Logger(InboundMaxService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly parser: MaxIncomingWebhookParser,
    private readonly chat: AmocrmChatClient,
    private readonly conv: ConversationMappingService,
    private readonly retries: RetryQueueService,
  ) {}

  async handleWebhook(connectionId: string, rawBody: unknown) {
    const parsed = this.parser.parse(rawBody);
    if (!parsed) {
      this.log.debug('Skipping non-TEXT or invalid MAX inbound payload');
      return { accepted: true, skipped: true as const };
    }

    const conn = await this.prisma.channelConnection.findFirst({
      where: { id: connectionId, status: 'active' },
      include: { installation: true },
    });
    if (!conn) {
      this.log.warn(`No active channel connection ${connectionId}`);
      return { accepted: false, error: 'unknown_connection' as const };
    }

    const sourceMessageId = String(parsed.id);

    try {
      await this.prisma.messageMapping.create({
        data: {
          channelConnectionId: conn.id,
          direction: 'inbound',
          sourceSystem: 'max',
          sourceMessageId,
          payload: parsed as unknown as Prisma.InputJsonValue,
          deliveryStatus: 'processing',
        },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        this.log.debug(`Deduped MAX message ${sourceMessageId}`);
        return {
          accepted: true,
          duplicate: true as const,
          message_id: sourceMessageId,
        };
      }
      throw e;
    }

    const mapping = await this.conv.findOrCreateForInboundUser({
      channelConnectionId: conn.id,
      maxUserId: parsed.subscriber.identifier,
    });

    await this.prisma.messageMapping.updateMany({
      where: {
        channelConnectionId: conn.id,
        sourceSystem: 'max',
        sourceMessageId,
      },
      data: { conversationMappingId: mapping.id },
    });

    const name = this.parser.displayName(parsed);
    const tsSec = Math.floor(Date.now() / 1000);
    const msec = Date.now();

    const amoPayload = {
      timestamp: tsSec,
      msec_timestamp: msec,
      msgid: `max-in:${parsed.id}`,
      conversation_id: mapping.amocrmConversationId,
      sender: {
        id: parsed.subscriber.identifier,
        name,
        profile: { phone: '', email: '' },
      },
      message: {
        type: 'text',
        text: parsed.messageContent.text ?? '',
      },
      silent: false,
    };

    try {
      const amoResp = await this.retries.withRetries(
        'amo-inbound-new-message',
        () => this.chat.sendNewMessage(conn.scopeId, amoPayload),
      );
      const amoMsgid = amoResp.new_message?.msgid;
      await this.prisma.messageMapping.updateMany({
        where: {
          channelConnectionId: conn.id,
          sourceSystem: 'max',
          sourceMessageId,
        },
        data: {
          amoMsgid: amoMsgid ?? undefined,
          targetMessageId: amoResp.new_message?.ref_id,
          deliveryStatus: 'delivered',
        },
      });
    } catch (e) {
      this.log.error(` amo inbound failed: ${e}`);
      await this.prisma.integrationError.create({
        data: {
          channelConnectionId: conn.id,
          installationId: conn.installationId,
          scope: 'inbound_max',
          code: 'AMO_SEND_FAILED',
          message: String(e),
          details: { sourceMessageId },
        },
      });
      await this.prisma.messageMapping.updateMany({
        where: {
          channelConnectionId: conn.id,
          sourceSystem: 'max',
          sourceMessageId,
        },
        data: {
          deliveryStatus: 'failed',
          errorMessage: String(e),
        },
      });
      throw e;
    }

    return {
      accepted: true,
      message_id: sourceMessageId,
    };
  }
}
