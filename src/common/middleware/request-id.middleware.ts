import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { RequestWithContext } from '../types/request-with-context';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: RequestWithContext, res: Response, next: NextFunction): void {
    const provided = req.header('x-request-id');
    req.requestId = provided && UUID_REGEX.test(provided) ? provided : randomUUID();
    res.setHeader('x-request-id', req.requestId);
    next();
  }
}
