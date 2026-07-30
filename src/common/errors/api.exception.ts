import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from './error-code.enum';

export interface ValidationIssue {
  field: string;
  rule: string;
  message: string;
}

export interface ApiErrorPayload {
  code: ErrorCode;
  message: string;
  details?: ValidationIssue[];
}

export class ApiException extends HttpException {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    public readonly details?: ValidationIssue[],
  ) {
    super({ code, message, details }, status);
  }
}
