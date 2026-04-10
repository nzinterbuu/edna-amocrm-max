import { createHmac } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../../config/app-config.service';
import { SignatureInvalidException } from '../../common/errors/integration.exception';

export interface AmocrmWebhookVerifyContext {
  scopeId: string;
}

@Injectable()
export class AmocrmWebhookValidator {
  private readonly logger = new Logger(AmocrmWebhookValidator.name);

  constructor(private readonly appConfig: AppConfigService) {}

  /**
   * amoCRM Chat API: X-Signature = HMAC-SHA1(body, channel secret), hex.
   * Official PHP sample hashes trim(file_get_contents('php://input')), so we accept either
   * the raw body buffer or the UTF-8 trimmed string (leading/trailing whitespace only).
   * Secret: channel secret from the integration (AMOCRM_CHANNEL_SECRET), not OAuth client secret.
   *
   * @see https://www.amocrm.ru/developers/content/chats/chat-webhooks
   */
  assertValid(
    rawBody: Buffer,
    headerSignature: string | undefined,
    context: AmocrmWebhookVerifyContext,
  ): void {
    const { scopeId } = context;

    if (!headerSignature?.trim()) {
      this.logger.warn(
        `amoCRM webhook: missing X-Signature header (scopeId=${scopeId}, rawBodyLength=${rawBody.length})`,
      );
      throw new SignatureInvalidException('Missing X-Signature header');
    }

    const secret = this.appConfig.amocrmChannelSecret;

    const received = headerSignature.trim().toLowerCase();

    const computedRaw = createHmac('sha1', secret)
      .update(rawBody)
      .digest('hex')
      .toLowerCase();

    const bodyTrimmed = rawBody.toString('utf8').trim();
    const computedTrimmed = createHmac('sha1', secret)
      .update(bodyTrimmed, 'utf8')
      .digest('hex')
      .toLowerCase();

    const ok = received === computedRaw || received === computedTrimmed;
    if (!ok) {
      this.logger.warn(
        `amoCRM webhook signature mismatch: scopeId=${scopeId}, rawBodyLength=${rawBody.length}, bodyStringLength=${bodyTrimmed.length}, received=${received}, computedRaw=${computedRaw}, computedTrimmed=${computedTrimmed}`,
      );
      throw new SignatureInvalidException('Invalid X-Signature');
    }
  }
}
