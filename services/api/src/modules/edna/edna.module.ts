import { Module } from '@nestjs/common';
import { EdnaMaxOutboundClient } from './edna-max-outbound.client';
import { MaxIncomingWebhookParser } from './max-incoming-webhook.parser';
import { EdnaMaxBotsService } from './edna-max-bots.service';
import { EdnaSessionService } from './edna-session.service';

@Module({
  providers: [
    EdnaMaxOutboundClient,
    MaxIncomingWebhookParser,
    EdnaMaxBotsService,
    EdnaSessionService,
  ],
  exports: [
    EdnaMaxOutboundClient,
    MaxIncomingWebhookParser,
    EdnaMaxBotsService,
    EdnaSessionService,
  ],
})
export class EdnaModule {}
