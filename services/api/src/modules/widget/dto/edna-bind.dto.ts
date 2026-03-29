import { IsString, MinLength } from 'class-validator';

export class EdnaBindDto {
  @IsString()
  installation_id!: string;

  @IsString()
  @MinLength(4)
  edna_auth_code!: string;
}
