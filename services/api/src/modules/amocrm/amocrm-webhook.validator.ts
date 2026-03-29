import { createHmac } from 'crypto';
import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../config/app-config.service';
import { SignatureInvalidException } from '../../common/errors/integration.exception';

@Injectable()
export class AmocrmWebhookValidator {
  constructor(private readonly appConfig: AppConfigService) {}

  /**
   * Validates amoCRM Chat API webhook X-Signature (HMAC-SHA1 of raw body, channel_secret).
   * TODO: verify against official chat-webhooks docs if encoding differs.
   */
  assertValid(rawBody: Buffer, headerSignature: string | undefined): void {
    if (!headerSignature) {
      throw new SignatureInvalidException('Missing X-Signature header');
    }
    const expected = createHmac('sha1', this.appConfig.amocrmChannelSecret)
      .update(rawBody)
      .digest('hex')
      .toLowerCase();
    const got = headerSignature.trim().toLowerCase();
    if (expected !== got) {
      throw new SignatureInvalidException();
    }
  }
}
