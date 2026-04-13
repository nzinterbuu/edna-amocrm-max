import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';
import { AmocrmChatClient } from '../amocrm/amocrm-chat.client';
import { InstallationTokensService } from '../installations/installation-tokens.service';
import { AppConfigService } from '../../config/app-config.service';
import { EdnaPulseClient } from '../edna/edna-pulse.client';
import { IntegrationException } from '../../common/errors/integration.exception';

@Injectable()
export class ChannelConnectionsService {
  private readonly log = new Logger(ChannelConnectionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly chat: AmocrmChatClient,
    private readonly tokens: InstallationTokensService,
    private readonly appConfig: AppConfigService,
    private readonly ednaPulse: EdnaPulseClient,
  ) {}

  async create(params: {
    installationId: string;
    displayName: string;
    ednaTenantId: string;
    maxBotId: string;
    pulseApiKey: string;
  }) {
    const inst = await this.prisma.installation.findFirstOrThrow({
      where: { id: params.installationId, status: 'active' },
    });
    const tenant = await this.prisma.ednaTenant.findFirstOrThrow({
      where: {
        id: params.ednaTenantId,
        installationId: params.installationId,
      },
    });

    const maxBotId = params.maxBotId.trim();
    const { subjectId } = await this.ednaPulse.resolveActiveMaxBotSubjectId(
      params.pulseApiKey,
      maxBotId,
    );

    const existing = await this.prisma.channelConnection.findFirst({
      where: {
        installationId: inst.id,
        maxBotId,
      },
    });

    if (existing?.status === 'active') {
      throw new ConflictException({
        message: 'Channel already connected',
        id: existing.id,
        status: existing.status,
        scope_id: existing.scopeId,
      });
    }

    const amojoId = await this.tokens.getAmojoAccountId(inst.id);
    if (!amojoId) {
      throw new Error(
        'Account has no amojo_id — enable Chats / obtain amojo_id per https://www.amocrm.ru/developers/content/chats/chat-start',
      );
    }

    const baseUrl = this.appConfig.appBaseUrl.replace(/\/$/, '');
    let connectionId: string;
    let createdNewPending = false;

    if (existing?.status === 'pending') {
      connectionId = existing.id;
      await this.prisma.channelConnection.update({
        where: { id: existing.id },
        data: {
          ednaTenantId: tenant.id,
          displayName: params.displayName,
          ednaSubjectId: subjectId,
          channelId: this.appConfig.amocrmChannelId,
          disconnectedAt: null,
        },
      });
    } else if (existing?.status === 'disconnected') {
      connectionId = existing.id;
      await this.prisma.channelConnection.update({
        where: { id: existing.id },
        data: {
          ednaTenantId: tenant.id,
          displayName: params.displayName,
          ednaSubjectId: subjectId,
          channelId: this.appConfig.amocrmChannelId,
          status: 'pending',
          scopeId: null,
          disconnectedAt: null,
        },
      });
    } else {
      const row = await this.prisma.channelConnection.create({
        data: {
          installationId: inst.id,
          ednaTenantId: tenant.id,
          displayName: params.displayName,
          maxBotId,
          channelId: this.appConfig.amocrmChannelId,
          scopeId: null,
          ednaSubjectId: subjectId,
          status: 'pending',
        },
      });
      connectionId = row.id;
      createdNewPending = true;
    }

    const callbackUrl = `${baseUrl}/api/webhooks/max/${connectionId}`;

    try {
      await this.ednaPulse.setCallback(
        params.pulseApiKey,
        subjectId,
        callbackUrl,
      );
    } catch (e) {
      if (createdNewPending) {
        await this.prisma.channelConnection
          .delete({ where: { id: connectionId } })
          .catch(() => undefined);
      }
      throw e;
    }

    let connected: { scope_id: string };
    try {
      connected = await this.chat.connectChannel(amojoId, params.displayName);
    } catch (e) {
      this.log.error(
        `connect flow: amoCRM connectChannel failed installationId=${inst.id} connectionId=${connectionId} subjectId=${subjectId}: ${e}`,
      );
      throw new IntegrationException(
        'AMO_CONNECT_FAILED',
        'Не удалось завершить подключение канала в amoCRM. Callback в edna Pulse уже настроен — повторите попытку или обратитесь в поддержку.',
        502,
      );
    }

    const row = await this.prisma.channelConnection.update({
      where: { id: connectionId },
      data: {
        ednaTenantId: tenant.id,
        displayName: params.displayName,
        channelId: this.appConfig.amocrmChannelId,
        scopeId: connected.scope_id,
        status: 'active',
        disconnectedAt: null,
        ednaSubjectId: subjectId,
      },
    });

    this.log.log(
      `connect flow done: installationId=${inst.id} connectionId=${row.id} subjectId=${subjectId} status=${row.status}`,
    );

    return {
      id: row.id,
      status: row.status,
      scope_id: row.scopeId,
      edna_subject_id: row.ednaSubjectId,
    };
  }

  async disconnect(connectionId: string, _reason?: string) {
    const conn = await this.prisma.channelConnection.findFirstOrThrow({
      where: { id: connectionId },
      include: { installation: true },
    });
    const amojoId = await this.tokens.getAmojoAccountId(conn.installationId);
    if (amojoId) {
      try {
        await this.chat.disconnectChannel(amojoId);
      } catch (e) {
        this.log.warn(`amo disconnect call failed (continuing): ${e}`);
      }
    }
    const row = await this.prisma.channelConnection.update({
      where: { id: connectionId },
      data: {
        status: 'disconnected',
        disconnectedAt: new Date(),
      },
    });
    return {
      id: row.id,
      status: row.status,
    };
  }

  async health(connectionId: string) {
    const conn = await this.prisma.channelConnection.findFirst({
      where: { id: connectionId },
    });
    if (!conn) {
      return null;
    }
    const [lastIn, lastOut, lastErr] = await Promise.all([
      this.prisma.messageMapping.findFirst({
        where: { channelConnectionId: connectionId, direction: 'inbound' },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.messageMapping.findFirst({
        where: { channelConnectionId: connectionId, direction: 'outbound' },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.integrationError.findFirst({
        where: { channelConnectionId: connectionId, resolved: false },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    return {
      connection_id: conn.id,
      status: conn.status,
      last_inbound_at: lastIn?.createdAt?.toISOString() ?? null,
      last_outbound_at: lastOut?.createdAt?.toISOString() ?? null,
      last_error: lastErr
        ? { code: lastErr.code, message: lastErr.message }
        : null,
    };
  }
}
