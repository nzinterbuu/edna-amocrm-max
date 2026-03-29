import { Injectable } from '@nestjs/common';

/** MAX Bot Incoming — LLM Manifest */
export interface MaxIncomingPayload {
  id: number;
  subject: string;
  subjectId: number;
  subscriber: { id: number; identifier: string };
  userInfo: {
    userName?: string;
    firstName?: string | null;
    lastName?: string | null;
    avatarUrl?: string | null;
  };
  messageContent: {
    type: string;
    text?: string | null;
  };
  receivedAt: string;
}

@Injectable()
export class MaxIncomingWebhookParser {
  parse(body: unknown): MaxIncomingPayload | null {
    if (!body || typeof body !== 'object') return null;
    const b = body as Record<string, unknown>;
    const messageContent = b.messageContent as Record<string, unknown> | undefined;
    if (!messageContent || String(messageContent.type).toUpperCase() !== 'TEXT') {
      return null;
    }
    const subscriber = b.subscriber as Record<string, unknown> | undefined;
    if (!subscriber) return null;
    return {
      id: Number(b.id),
      subject: String(b.subject ?? ''),
      subjectId: Number(b.subjectId),
      subscriber: {
        id: Number(subscriber.id),
        identifier: String(subscriber.identifier ?? ''),
      },
      userInfo: (b.userInfo as MaxIncomingPayload['userInfo']) ?? {},
      messageContent: {
        type: 'TEXT',
        text: messageContent.text != null ? String(messageContent.text) : '',
      },
      receivedAt: String(b.receivedAt ?? ''),
    };
  }

  displayName(p: MaxIncomingPayload): string {
    const u = p.userInfo;
    const parts = [u.firstName, u.lastName].filter(Boolean);
    if (parts.length) return parts.join(' ').trim();
    if (u.userName) return u.userName;
    return p.subscriber.identifier;
  }
}
