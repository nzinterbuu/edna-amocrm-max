import axios from 'axios';
import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../../config/app-config.service';
import { RetryQueueService } from '../../queue/retry-queue.service';

/** Per MAX Bot send message — LLM Manifest */
export interface EdnaMaxOutboundBody {
  sender: string;
  maxId: string;
  content: {
    type: 'TEXT';
    text: string;
  };
}

export interface EdnaMaxOutboundOk {
  outMessageId: string;
  maxId: string;
}

@Injectable()
export class EdnaMaxOutboundClient {
  private readonly log = new Logger(EdnaMaxOutboundClient.name);

  constructor(
    private readonly config: AppConfigService,
    private readonly retries: RetryQueueService,
  ) {}

  private url(): string {
    const base = this.config.ednaApiBaseUrl.replace(/\/$/, '');
    return `${base}/api/v1/out-messages/max-bot`;
  }

  async sendText(
    sender: string,
    maxId: string,
    text: string,
  ): Promise<EdnaMaxOutboundOk> {
    const body: EdnaMaxOutboundBody = {
      sender,
      maxId,
      content: { type: 'TEXT', text },
    };
    return this.retries.withRetries('edna-max-outbound', async () => {
      const { data } = await axios.post<EdnaMaxOutboundOk>(this.url(), body, {
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': this.config.ednaApiKey,
        },
        timeout: 30_000,
      });
      return data;
    });
  }
}
