import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';

@Injectable()
export class ConversationMappingService {
  constructor(private readonly prisma: PrismaService) {}

  buildExternalConversationId(
    channelConnectionId: string,
    userIdentifier: string,
  ): string {
    return `max:${channelConnectionId}:${userIdentifier}`;
  }

  async findOrCreateForInboundUser(params: {
    channelConnectionId: string;
    maxUserId: string;
  }) {
    const { channelConnectionId, maxUserId } = params;
    const amocrmConversationId = this.buildExternalConversationId(
      channelConnectionId,
      maxUserId,
    );
    const maxChatId = amocrmConversationId;
    const now = new Date();
    return this.prisma.conversationMapping.upsert({
      where: {
        channelConnectionId_maxChatId: { channelConnectionId, maxChatId },
      },
      create: {
        channelConnectionId,
        maxChatId,
        maxUserId,
        amocrmConversationId,
        firstMessageAt: now,
        lastMessageAt: now,
      },
      update: { lastMessageAt: now },
    });
  }

  async findByAmocrmClientConversationId(
    channelConnectionId: string,
    clientConversationId: string,
  ) {
    return this.prisma.conversationMapping.findFirst({
      where: {
        channelConnectionId,
        amocrmConversationId: clientConversationId,
      },
    });
  }
}
