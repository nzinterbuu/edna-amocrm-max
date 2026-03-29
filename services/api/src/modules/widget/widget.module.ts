import { Module } from '@nestjs/common';
import { ChannelsModule } from '../channels/channels.module';
import { EdnaModule } from '../edna/edna.module';
import { WidgetBootstrapController } from './widget-bootstrap.controller';
import { EdnaApiController } from './edna-api.controller';
import { ChannelConnectionsController } from './channel-connections.controller';

@Module({
  imports: [ChannelsModule, EdnaModule],
  controllers: [
    WidgetBootstrapController,
    EdnaApiController,
    ChannelConnectionsController,
  ],
})
export class WidgetModule {}
