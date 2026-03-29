import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { ChannelConnectionsService } from '../channels/channel-connections.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { DisconnectChannelDto } from './dto/disconnect-channel.dto';

@Controller('api/channel-connections')
export class ChannelConnectionsController {
  constructor(private readonly channels: ChannelConnectionsService) {}

  @Post()
  async create(@Body() body: CreateChannelDto) {
    return this.channels.create({
      installationId: body.installation_id,
      displayName: body.display_name,
      ednaTenantId: body.edna_tenant_id,
      maxBotId: body.max_bot_id,
    });
  }

  @Post(':id/disconnect')
  async disconnect(
    @Param('id') id: string,
    @Body() body: DisconnectChannelDto,
  ) {
    return this.channels.disconnect(id, body.reason);
  }

  @Get(':id/health')
  async health(@Param('id') id: string) {
    const h = await this.channels.health(id);
    if (!h) {
      throw new NotFoundException();
    }
    return h;
  }
}
