import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Kutilmagan server xatoligi yuz berdi';
    let details: any = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const errorObj = res as any;
        message = Array.isArray(errorObj.message) ? errorObj.message[0] : errorObj.message || message;
        details = errorObj.message;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(`Exception: ${exception.message}`, exception.stack);
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      details,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
