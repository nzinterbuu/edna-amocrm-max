import { Injectable, Logger } from '@nestjs/common';
import { AmocrmChatClient } from '../amocrm/amocrm-chat.client';

/**
 * Reports delivery/read status back to amoCRM Chats API.
 * POST /v2/origin/custom/{scope_id}/{msgid}/delivery_status
 * TODO: verify exact payload and status_code values in official docs before enabling in production.
 */
@Injectable()
export class DeliveryStatusService {
  private readonly log = new Logger(DeliveryStatusService.name);

  constructor(private readonly chat: AmocrmChatClient) {}

  async reportDelivered(params: {
    scopeId: string;
    amoMsgid: string;
    updatedAtUnix: number;
  }): Promise<void> {
    this.log.debug(
      `delivery_status stub: would notify amo ${params.scopeId} msg=${params.amoMsgid}`,
    );
    // await this.chat.sendDeliveryStatus(params.scopeId, params.amoMsgid, {
    //   delivery_status: { status: 'delivered', updated_at: params.updatedAtUnix },
    // });
  }
}
