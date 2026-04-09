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
    this.log.log(
      `OAuth callback hit from_widget=${fromWidget ?? 'n/a'} referer(raw)=${referer ?? ''}`,
    );

    if (!code || !referer) {
      this.log.warn('OAuth callback rejected: missing code or referer');
      return res.status(400).send('Missing code or referer');
    }

    let subdomain: string;
    try {
      subdomain = this.oauth.parseSubdomainFromReferer(referer);
      this.log.log(`OAuth parsed subdomain=${subdomain} from referer=${referer}`);
    } catch (e) {
      this.log.error(`OAuth referer parse failed: ${e}`);
      return res.status(400).send(`Invalid referer: ${referer}`);
    }

    try {
      this.log.log(`OAuth token exchange started subdomain=${subdomain}`);
      const tokens = await this.oauth.exchangeCodeForTokens(subdomain, code);
      this.log.log('OAuth token exchange success');

      this.log.log(`OAuth fetch account started subdomain=${subdomain}`);
      const account = await this.oauth.fetchAccountWithAmojo(
        subdomain,
        tokens.access_token,
      );
      this.log.log(
        `OAuth fetch account success account_id=${account.id} subdomain_api=${account.subdomain ?? 'n/a'}`,
      );

      const expiresAt = new Date(
        Date.now() + Math.max(60, tokens.expires_in - 120) * 1000,
      );

      this.log.log(
        `Installation upsert started amocrm_account_id=${String(account.id)}`,
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
          amocrmSubdomain: subdomain,
          referer,
          oauthAccessToken: tokens.access_token,
          oauthRefreshToken: tokens.refresh_token,
          oauthExpiresAt: expiresAt,
          status: 'active',
        },
      });
      this.log.log(
        `Installation upsert success account_id=${account.id} subdomain=${subdomain}`,
      );
    } catch (e) {
      this.log.error(`OAuth callback failed after parse: ${e}`);
      return res.status(500).send('OAuth processing failed');
    }

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>OK</title></head><body><p>Интеграция подключена. Можно закрыть окно и вернуться в amoCRM.</p></body></html>`;
    return res.status(200).type('html').send(html);
  }
}
