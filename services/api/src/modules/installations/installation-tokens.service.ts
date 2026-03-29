import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';
import { AmocrmOauthService } from '../amocrm/amocrm-oauth.service';

@Injectable()
export class InstallationTokensService {
  private readonly log = new Logger(InstallationTokensService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly oauth: AmocrmOauthService,
  ) {}

  async getValidAccessToken(installationId: string): Promise<{
    accessToken: string;
    subdomain: string;
  }> {
    const inst = await this.prisma.installation.findUniqueOrThrow({
      where: { id: installationId },
    });
    const now = new Date();
    const skewMs = 60_000;
    if (inst.oauthExpiresAt.getTime() > now.getTime() + skewMs) {
      return { accessToken: inst.oauthAccessToken, subdomain: inst.amocrmSubdomain };
    }
    this.log.log(`Refreshing OAuth token for installation ${installationId}`);
    const refreshed = await this.oauth.refreshTokens(
      inst.amocrmSubdomain,
      inst.oauthRefreshToken,
    );
    const expiresAt = new Date(
      Date.now() + Math.max(0, refreshed.expires_in - 120) * 1000,
    );
    await this.prisma.installation.update({
      where: { id: installationId },
      data: {
        oauthAccessToken: refreshed.access_token,
        oauthRefreshToken: refreshed.refresh_token,
        oauthExpiresAt: expiresAt,
      },
    });
    return {
      accessToken: refreshed.access_token,
      subdomain: inst.amocrmSubdomain,
    };
  }

  async getAmojoAccountId(installationId: string): Promise<string | null> {
    const { accessToken, subdomain } =
      await this.getValidAccessToken(installationId);
    const acc = await this.oauth.fetchAccountWithAmojo(subdomain, accessToken);
    return acc.amojo_id ?? null;
  }
}
