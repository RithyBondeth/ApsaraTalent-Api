import { HttpException, HttpStatus } from '@nestjs/common';

export class BakongQRGenerationException extends HttpException {
  constructor(message: string, details?: any) {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'QR Generation Failed',
        message,
        details,
        timestamp: new Date().toISOString(),
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class BakongQRValidationException extends HttpException {
  constructor(message: string, details?: any) {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'QR Validation Failed',
        message,
        details,
        timestamp: new Date().toISOString(),
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class BakongApiConnectionException extends HttpException {
  constructor(message: string) {
    super(
      {
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        error: 'Bakong API Connection Failed',
        message,
        timestamp: new Date().toISOString(),
      },
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
}

export class BakongPaymentNotFoundException extends HttpException {
  constructor(md5Hash: string) {
    super(
      {
        statusCode: HttpStatus.NOT_FOUND,
        error: 'Payment Not Found',
        message: `Payment with hash ${md5Hash} was not found`,
        md5Hash,
        timestamp: new Date().toISOString(),
      },
      HttpStatus.NOT_FOUND,
    );
  }
}

export class BakongConfigurationException extends HttpException {
  constructor(message: string) {
    super(
      {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        error: 'Bakong Configuration Error',
        message,
        timestamp: new Date().toISOString(),
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
