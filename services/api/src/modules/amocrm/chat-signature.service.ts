import { createHash, createHmac } from 'crypto';
import { Injectable } from '@nestjs/common';

/**
 * amoCRM Chats API signing — see
 * https://www.amocrm.ru/developers/content/chats/chat-api-reference
 */
@Injectable()
export class ChatSignatureService {
  contentMd5(bodyUtf8: string): string {
    return createHash('md5').update(bodyUtf8, 'utf8').digest('hex').toLowerCase();
  }

  buildSigningString(
    method: string,
    contentMd5Lower: string,
    contentType: string,
    dateRfc2822: string,
    requestPath: string,
  ): string {
    return [
      method.toUpperCase(),
      contentMd5Lower.toLowerCase(),
      contentType,
      dateRfc2822,
      requestPath,
    ].join('\n');
  }

  sign(
    method: string,
    bodyUtf8: string,
    contentType: string,
    dateRfc2822: string,
    requestPath: string,
    channelSecret: string,
  ): { contentMd5: string; signature: string } {
    const md5 = this.contentMd5(bodyUtf8);
    const str = this.buildSigningString(
      method,
      md5,
      contentType,
      dateRfc2822,
      requestPath,
    );
    const signature = createHmac('sha1', channelSecret)
      .update(str, 'utf8')
      .digest('hex')
      .toLowerCase();
    return { contentMd5: md5, signature };
  }

  formatRfc2822Date(d = new Date()): string {
    return d.toUTCString().replace('GMT', '+0000');
  }
}
