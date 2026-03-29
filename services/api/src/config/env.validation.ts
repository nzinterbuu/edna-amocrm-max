import { plainToInstance } from 'class-transformer';
import { IsOptional, IsString, IsUrl, validateSync } from 'class-validator';

class EnvironmentVariables {
  @IsString()
  DATABASE_URL!: string;

  @IsString()
  @IsOptional()
  PORT?: string;

  @IsString()
  AMOCRM_CLIENT_ID!: string;

  @IsString()
  AMOCRM_CLIENT_SECRET!: string;

  /** Must match integration Redirect URI in amoCRM */
  @IsUrl({ require_tld: false })
  AMOCRM_REDIRECT_URI!: string;

  /** Registered custom chat channel UUID (from amoCRM) */
  @IsString()
  AMOCRM_CHANNEL_ID!: string;

  @IsString()
  AMOCRM_CHANNEL_SECRET!: string;

  @IsUrl({ require_tld: false })
  @IsOptional()
  AMOCRM_CHAT_BASE_URL?: string;

  @IsUrl({ require_tld: false })
  @IsOptional()
  EDNA_API_BASE_URL?: string;

  @IsString()
  EDNA_API_KEY!: string;

  @IsUrl({ require_tld: false })
  APP_BASE_URL!: string;

  @IsString()
  @IsOptional()
  LOG_LEVEL?: string;

  /** edna `sender` for POST /out-messages/max-bot; TODO: may equal MAX bot channel id from Pulse UI */
  @IsString()
  @IsOptional()
  EDNA_PULSE_SENDER?: string;

  @IsString()
  @IsOptional()
  MAX_WEBHOOK_SECRET?: string;
}

export function validateEnv(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validated;
}
