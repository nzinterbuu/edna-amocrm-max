import {
  Body,
  Controller,
  Headers,
  Param,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { AppConfigService } from '../../config/app-config.service';
import { InboundMaxService } from '../messages/inbound-max.service';
import { WebhookLogService } from './webhook-log.service';

@Controller('api/webhooks/max')
export class MaxWebhookController {
  constructor(
    private readonly inbound: InboundMaxService,
    private readonly log: WebhookLogService,
    private readonly config: AppConfigService,
  ) {}

  @Post(':connectionId')
  async receive(
    @Param('connectionId') connectionId: string,
    @Body() body: unknown,
    @Headers('authorization') auth?: string,
  ) {
    const secret = this.config.maxWebhookSecret;
    if (secret) {
      const ok =
        auth === `Bearer ${secret}` || auth === secret;
      if (!ok) {
        throw new UnauthorizedException('MAX webhook auth failed');
      }
    }

    try {
      const result = await this.inbound.handleWebhook(connectionId, body);
      await this.log.log({
        channelConnectionId: connectionId,
        source: 'max_inbound',
        requestBody: body,
        responseStatus: 200,
        responseBody: result,
        processingStatus: 'accepted',
      });
      return result;
    } catch (e) {
      await this.log.log({
        channelConnectionId: connectionId,
        source: 'max_inbound',
        requestBody: body,
        responseStatus: 500,
        responseBody: { error: String(e) },
        processingStatus: 'error',
      });
      throw e;
    }
  }
}
