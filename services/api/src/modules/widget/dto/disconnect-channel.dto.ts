import { IsOptional, IsString } from 'class-validator';

export class DisconnectChannelDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
