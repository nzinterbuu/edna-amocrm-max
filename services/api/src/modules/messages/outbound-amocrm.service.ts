import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../db/prisma.service';
import { EdnaMaxOutboundClient } from '../edna/edna-max-outbound.client';
import { ConversationMappingService } from '../mappings/conversation-mapping.service';
import { RetryQueueService } from '../../queue/retry-queue.service';
import { AppConfigService } from '../../config/app-config.service';

/** Chat API v2 outgoing message webhook — see chat-webhooks docs */
export interface AmocrmOutgoingMessageHook {
  account_id: string;
  time: number;
  message: {
    receiver: {
      id: string;
      client_id?: string;
      phone?: string;
      email?: string;
    };
    sender: { id: string };
    conversation: { id: string; client_id?: string };
    timestamp: number;
    msec_timestamp: number;
    message: {
      id: string;
      type: string;
      text?: string;
    };
  };
}

@Injectable()
export class OutboundAmocrmService {
  private readonly log = new Logger(OutboundAmocrmService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly edna: EdnaMaxOutboundClient,
    private readonly conv: ConversationMappingService,
    private readonly retries: RetryQueueService,
    private readonly appConfig: AppConfigService,
  ) {}

  async handleWebhook(scopeId: string, body: AmocrmOutgoingMessageHook) {
    const inner = body.message;
    if (!inner?.message) {
      return { accepted: true, skipped: true as const };
    }
    if (inner.message.type !== 'text') {
      this.log.debug(`Skip amo outbound type=${inner.message.type}`);
      return { accepted: true, skipped: true as const };
    }

    const conn = await this.prisma.channelConnection.findFirst({
      where: { scopeId, status: 'active' },
    });
    if (!conn) {
      this.log.warn(`No connection for scope_id=${scopeId}`);
      return { accepted: false, error: 'unknown_scope' as const };
    }

    const clientConvId =
      inner.conversation?.client_id ?? inner.receiver?.client_id;
    if (!clientConvId) {
      this.log.warn('amo webhook missing conversation client_id');
      return { accepted: true, skipped: true as const };
    }

    const mapping = await this.conv.findByAmocrmClientConversationId(
      conn.id,
      clientConvId,
    );
    if (!mapping) {
      await this.prisma.integrationError.create({
        data: {
          channelConnectionId: conn.id,
          installationId: conn.installationId,
          scope: 'outbound_amocrm',
          code: 'MAPPING_MISSING',
          message: `No conversation for client_id=${clientConvId}`,
        },
      });
      return { accepted: false, error: 'no_mapping' as const };
    }

    const sourceMessageId = inner.message.id;

    try {
      await this.prisma.messageMapping.create({
        data: {
          channelConnectionId: conn.id,
          conversationMappingId: mapping.id,
          direction: 'outbound',
          sourceSystem: 'amocrm',
          sourceMessageId,
          amoMsgid: inner.message.id,
          payload: body as unknown as Prisma.InputJsonValue,
          deliveryStatus: 'processing',
        },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        return { accepted: true, duplicate: true as const };
      }
      throw e;
    }

    const text = inner.message.text ?? '';
    const sender =
      this.appConfig.ednaPulseSenderDefault ?? conn.maxBotId;
    try {
      const ednaResp = await this.retries.withRetries('edna-outbound', () =>
        this.edna.sendText(sender, mapping.maxUserId, text),
      );
      await this.prisma.messageMapping.updateMany({
        where: {
          channelConnectionId: conn.id,
          sourceSystem: 'amocrm',
          sourceMessageId,
        },
        data: {
          targetMessageId: ednaResp.outMessageId,
          deliveryStatus: 'sent',
        },
      });
      await this.prisma.conversationMapping.update({
        where: { id: mapping.id },
        data: { lastMessageAt: new Date() },
      });
    } catch (e) {
      this.log.error(`edna outbound failed: ${e}`);
      await this.prisma.integrationError.create({
        data: {
          channelConnectionId: conn.id,
          installationId: conn.installationId,
          scope: 'outbound_amocrm',
          code: 'EDNA_SEND_FAILED',
          message: String(e),
          details: { sourceMessageId },
        },
      });
      await this.prisma.messageMapping.updateMany({
        where: {
          channelConnectionId: conn.id,
          sourceSystem: 'amocrm',
          sourceMessageId,
        },
        data: {
          deliveryStatus: 'failed',
          errorMessage: String(e),
        },
      });
      throw e;
    }

    return { accepted: true };
  }
}
