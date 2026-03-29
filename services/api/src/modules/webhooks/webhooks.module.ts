import { Module } from '@nestjs/common';
import { MessagesModule } from '../messages/messages.module';
import { MaxWebhookController } from './max-webhook.controller';
import { AmocrmWebhookController } from './amocrm-webhook.controller';
import { WebhookLogService } from './webhook-log.service';

@Module({
  imports: [MessagesModule],
  controllers: [MaxWebhookController, AmocrmWebhookController],
  providers: [WebhookLogService],
})
export class WebhooksModule {}
