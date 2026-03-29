import { Controller, Get, Query, Res, Logger } from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from '../../db/prisma.service';
import { AmocrmOauthService } from '../amocrm/amocrm-oauth.service';

@Controller('api/integrations/amocrm/oauth')
export class OauthCallbackController {
  private readonly log = new Logger(OauthCallbackController.name);

  constructor(
    private readonly oauth: AmocrmOauthService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('referer') referer: string,
    @Query('from_widget') fromWidget: string | undefined,
    @Res() res: Response,
  ) {
    if (!code || !referer) {
      return res.status(400).send('Missing code or referer');
    }
    const subdomain = this.oauth.parseSubdomainFromReferer(referer);
    const tokens = await this.oauth.exchangeCodeForTokens(subdomain, code);
    const account = await this.oauth.fetchAccountWithAmojo(
      subdomain,
      tokens.access_token,
    );

    const expiresAt = new Date(
      Date.now() + Math.max(60, tokens.expires_in - 120) * 1000,
    );

    await this.prisma.installation.upsert({
      where: { amocrmAccountId: String(account.id) },
      create: {
        amocrmAccountId: String(account.id),
        amocrmSubdomain: subdomain,
        referer,
        oauthAccessToken: tokens.access_token,
        oauthRefreshToken: tokens.refresh_token,
        oauthExpiresAt: expiresAt,
        status: 'active',
      },
      update: {
        referer,
        oauthAccessToken: tokens.access_token,
        oauthRefreshToken: tokens.refresh_token,
        oauthExpiresAt: expiresAt,
        status: 'active',
      },
    });

    this.log.log(
      `OAuth complete account=${account.id} from_widget=${fromWidget ?? 'n/a'}`,
    );

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>OK</title></head><body><p>Интеграция подключена. Можно закрыть окно и вернуться в amoCRM.</p></body></html>`;
    return res.status(200).type('html').send(html);
  }
}
