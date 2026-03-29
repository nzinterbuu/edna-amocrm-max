import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';

export interface MaxBotItem {
  bot_id: string;
  name: string;
  status: string;
}

/**
 * Lists MAX bots for an installation tenant.
 * TODO: replace stub with real edna Pulse API when manifest/docs for listing bots are available.
 */
@Injectable()
export class EdnaMaxBotsService {
  private readonly log = new Logger(EdnaMaxBotsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async listForInstallation(installationId: string): Promise<MaxBotItem[]> {
    const tenants = await this.prisma.ednaTenant.findMany({
      where: { installationId },
    });
    if (tenants.length === 0) {
      return [];
    }
    const connections = await this.prisma.channelConnection.findMany({
      where: {
        installationId,
        status: 'active',
      },
    });
    const items: MaxBotItem[] = connections.map((c) => ({
      bot_id: c.maxBotId,
      name: c.displayName,
      status: 'active',
    }));
    if (items.length === 0) {
      this.log.warn(
        'edna/max-bots: no connected bots; returning placeholder — TODO call Pulse list API',
      );
    }
    return items;
  }
}
