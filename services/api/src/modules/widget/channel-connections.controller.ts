import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { ChannelConnectionsService } from '../channels/channel-connections.service';
import { EdnaSessionService } from '../edna/edna-session.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { DisconnectChannelDto } from './dto/disconnect-channel.dto';

@Controller('api/channel-connections')
export class ChannelConnectionsController {
  constructor(
    private readonly channels: ChannelConnectionsService,
    private readonly ednaSession: EdnaSessionService,
  ) {}

  @Post()
  async create(@Body() body: CreateChannelDto) {
    const tenant = await this.ednaSession.ensurePulseTenant(
      body.installation_id,
      body.api_key,
    );
    return this.channels.create({
      installationId: body.installation_id,
      displayName: body.display_name,
      ednaTenantId: tenant.id,
      maxBotId: body.channel_id,
      pulseApiKey: body.api_key,
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
