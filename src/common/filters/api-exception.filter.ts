import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { MongoServerError } from 'mongodb';
import { Response } from 'express';
import { ApiException, ApiErrorPayload } from '../errors/api.exception';
import { ErrorCode } from '../errors/error-code.enum';
import { ERROR_MESSAGES } from '../errors/error-messages';
import { RequestWithContext } from '../types/request-with-context';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithContext>();
    const timestamp = new Date().toISOString();
    const requestId = request.requestId;

    const { status, error } = this.toApiError(exception);

    if (status >= 500) {
      this.logger.error(
        {
          requestId,
          method: request.method,
          path: request.originalUrl,
          error: exception instanceof Error ? exception.message : String(exception),
        },
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(
        `Request ID: ${requestId} | Method: ${request.method} | Path: ${request.originalUrl} | Error: ${JSON.stringify(error)}`
      );
    }

    response.status(status).json({
      success: false,
      error,
      meta: {
        requestId,
        timestamp,
      },
    });
  }

  private toApiError(exception: unknown): { status: number; error: ApiErrorPayload } {
    if (exception instanceof ApiException) {
      return {
        status: exception.getStatus(),
        error: {
          code: exception.code,
          message: exception.message,
          details: exception.details,
        },
      };
    }

    if (
      (exception instanceof MongoServerError && exception.code === 11000) ||
      (exception && typeof exception === 'object' && (exception as any).code === 11000) ||
      (exception instanceof Error && exception.message.includes('E11000'))
    ) {
      const errObj = exception as any;
      const msg = errObj.message || '';
      const code = msg.toLowerCase().includes('sku')
        ? ErrorCode.SKU_ALREADY_EXISTS
        : ErrorCode.SLUG_ALREADY_EXISTS;

      return {
        status: HttpStatus.CONFLICT,
        error: {
          code,
          message: ERROR_MESSAGES[code] || 'Ya existe un producto con el mismo nombre o SKU.',
        },
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const code = this.mapHttpStatus(status);
      const responsePayload = exception.getResponse();
      const message = typeof responsePayload === 'object' && responsePayload !== null && 'message' in responsePayload
        ? (responsePayload as any).message
        : exception.message;
      return {
        status,
        error: {
          code,
          message: Array.isArray(message) ? message[0] : message || ERROR_MESSAGES[code],
        },
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message: ERROR_MESSAGES[ErrorCode.INTERNAL_ERROR],
      },
    };
  }

  private mapHttpStatus(status: number): ErrorCode {
    switch (status) {
      case HttpStatus.UNAUTHORIZED:
        return ErrorCode.UNAUTHORIZED;
      case HttpStatus.FORBIDDEN:
        return ErrorCode.FORBIDDEN;
      case HttpStatus.NOT_FOUND:
        return ErrorCode.RESOURCE_NOT_FOUND;
      case HttpStatus.CONFLICT:
        return ErrorCode.CONFLICT;
      case HttpStatus.TOO_MANY_REQUESTS:
        return ErrorCode.RATE_LIMITED;
      case HttpStatus.BAD_REQUEST:
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return ErrorCode.VALIDATION_ERROR;
      default:
        return ErrorCode.INTERNAL_ERROR;
    }
  }
}
