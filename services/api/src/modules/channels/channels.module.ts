import { Module } from '@nestjs/common';
import { EdnaModule } from '../edna/edna.module';
import { ChannelConnectionsService } from './channel-connections.service';

@Module({
  imports: [EdnaModule],
  providers: [ChannelConnectionsService],
  exports: [ChannelConnectionsService],
})
export class ChannelsModule {}
