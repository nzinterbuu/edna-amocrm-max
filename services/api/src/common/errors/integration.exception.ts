import { HttpException, HttpStatus } from '@nestjs/common';

export class IntegrationException extends HttpException {
  constructor(
    public readonly code: string,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    public readonly details?: Record<string, unknown>,
  ) {
    super({ code, message, details }, status);
  }
}

export class SignatureInvalidException extends IntegrationException {
  constructor(message = 'Invalid X-Signature') {
    super('SIGNATURE_INVALID', message, HttpStatus.FORBIDDEN);
  }
}

export class SenderNotFoundError extends IntegrationException {
  constructor() {
    super('SENDER_NOT_FOUND', 'Такой подписи нет', HttpStatus.BAD_REQUEST);
  }
}

export class SenderNotMaxBotError extends IntegrationException {
  constructor() {
    super('SENDER_NOT_MAX_BOT', 'Это не подпись MAX_BOT', HttpStatus.BAD_REQUEST);
  }
}

export class SenderInactiveError extends IntegrationException {
  constructor() {
    super('SENDER_INACTIVE', 'Эта подпись неактивна', HttpStatus.BAD_REQUEST);
  }
}
