import {
  Body,
  Controller,
  Get,
  Head,
  Headers,
  HttpCode,
  Logger,
  Param,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { AppConfigService } from '../../config/app-config.service';
import { InboundMaxService } from '../messages/inbound-max.service';
import { WebhookLogService } from './webhook-log.service';

@Controller('api/webhooks/max')
export class MaxWebhookController {
  private readonly logger = new Logger(MaxWebhookController.name);

  constructor(
    private readonly inbound: InboundMaxService,
    private readonly log: WebhookLogService,
    private readonly config: AppConfigService,
  ) {}

  /**
   * Pulse/edna pre-checks callback URL with GET or HEAD; only POST carries the webhook secret.
   */
  @Get(':connectionId')
  @HttpCode(200)
  probeGet(@Param('connectionId') connectionId: string) {
    this.logger.log(
      `MAX webhook probe method=GET connectionId=${connectionId} status=200`,
    );
    return { ok: true as const, connectionId };
  }

  @Head(':connectionId')
  @HttpCode(200)
  probeHead(@Param('connectionId') connectionId: string) {
    this.logger.log(
      `MAX webhook probe method=HEAD connectionId=${connectionId} status=200`,
    );
  }

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
        this.logger.warn(
          `MAX webhook method=POST connectionId=${connectionId} status=401`,
        );
        throw new UnauthorizedException('MAX webhook auth failed');
      }
    }

    try {
      this.logger.log(
        `MAX webhook method=POST connectionId=${connectionId} status=pending`,
      );
      const result = await this.inbound.handleWebhook(connectionId, body);
      await this.log.log({
        channelConnectionId: connectionId,
        source: 'max_inbound',
        requestBody: body,
        responseStatus: 200,
        responseBody: result,
        processingStatus: 'accepted',
      });
      this.logger.log(
        `MAX webhook method=POST connectionId=${connectionId} status=200`,
      );
      return result;
    } catch (e) {
      const status = 500;
      this.logger.warn(
        `MAX webhook method=POST connectionId=${connectionId} status=${status}`,
      );
      await this.log.log({
        channelConnectionId: connectionId,
        source: 'max_inbound',
        requestBody: body,
        responseStatus: status,
        responseBody: { error: String(e) },
        processingStatus: 'error',
      });
      throw e;
    }
  }
}
