import { Module } from '@nestjs/common';
import { ChannelConnectionsService } from './channel-connections.service';

@Module({
  providers: [ChannelConnectionsService],
  exports: [ChannelConnectionsService],
})
export class ChannelsModule {}
