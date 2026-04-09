import axios, { AxiosInstance } from 'axios';
import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../../config/app-config.service';
import {
  extractSubdomainFromHostname,
  normalizeRefererToHostname,
} from './amocrm-oauth-referer';

export interface AmocrmTokenResponse {
  token_type: string;
  expires_in: number;
  access_token: string;
  refresh_token: string;
}

export interface AmocrmAccountApi {
  id: number;
  name?: string;
  subdomain?: string;
  /** Chat account UUID — required for channel connect; from `with=amojo_id`. */
  amojo_id?: string;
}

/**
 * OAuth for amoCRM public integrations / widget install.
 * https://www.amocrm.ru/developers/content/oauth/auth-public-integrations
 */
@Injectable()
export class AmocrmOauthService {
  private readonly log = new Logger(AmocrmOauthService.name);

  constructor(private readonly appConfig: AppConfigService) {}

  parseSubdomainFromReferer(referer: string): string {
    const hostname = normalizeRefererToHostname(referer);
    return extractSubdomainFromHostname(hostname);
  }

  private apiBase(subdomain: string): string {
    return `https://${subdomain}.amocrm.ru`;
  }

  async exchangeCodeForTokens(
    subdomain: string,
    code: string,
  ): Promise<AmocrmTokenResponse> {
    const url = `${this.apiBase(subdomain)}/oauth2/access_token`;
    const body = {
      client_id: this.appConfig.amocrmClientId,
      client_secret: this.appConfig.amocrmClientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.appConfig.amocrmRedirectUri,
    };
    const { data } = await axios.post<AmocrmTokenResponse>(url, body, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30_000,
    });
    return data;
  }

  async refreshTokens(
    subdomain: string,
    refreshToken: string,
  ): Promise<AmocrmTokenResponse> {
    const url = `${this.apiBase(subdomain)}/oauth2/access_token`;
    const body = {
      client_id: this.appConfig.amocrmClientId,
      client_secret: this.appConfig.amocrmClientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      redirect_uri: this.appConfig.amocrmRedirectUri,
    };
    const { data } = await axios.post<AmocrmTokenResponse>(url, body, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30_000,
    });
    return data;
  }

  createApiClient(subdomain: string, accessToken: string): AxiosInstance {
    return axios.create({
      baseURL: this.apiBase(subdomain),
      timeout: 30_000,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async fetchAccountWithAmojo(
    subdomain: string,
    accessToken: string,
  ): Promise<AmocrmAccountApi> {
    const client = this.createApiClient(subdomain, accessToken);
    const { data } = await client.get<{ amojo_id?: string } & AmocrmAccountApi>(
      '/api/v4/account',
      { params: { with: 'amojo_id' } },
    );
    if (!data.amojo_id) {
      this.log.warn(
        'Account response missing amojo_id — connect may fail until chats enabled',
      );
    }
    return data;
  }
}
