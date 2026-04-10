import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';
import { AmocrmChatClient } from '../amocrm/amocrm-chat.client';
import { InstallationTokensService } from '../installations/installation-tokens.service';
import { AppConfigService } from '../../config/app-config.service';

@Injectable()
export class ChannelConnectionsService {
  private readonly log = new Logger(ChannelConnectionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly chat: AmocrmChatClient,
    private readonly tokens: InstallationTokensService,
    private readonly appConfig: AppConfigService,
  ) {}

  async create(params: {
    installationId: string;
    displayName: string;
    ednaTenantId: string;
    maxBotId: string;
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

    const existing = await this.prisma.channelConnection.findFirst({
      where: {
        installationId: inst.id,
        maxBotId: params.maxBotId,
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

    const connected = await this.chat.connectChannel(
      amojoId,
      params.displayName,
    );

    if (existing) {
      const row = await this.prisma.channelConnection.update({
        where: { id: existing.id },
        data: {
          ednaTenantId: tenant.id,
          displayName: params.displayName,
          channelId: this.appConfig.amocrmChannelId,
          scopeId: connected.scope_id,
          status: 'active',
          disconnectedAt: null,
        },
      });
      return {
        id: row.id,
        status: row.status,
        scope_id: row.scopeId,
      };
    }

    const row = await this.prisma.channelConnection.create({
      data: {
        installationId: inst.id,
        ednaTenantId: tenant.id,
        displayName: params.displayName,
        maxBotId: params.maxBotId,
        channelId: this.appConfig.amocrmChannelId,
        scopeId: connected.scope_id,
        status: 'active',
      },
    });

    return {
      id: row.id,
      status: row.status,
      scope_id: row.scopeId,
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
