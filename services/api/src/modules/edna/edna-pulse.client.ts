import axios, { AxiosError } from 'axios';
import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../../config/app-config.service';
import {
  IntegrationException,
  SenderInactiveError,
  SenderNotFoundError,
  SenderNotMaxBotError,
} from '../../common/errors/integration.exception';

export interface EdnaChannelProfileItem {
  sender?: string;
  type?: string;
  active?: boolean;
  subjectId?: number | string;
  subject_id?: number | string;
}

function channelProfileListFromPayload(raw: unknown): EdnaChannelProfileItem[] {
  if (Array.isArray(raw)) {
    return raw as EdnaChannelProfileItem[];
  }
  if (raw && typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    for (const k of ['data', 'body', 'channels', 'list', 'items', 'result']) {
      const v = o[k];
      if (Array.isArray(v)) {
        return v as EdnaChannelProfileItem[];
      }
    }
  }
  return [];
}

function readSender(ch: EdnaChannelProfileItem): string | undefined {
  const s = ch.sender;
  return s != null && String(s).trim() !== '' ? String(s).trim() : undefined;
}

function readSubjectId(ch: EdnaChannelProfileItem): string | undefined {
  const v = ch.subjectId ?? ch.subject_id;
  if (v == null) {
    return undefined;
  }
  return String(v);
}

@Injectable()
export class EdnaPulseClient {
  private readonly log = new Logger(EdnaPulseClient.name);

  constructor(private readonly config: AppConfigService) {}

  private channelProfileUrl(): string {
    const base = this.config.ednaApiBaseUrl.replace(/\/$/, '');
    return `${base}/api/channel-profile`;
  }

  private callbackSetUrl(): string {
    const base = this.config.ednaApiBaseUrl.replace(/\/$/, '');
    return `${base}/api/callback/set`;
  }

  /**
   * GET https://app.edna.ru/api/channel-profile
   * @see https://docs-pulse.edna.ru/docs/api/channels/channel-list
   */
  async getChannelProfiles(apiKey: string): Promise<EdnaChannelProfileItem[]> {
    const key = apiKey?.trim();
    if (!key) {
      throw new IntegrationException('EDNA_API_KEY', 'api_key required');
    }
    try {
      const { data } = await axios.get<unknown>(this.channelProfileUrl(), {
        headers: {
          'X-API-KEY': key,
          Accept: 'application/json',
        },
        timeout: 30_000,
      });
      return channelProfileListFromPayload(data);
    } catch (e) {
      this.log.warn(
        `edna channel-profile request failed: ${this.formatAxiosError(e)}`,
      );
      const ax = axios.isAxiosError(e) ? (e as AxiosError) : null;
      const st = ax?.response?.status;
      throw new IntegrationException(
        'EDNA_CHANNEL_PROFILE_FAILED',
        'Не удалось получить список каналов edna Pulse',
        st && st >= 400 && st < 500 ? st : HttpStatus.BAD_GATEWAY,
      );
    }
  }

  /**
   * Validates sender name against Pulse channel list; returns subjectId string.
   */
  async resolveActiveMaxBotSubjectId(
    apiKey: string,
    senderName: string,
  ): Promise<{ subjectId: string }> {
    const want = senderName?.trim();
    if (!want) {
      throw new IntegrationException(
        'SENDER_EMPTY',
        'Название подписи обязательно',
      );
    }

    const channels = await this.getChannelProfiles(apiKey);
    this.log.log(
      `edna sender check: sender="${want}" channels_count=${channels.length}`,
    );

    const match = channels.find((ch) => readSender(ch) === want);
    if (!match) {
      this.log.warn(
        `edna sender check: sender="${want}" found=false (no matching sender)`,
      );
      throw new SenderNotFoundError();
    }

    const type = match.type != null ? String(match.type) : '';
    const subjectId = readSubjectId(match);

    this.log.log(
      `edna sender check: sender="${want}" found=true type=${type} active=${String(match.active)} subjectId=${subjectId ?? 'n/a'}`,
    );

    if (type !== 'MAX_BOT') {
      throw new SenderNotMaxBotError();
    }
    if (match.active !== true) {
      throw new SenderInactiveError();
    }
    if (!subjectId) {
      this.log.warn(
        `edna sender check: sender="${want}" missing subjectId in profile`,
      );
      throw new IntegrationException(
        'EDNA_SUBJECT_ID_MISSING',
        'В ответе edna Pulse нет subjectId для этой подписи',
        HttpStatus.BAD_GATEWAY,
      );
    }

    return { subjectId };
  }

  /**
   * POST https://app.edna.ru/api/callback/set
   * @see https://docs-pulse.edna.ru/docs/api/callback/callback-set
   */
  async setCallback(
    apiKey: string,
    subjectId: string | number,
    callbackUrl: string,
  ): Promise<void> {
    const key = apiKey?.trim();
    if (!key) {
      throw new IntegrationException('EDNA_API_KEY', 'api_key required');
    }
    const url = String(callbackUrl || '').trim();
    if (!url) {
      throw new IntegrationException(
        'CALLBACK_URL_EMPTY',
        'callback URL required',
      );
    }

    const sid =
      typeof subjectId === 'number'
        ? subjectId
        : /^\d+$/.test(subjectId)
          ? parseInt(subjectId, 10)
          : subjectId;

    const body = {
      subjectId: sid,
      statusCallbackUrl: url,
      inMessageCallbackUrl: url,
    };

    try {
      const { status } = await axios.post<unknown>(
        this.callbackSetUrl(),
        body,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': key,
          },
          timeout: 30_000,
        },
      );
      this.log.log(
        `edna callback/set: subjectId=${sid} callbackUrl=${url} response_status=${status}`,
      );
    } catch (e) {
      const ax = axios.isAxiosError(e) ? (e as AxiosError<unknown>) : null;
      const st = ax?.response?.status;
      const responseData = ax?.response?.data;
      this.log.warn(
        `edna callback/set failed: subjectId=${sid} callbackUrl=${url} response_status=${st ?? 'n/a'} response_data=${this.safeJson(responseData)}`,
      );

      const msgFromBody = this.tryExtractMessage(responseData);
      throw new IntegrationException(
        'EDNA_CALLBACK_SETUP_FAILED',
        msgFromBody ??
          'Не удалось настроить callback в edna Pulse. Проверьте API-ключ и права.',
        st && st >= 400 && st < 600 ? st : HttpStatus.BAD_GATEWAY,
        responseData && typeof responseData === 'object'
          ? (responseData as Record<string, unknown>)
          : { raw: responseData },
      );
    }
  }

  private tryExtractMessage(data: unknown): string | undefined {
    if (data && typeof data === 'object') {
      const o = data as Record<string, unknown>;
      const m = o.message ?? o.error ?? o.errorMessage;
      if (typeof m === 'string' && m.trim()) {
        return m.trim();
      }
    }
    return undefined;
  }

  private safeJson(data: unknown): string {
    try {
      return JSON.stringify(data);
    } catch {
      return String(data);
    }
  }

  private formatAxiosError(e: unknown): string {
    if (!axios.isAxiosError(e)) return String(e);
    const ax = e as AxiosError;
    return `${ax.message} ${JSON.stringify(ax.response?.data)}`;
  }
}
