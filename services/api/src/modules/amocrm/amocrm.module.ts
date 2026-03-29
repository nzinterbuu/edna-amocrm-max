import { Global, Module } from '@nestjs/common';
import { AppConfigService } from '../../config/app-config.service';
import { ChatSignatureService } from './chat-signature.service';
import { AmocrmWebhookValidator } from './amocrm-webhook.validator';
import { AmocrmOauthService } from './amocrm-oauth.service';
import { AmocrmChatClient } from './amocrm-chat.client';

@Global()
@Module({
  providers: [
    AppConfigService,
    ChatSignatureService,
    AmocrmWebhookValidator,
    AmocrmOauthService,
    AmocrmChatClient,
  ],
  exports: [
    AppConfigService,
    ChatSignatureService,
    AmocrmWebhookValidator,
    AmocrmOauthService,
    AmocrmChatClient,
  ],
})
export class AmocrmModule {}
