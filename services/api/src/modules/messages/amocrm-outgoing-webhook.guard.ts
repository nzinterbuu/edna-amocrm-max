import type { AmocrmOutgoingMessageHook } from './outbound-amocrm.service';

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

/**
 * Runtime shape check for amoCRM Chat API v2 operator message webhook.
 * See https://www.amocrm.ru/developers/content/chats/chat-webhooks
 */
export function isAmocrmOutgoingMessageHook(
  body: unknown,
): body is AmocrmOutgoingMessageHook {
  if (!isRecord(body)) return false;
  if (typeof body.account_id !== 'string') return false;
  if (typeof body.time !== 'number') return false;
  const outer = body.message;
  if (!isRecord(outer)) return false;
  if (!isRecord(outer.sender) || typeof outer.sender.id !== 'string') {
    return false;
  }
  if (!isRecord(outer.receiver) || typeof outer.receiver.id !== 'string') {
    return false;
  }
  if (!isRecord(outer.conversation) || typeof outer.conversation.id !== 'string') {
    return false;
  }
  if (typeof outer.timestamp !== 'number') return false;
  if (typeof outer.msec_timestamp !== 'number') return false;
  const inner = outer.message;
  if (!isRecord(inner)) return false;
  if (typeof inner.id !== 'string') return false;
  if (typeof inner.type !== 'string') return false;
  return true;
}
