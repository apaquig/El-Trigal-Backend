import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { Response } from 'express';
import { RequestWithContext } from '../types/request-with-context';

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

function isPaginatedResult<T>(value: unknown): value is PaginatedResult<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as PaginatedResult<T>).items) &&
    Number.isInteger((value as PaginatedResult<T>).page) &&
    Number.isInteger((value as PaginatedResult<T>).limit) &&
    Number.isInteger((value as PaginatedResult<T>).totalItems) &&
    Number.isInteger((value as PaginatedResult<T>).totalPages)
  );
}

@Injectable()
export class EnvelopeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<RequestWithContext>();
    const response = http.getResponse<Response>();

    return next.handle().pipe(
      map((body: unknown) => {
        if (response.statusCode === 204) {
          return undefined;
        }

        const metaBase = {
          requestId: request.requestId,
          timestamp: new Date().toISOString(),
        };

        if (isPaginatedResult(body)) {
          return {
            success: true,
            data: body.items,
            meta: {
              page: body.page,
              limit: body.limit,
              totalItems: body.totalItems,
              totalPages: body.totalPages,
              ...metaBase,
            },
          };
        }

        return {
          success: true,
          data: body ?? {},
          meta: metaBase,
        };
      }),
    );
  }
}
