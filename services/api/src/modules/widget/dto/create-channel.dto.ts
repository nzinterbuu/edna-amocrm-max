import { IsString, MinLength } from 'class-validator';

export class CreateChannelDto {
  @IsString()
  installation_id!: string;

  @IsString()
  @MinLength(1)
  display_name!: string;

  @IsString()
  edna_tenant_id!: string;

  @IsString()
  @MinLength(1)
  max_bot_id!: string;
}
