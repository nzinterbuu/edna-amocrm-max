import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { validateEnv } from './config/env.validation';
import { DbModule } from './db/db.module';
import { MappingsModule } from './modules/mappings/mappings.module';
import { InstallationsModule } from './modules/installations/installations.module';
import { QueueModule } from './queue/queue.module';
import { AmocrmModule } from './modules/amocrm/amocrm.module';
import { EdnaModule } from './modules/edna/edna.module';
import { ChannelsModule } from './modules/channels/channels.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { MessagesModule } from './modules/messages/messages.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { WidgetModule } from './modules/widget/widget.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',
        autoLogging: true,
      },
    }),
    DbModule,
    MappingsModule,
    InstallationsModule,
    QueueModule,
    AmocrmModule,
    EdnaModule,
    ChannelsModule,
    MessagesModule,
    WebhooksModule,
    IntegrationsModule,
    WidgetModule,
  ],
})
export class AppModule {}
