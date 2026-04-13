import { Module } from '@nestjs/common';
import { EdnaMaxOutboundClient } from './edna-max-outbound.client';
import { EdnaPulseClient } from './edna-pulse.client';
import { MaxIncomingWebhookParser } from './max-incoming-webhook.parser';
import { EdnaMaxBotsService } from './edna-max-bots.service';
import { EdnaSessionService } from './edna-session.service';

@Module({
  providers: [
    EdnaMaxOutboundClient,
    EdnaPulseClient,
    MaxIncomingWebhookParser,
    EdnaMaxBotsService,
    EdnaSessionService,
  ],
  exports: [
    EdnaMaxOutboundClient,
    EdnaPulseClient,
    MaxIncomingWebhookParser,
    EdnaMaxBotsService,
    EdnaSessionService,
  ],
})
export class EdnaModule {}
