import { IsString, MinLength } from 'class-validator';

export class CreateChannelDto {
  @IsString()
  installation_id!: string;

  @IsString()
  @MinLength(1)
  display_name!: string;

  /** X-API-KEY из edna Pulse (виджет) */
  @IsString()
  @MinLength(1)
  api_key!: string;

  /** ID канала MAX / sender в Pulse (сохраняется как max_bot_id) */
  @IsString()
  @MinLength(1)
  channel_id!: string;
}
