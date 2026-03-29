import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../db/prisma.service';

@Injectable()
export class MessageMappingService {
  constructor(private readonly prisma: PrismaService) {}

  async tryCreateInboundMax(params: {
    channelConnectionId: string;
    conversationMappingId: string | null;
    sourceMessageId: string;
    payload: Prisma.InputJsonValue;
  }) {
    try {
      return await this.prisma.messageMapping.create({
        data: {
          channelConnectionId: params.channelConnectionId,
          conversationMappingId: params.conversationMappingId,
          direction: 'inbound',
          sourceSystem: 'max',
          sourceMessageId: params.sourceMessageId,
          payload: params.payload,
        },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        return this.prisma.messageMapping.findFirst({
          where: {
            channelConnectionId: params.channelConnectionId,
            sourceSystem: 'max',
            sourceMessageId: params.sourceMessageId,
          },
        });
      }
      throw e;
    }
  }

  async tryCreateOutboundAmo(params: {
    channelConnectionId: string;
    conversationMappingId: string | null;
    sourceMessageId: string;
    amoMsgid?: string;
    payload: Prisma.InputJsonValue;
  }) {
    try {
      return await this.prisma.messageMapping.create({
        data: {
          channelConnectionId: params.channelConnectionId,
          conversationMappingId: params.conversationMappingId,
          direction: 'outbound',
          sourceSystem: 'amocrm',
          sourceMessageId: params.sourceMessageId,
          amoMsgid: params.amoMsgid,
          payload: params.payload,
        },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        return this.prisma.messageMapping.findFirst({
          where: {
            channelConnectionId: params.channelConnectionId,
            sourceSystem: 'amocrm',
            sourceMessageId: params.sourceMessageId,
          },
        });
      }
      throw e;
    }
  }

  async updateDelivery(
    id: string,
    data: {
      deliveryStatus: string;
      targetMessageId?: string;
      errorCode?: string;
      errorMessage?: string;
    },
  ) {
    return this.prisma.messageMapping.update({
      where: { id },
      data: {
        deliveryStatus: data.deliveryStatus,
        targetMessageId: data.targetMessageId,
        errorCode: data.errorCode,
        errorMessage: data.errorMessage,
      },
    });
  }
}
