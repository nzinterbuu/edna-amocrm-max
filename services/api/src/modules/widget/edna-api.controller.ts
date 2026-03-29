import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { EdnaSessionService } from '../edna/edna-session.service';
import { EdnaMaxBotsService } from '../edna/edna-max-bots.service';
import { EdnaBindDto } from './dto/edna-bind.dto';

@Controller('api/edna')
export class EdnaApiController {
  constructor(
    private readonly session: EdnaSessionService,
    private readonly bots: EdnaMaxBotsService,
  ) {}

  @Post('session/bind')
  async bind(@Body() body: EdnaBindDto) {
    return this.session.bind(body.installation_id, body.edna_auth_code);
  }

  @Get('max-bots')
  async maxBots(@Query('installation_id') installationId: string) {
    const items = await this.bots.listForInstallation(installationId);
    return { items };
  }
}
