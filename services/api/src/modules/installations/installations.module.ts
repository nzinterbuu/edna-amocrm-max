import { Global, Module } from '@nestjs/common';
import { InstallationTokensService } from './installation-tokens.service';

@Global()
@Module({
  providers: [InstallationTokensService],
  exports: [InstallationTokensService],
})
export class InstallationsModule {}
