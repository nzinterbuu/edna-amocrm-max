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
