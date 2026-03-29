import { Controller, Get, Query } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';

@Controller('api/widget')
export class WidgetBootstrapController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('bootstrap')
  async bootstrap(
    @Query('amocrm_account_id') accountId: string,
    @Query('referer') _referer?: string,
  ) {
    const inst = await this.prisma.installation.findUnique({
      where: { amocrmAccountId: accountId },
      include: {
        channelConnections: { where: { status: 'active' } },
      },
    });
    if (!inst) {
      return {
        installation: null,
        channels: [],
      };
    }
    return {
      installation: {
        status: inst.status,
        amocrm_account_id: inst.amocrmAccountId,
        subdomain: inst.amocrmSubdomain,
        installation_id: inst.id,
      },
      channels: inst.channelConnections.map((c) => ({
        id: c.id,
        display_name: c.displayName,
        status: c.status,
        max_bot_id: c.maxBotId,
        scope_id: c.scopeId,
      })),
    };
  }
}
