import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../db/prisma.service';

@Injectable()
export class WebhookLogService {
  constructor(private readonly prisma: PrismaService) {}

  async log(params: {
    channelConnectionId?: string | null;
    source: string;
    requestHeaders?: Record<string, unknown>;
    requestBody?: unknown;
    responseStatus?: number;
    responseBody?: unknown;
    processingStatus: string;
  }) {
    await this.prisma.webhookLog.create({
      data: {
        channelConnectionId: params.channelConnectionId ?? undefined,
        source: params.source,
        requestHeaders: params.requestHeaders as Prisma.InputJsonValue,
        requestBody: params.requestBody as Prisma.InputJsonValue,
        responseStatus: params.responseStatus,
        responseBody: params.responseBody as Prisma.InputJsonValue,
        processingStatus: params.processingStatus,
      },
    });
  }
}
