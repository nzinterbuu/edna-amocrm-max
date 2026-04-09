import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from '../../db/prisma.service';

@Controller('api/widget')
export class WidgetBootstrapController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('bootstrap')
  async bootstrap(
    @Res({ passthrough: false }) res: Response,
    @Query('amocrm_account_id') accountId: string,
    @Query('referer') _referer?: string,
  ) {
    res.set({
      'Cache-Control':
        'no-store, no-cache, must-revalidate, proxy-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
      'Surrogate-Control': 'no-store',
    });
    res.removeHeader('ETag');

    if (!accountId) {
      return res.status(400).json({
        error: 'amocrm_account_id required',
        installation: null,
        channels: [],
      });
    }

    const inst = await this.prisma.installation.findUnique({
      where: { amocrmAccountId: accountId },
      include: {
        channelConnections: { where: { status: 'active' } },
      },
    });
    if (!inst) {
      return res.status(200).json({
        installation: null,
        channels: [],
      });
    }
    return res.status(200).json({
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
    });
  }
}
