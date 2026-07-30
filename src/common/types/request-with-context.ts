import { Request } from 'express';

export interface AuthenticatedUser {
  sub: string;
  email: string;
  role: 'OWNER' | 'ADMIN' | 'EDITOR';
  sessionFamilyId?: string;
}

export type RequestWithContext = Request & {
  requestId?: string;
  user?: AuthenticatedUser;
};
