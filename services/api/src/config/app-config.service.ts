import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService) {}

  get port(): number {
    return parseInt(this.config.get('PORT') ?? '3000', 10);
  }

  get databaseUrl(): string {
    return this.config.getOrThrow<string>('DATABASE_URL');
  }

  get amocrmClientId(): string {
    return this.config.getOrThrow<string>('AMOCRM_CLIENT_ID');
  }

  get amocrmClientSecret(): string {
    return this.config.getOrThrow<string>('AMOCRM_CLIENT_SECRET');
  }

  get amocrmRedirectUri(): string {
    return this.config.getOrThrow<string>('AMOCRM_REDIRECT_URI');
  }

  get amocrmChannelId(): string {
    return this.config.getOrThrow<string>('AMOCRM_CHANNEL_ID');
  }

  get amocrmChannelSecret(): string {
    return this.config.getOrThrow<string>('AMOCRM_CHANNEL_SECRET');
  }

  get amocrmChatBaseUrl(): string {
    return (
      this.config.get<string>('AMOCRM_CHAT_BASE_URL') ??
      'https://amojo.amocrm.ru'
    );
  }

  get ednaApiBaseUrl(): string {
    return (
      this.config.get<string>('EDNA_API_BASE_URL') ?? 'https://app.edna.ru'
    );
  }

  /** Env fallback when connection has no Pulse API key in DB */
  get ednaApiKey(): string | undefined {
    return this.config.get<string>('EDNA_API_KEY');
  }

  get appBaseUrl(): string {
    return this.config.getOrThrow<string>('APP_BASE_URL');
  }

  /** Default sender for edna MAX outbound; fallback to max_bot_id per connection in code */
  get ednaPulseSenderDefault(): string | undefined {
    return this.config.get<string>('EDNA_PULSE_SENDER');
  }

  get maxWebhookSecret(): string | undefined {
    return this.config.get<string>('MAX_WEBHOOK_SECRET');
  }
}
