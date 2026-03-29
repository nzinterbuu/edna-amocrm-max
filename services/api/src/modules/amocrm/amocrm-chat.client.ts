import axios, { AxiosError } from 'axios';
import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../../config/app-config.service';
import { ChatSignatureService } from './chat-signature.service';

const JSON_TYPE = 'application/json';

export interface AmoNewMessageResponse {
  new_message: {
    conversation_id: string;
    sender_id: string;
    receiver_id: string | null;
    msgid: string;
    ref_id: string;
  };
}

export interface AmoConnectResponse {
  account_id: string;
  scope_id: string;
  hook_api_version?: string;
  title?: string;
  is_time_window_disabled?: boolean;
}

/**
 * amoCRM Chats transport on amojo host — signed requests only.
 * https://www.amocrm.ru/developers/content/chats/chat-api-reference
 */
@Injectable()
export class AmocrmChatClient {
  private readonly log = new Logger(AmocrmChatClient.name);

  constructor(
    private readonly appConfig: AppConfigService,
    private readonly signer: ChatSignatureService,
  ) {}

  private signedHeaders(
    method: string,
    path: string,
    body: string,
  ): Record<string, string> {
    const date = this.signer.formatRfc2822Date();
    const { contentMd5, signature } = this.signer.sign(
      method,
      body,
      JSON_TYPE,
      date,
      path,
      this.appConfig.amocrmChannelSecret,
    );
    return {
      'Content-Type': JSON_TYPE,
      Date: date,
      'Content-MD5': contentMd5,
      'X-Signature': signature,
    };
  }

  async connectChannel(accountId: string, title?: string): Promise<AmoConnectResponse> {
    const channelId = this.appConfig.amocrmChannelId;
    const path = `/v2/origin/custom/${channelId}/connect`;
    const bodyObj = {
      account_id: accountId,
      hook_api_version: 'v2',
      ...(title ? { title } : {}),
    };
    const body = JSON.stringify(bodyObj);
    const url = `${this.appConfig.amocrmChatBaseUrl}${path}`;
    try {
      const { data } = await axios.post<AmoConnectResponse>(url, bodyObj, {
        headers: this.signedHeaders('POST', path, body),
        timeout: 30_000,
      });
      return data;
    } catch (e) {
      this.log.error(
        `connectChannel failed: ${this.formatAxiosError(e)}`,
      );
      throw e;
    }
  }

  async disconnectChannel(accountId: string): Promise<void> {
    const channelId = this.appConfig.amocrmChannelId;
    const path = `/v2/origin/custom/${channelId}/disconnect`;
    const bodyObj = { account_id: accountId };
    const body = JSON.stringify(bodyObj);
    const url = `${this.appConfig.amocrmChatBaseUrl}${path}`;
    await axios.delete(url, {
      data: bodyObj,
      headers: this.signedHeaders('DELETE', path, body),
      timeout: 30_000,
    });
  }

  async sendNewMessage(
    scopeId: string,
    payload: Record<string, unknown>,
  ): Promise<AmoNewMessageResponse> {
    const path = `/v2/origin/custom/${scopeId}`;
    const bodyObj = {
      event_type: 'new_message',
      payload,
    };
    const body = JSON.stringify(bodyObj);
    const url = `${this.appConfig.amocrmChatBaseUrl}${path}`;
    const { data } = await axios.post<AmoNewMessageResponse>(url, bodyObj, {
      headers: this.signedHeaders('POST', path, body),
      timeout: 30_000,
    });
    return data;
  }

  /**
   * POST /v2/origin/custom/{scope_id}/{msgid}/delivery_status
   * TODO: verify exact body fields / status enum in official docs before production use.
   */
  async sendDeliveryStatus(
    scopeId: string,
    amoMsgid: string,
    bodyObj: Record<string, unknown>,
  ): Promise<void> {
    const path = `/v2/origin/custom/${scopeId}/${amoMsgid}/delivery_status`;
    const body = JSON.stringify(bodyObj);
    const url = `${this.appConfig.amocrmChatBaseUrl}${path}`;
    await axios.post(url, bodyObj, {
      headers: this.signedHeaders('POST', path, body),
      timeout: 30_000,
    });
  }

  private formatAxiosError(e: unknown): string {
    if (!axios.isAxiosError(e)) return String(e);
    const ax = e as AxiosError;
    return `${ax.message} ${JSON.stringify(ax.response?.data)}`;
  }
}
