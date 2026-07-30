import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AppConfig } from '../../config/configuration';
import { RequestWithContext } from '../../common/types/request-with-context';

interface AccessTokenPayload {
  sub: string;
  email: string;
  role: 'OWNER' | 'ADMIN' | 'EDITOR';
  sessionFamilyId?: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithContext>();
    const authHeader = request.header('authorization') ?? '';
    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException();
    }

    try {
      request.user = await this.jwtService.verifyAsync<AccessTokenPayload>(token, {
        secret: this.config.get('jwt.accessSecret', { infer: true }),
        issuer: this.config.get('jwt.issuer', { infer: true }),
        audience: this.config.get('jwt.audience', { infer: true }),
      });
      return true;
    } catch (err) {
      console.error('JWT verification failed:', err);
      throw new UnauthorizedException();
    }
  }
}
