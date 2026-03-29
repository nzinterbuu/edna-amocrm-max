import { Global, Module } from '@nestjs/common';
import { ConversationMappingService } from './conversation-mapping.service';
import { MessageMappingService } from './message-mapping.service';

@Global()
@Module({
  providers: [ConversationMappingService, MessageMappingService],
  exports: [ConversationMappingService, MessageMappingService],
})
export class MappingsModule {}
