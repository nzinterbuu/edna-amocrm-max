import {
  Body,
  Controller,
  Headers,
  Param,
  Post,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { AmocrmWebhookValidator } from '../amocrm/amocrm-webhook.validator';
import { isAmocrmOutgoingMessageHook } from '../messages/amocrm-outgoing-webhook.guard';
import { OutboundAmocrmService } from '../messages/outbound-amocrm.service';
import { WebhookLogService } from './webhook-log.service';

@Controller('api/webhooks/amocrm')
export class AmocrmWebhookController {
  constructor(
    private readonly validator: AmocrmWebhookValidator,
    private readonly outbound: OutboundAmocrmService,
    private readonly log: WebhookLogService,
  ) {}

  @Post(':scopeId')
  async receive(
    @Param('scopeId') scopeId: string,
    @Body() body: Record<string, unknown>,
    @Headers('x-signature') sig: string | undefined,
    @Req() req: Request,
  ) {
    const raw = req.rawBody;
    if (!raw?.length) {
      throw new BadRequestException('raw body required for signature check');
    }
    this.validator.assertValid(raw, sig);

    const msg = body?.message as Record<string, unknown> | undefined;
    const inner = msg?.message as Record<string, unknown> | undefined;
    if (!inner) {
      await this.log.log({
        source: 'amocrm_hook',
        requestBody: body,
        responseStatus: 200,
        responseBody: { accepted: true, skipped_non_message: true },
        processingStatus: 'ignored',
      });
      return { accepted: true, skipped: true };
    }

    try {
      if (!isAmocrmOutgoingMessageHook(body)) {
        throw new BadRequestException(
          'Invalid amoCRM outgoing message webhook payload shape',
        );
      }
      const result = await this.outbound.handleWebhook(scopeId, body);
      await this.log.log({
        source: 'amocrm_outbound',
        requestBody: body,
        responseStatus: 200,
        responseBody: result,
        processingStatus: 'accepted',
      });
      return result;
    } catch (e) {
      await this.log.log({
        source: 'amocrm_outbound',
        requestBody: body,
        responseStatus: 500,
        responseBody: { error: String(e) },
        processingStatus: 'error',
      });
      throw e;
    }
  }
}
