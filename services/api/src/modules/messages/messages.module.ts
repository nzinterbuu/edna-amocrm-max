import { Module } from '@nestjs/common';
import { EdnaModule } from '../edna/edna.module';
import { InboundMaxService } from './inbound-max.service';
import { OutboundAmocrmService } from './outbound-amocrm.service';
import { DeliveryStatusService } from './delivery-status.service';

@Module({
  imports: [EdnaModule],
  providers: [InboundMaxService, OutboundAmocrmService, DeliveryStatusService],
  exports: [InboundMaxService, OutboundAmocrmService, DeliveryStatusService],
})
export class MessagesModule {}
