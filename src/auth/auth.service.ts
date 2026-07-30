import {
  ConflictException,
  ForbiddenException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import argon2 from 'argon2';
import { CookieOptions } from 'express';
import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import { Model, Types } from 'mongoose';
import { AppConfig } from '../config/configuration';
import { ApiException } from '../common/errors/api.exception';
import { ErrorCode } from '../common/errors/error-code.enum';
import { paginate } from '../common/utils/pagination';
import { Role } from './roles.enum';
import {
  ChangePasswordDto,
  CreateUserDto,
  ForgotPasswordDto,
  LoginDto,
  ResetPasswordDto,
  UpdateUserDto,
} from './dto/auth.dto';
import {
  PasswordResetToken,
  PasswordResetTokenDocument,
} from './schemas/password-reset-token.schema';
import { RefreshSession, RefreshSessionDocument } from './schemas/refresh-session.schema';
import { User, UserDocument, UserStatus } from './schemas/user.schema';

export const REFRESH_COOKIE_NAME = 'el_trigal_refresh';

interface RequestFingerprint {
  ip?: string;
  userAgent?: string;
}

interface IssuedTokens {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
  user: PublicUser;
}

export interface PublicUser {
  id: string;
  email: string;
  role: Role;
  status: UserStatus;
}

type UserWithHash = UserDocument & { passwordHash: string; _id: Types.ObjectId };

@Injectable()
export class AuthService {
  private readonly maxFailedAttempts = 5;
  private readonly lockMinutes = 15;
  private readonly commonPasswords = new Set([
    'Password123!',
    'Welcome123!',
    'ElTrigal123!',
    'Admin123456!',
    'Qwerty123!',
  ]);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(RefreshSession.name)
    private readonly refreshSessionModel: Model<RefreshSessionDocument>,
    @InjectModel(PasswordResetToken.name)
    private readonly passwordResetModel: Model<PasswordResetTokenDocument>,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  async login(dto: LoginDto, fingerprint: RequestFingerprint): Promise<IssuedTokens> {
    const user = await this.userModel.findOne({ email: dto.email }).select('+passwordHash').exec();

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw this.invalidCredentials();
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new ApiException(
        ErrorCode.ACCOUNT_LOCKED,
        'La cuenta esta bloqueada temporalmente.',
        HttpStatus.FORBIDDEN,
      );
    }

    const valid = await argon2.verify(user.passwordHash, dto.password);
    if (!valid) {
      await this.recordFailedLogin(user);
      throw this.invalidCredentials();
    }

    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    user.lastLoginAt = new Date();
    await user.save();

    return this.issueTokens(user as UserWithHash, fingerprint);
  }

  async refresh(
    rawToken: string | undefined,
    fingerprint: RequestFingerprint,
  ): Promise<IssuedTokens> {
    if (!rawToken) {
      throw new UnauthorizedException();
    }

    const tokenHash = this.hashToken(rawToken);
    const session = await this.refreshSessionModel
      .findOne({ tokenHash })
      .select('+tokenHash')
      .exec();

    if (!session) {
      throw new ApiException(
        ErrorCode.TOKEN_INVALID,
        'El token es invalido.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (session.revokedAt) {
      await this.revokeRefreshFamily(session.familyId);
      throw new ApiException(
        ErrorCode.TOKEN_INVALID,
        'El token es invalido.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (session.expiresAt <= new Date()) {
      throw new ApiException(ErrorCode.TOKEN_EXPIRED, 'El token expiro.', HttpStatus.UNAUTHORIZED);
    }

    const user = await this.userModel.findById(session.userId).exec();
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException();
    }

    const nextRawToken = this.generateOpaqueToken();
    const nextHash = this.hashToken(nextRawToken);
    session.revokedAt = new Date();
    session.replacedByTokenHash = nextHash;
    await session.save();

    await this.refreshSessionModel.create({
      userId: user._id,
      familyId: session.familyId,
      tokenHash: nextHash,
      expiresAt: this.refreshExpiry(),
      userAgentHash: this.hashFingerprint(fingerprint.userAgent),
      ipHash: this.hashFingerprint(fingerprint.ip),
    });

    return {
      accessToken: await this.signAccessToken(user as UserWithHash, session.familyId),
      expiresIn: 900,
      refreshToken: nextRawToken,
      user: this.toPublicUser(user),
    };
  }

  async logout(rawToken: string | undefined): Promise<void> {
    if (!rawToken) {
      return;
    }

    await this.refreshSessionModel.updateOne(
      { tokenHash: this.hashToken(rawToken), revokedAt: null },
      { $set: { revokedAt: new Date() } },
    );
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const user = await this.userModel.findOne({ email: dto.email }).exec();
    if (user) {
      await this.passwordResetModel.updateMany(
        { userId: user._id, usedAt: null },
        { $set: { usedAt: new Date() } },
      );

      const token = this.generateOpaqueToken();
      await this.passwordResetModel.create({
        userId: user._id,
        tokenHash: this.hashToken(token),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      });

      // Production wiring should send `${ANGULAR_PANEL_URL}/reset-password?token=${token}` here.
    }

    return {
      message: 'Si el correo existe, se enviaran instrucciones para restablecer la contrasena.',
    };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    this.assertPasswordPolicy(dto.password);
    const tokenHash = this.hashToken(dto.token);
    const reset = await this.passwordResetModel
      .findOne({ tokenHash, usedAt: null, expiresAt: { $gt: new Date() } })
      .select('+tokenHash')
      .exec();

    if (!reset) {
      throw new ApiException(
        ErrorCode.TOKEN_INVALID,
        'El token es invalido.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const user = await this.userModel.findById(reset.userId).select('+passwordHash').exec();
    if (!user) {
      throw new NotFoundException();
    }

    user.passwordHash = await this.hashPassword(dto.password);
    user.sessionVersion += 1;
    await user.save();

    reset.usedAt = new Date();
    await reset.save();
    await this.refreshSessionModel.updateMany(
      { userId: user._id, revokedAt: null },
      { $set: { revokedAt: new Date() } },
    );

    return { message: 'Contrasena actualizada correctamente.' };
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<{ message: string }> {
    this.assertPasswordPolicy(dto.newPassword);
    const user = await this.userModel.findById(userId).select('+passwordHash').exec();
    if (!user) {
      throw new NotFoundException();
    }

    const valid = await argon2.verify(user.passwordHash, dto.currentPassword);
    if (!valid) {
      throw this.invalidCredentials();
    }

    user.passwordHash = await this.hashPassword(dto.newPassword);
    user.sessionVersion += 1;
    await user.save();
    await this.refreshSessionModel.updateMany(
      { userId: user._id, revokedAt: null },
      { $set: { revokedAt: new Date() } },
    );

    return { message: 'Contrasena actualizada correctamente.' };
  }

  async getMe(userId: string): Promise<PublicUser> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException();
    }

    return this.toPublicUser(user);
  }

  async listUsers(page = 1, limit = 24) {
    const [items, totalItems] = await Promise.all([
      this.userModel
        .find()
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      this.userModel.countDocuments().exec(),
    ]);

    return paginate(
      items.map((user) => this.toPublicUser(user)),
      page,
      limit,
      totalItems,
    );
  }

  async createUser(dto: CreateUserDto): Promise<PublicUser> {
    this.assertPasswordPolicy(dto.password);
    const exists = await this.userModel.exists({ email: dto.email });
    if (exists) {
      throw new ApiException(
        ErrorCode.EMAIL_ALREADY_EXISTS,
        'El correo ya esta registrado.',
        HttpStatus.CONFLICT,
      );
    }

    const user = await this.userModel.create({
      email: dto.email,
      role: dto.role,
      passwordHash: await this.hashPassword(dto.password),
    });

    return this.toPublicUser(user);
  }

  async updateUser(
    id: string,
    dto: UpdateUserDto,
    actor: Pick<PublicUser, 'id' | 'role'>,
  ): Promise<PublicUser> {
    const user = await this.userModel.findById(id).select('+passwordHash').exec();
    if (!user) {
      throw new NotFoundException();
    }

    if (String(user._id) === actor.id && dto.role && dto.role !== actor.role) {
      throw new ForbiddenException('No puedes cambiar tu propio rol.');
    }

    if (dto.email) {
      const exists = await this.userModel.exists({ email: dto.email, _id: { $ne: user._id } });
      if (exists) {
        throw new ConflictException();
      }
      user.email = dto.email;
    }

    if (dto.role) {
      user.role = dto.role;
    }

    if (dto.status) {
      user.status = dto.status as UserStatus;
    }

    if (dto.password) {
      this.assertPasswordPolicy(dto.password);
      user.passwordHash = await this.hashPassword(dto.password);
      user.sessionVersion += 1;
      await this.refreshSessionModel.updateMany(
        { userId: user._id, revokedAt: null },
        { $set: { revokedAt: new Date() } },
      );
    }

    await user.save();
    return this.toPublicUser(user);
  }

  buildRefreshCookie(refreshToken: string): {
    name: string;
    value: string;
    options: CookieOptions;
  } {
    const cookieDomain = this.config.get('cookieDomain', { infer: true });

    return {
      name: REFRESH_COOKIE_NAME,
      value: refreshToken,
      options: {
        httpOnly: true,
        secure: this.config.get('nodeEnv', { infer: true }) === 'production',
        sameSite: 'lax',
        path: '/api/v1/auth/refresh',
        domain: cookieDomain || undefined,
        maxAge: this.config.get('jwt.refreshTtlDays', { infer: true }) * 24 * 60 * 60 * 1000,
      },
    };
  }

  clearRefreshCookieOptions(): CookieOptions {
    const cookieDomain = this.config.get('cookieDomain', { infer: true });
    return {
      httpOnly: true,
      secure: this.config.get('nodeEnv', { infer: true }) === 'production',
      sameSite: 'lax',
      path: '/api/v1/auth/refresh',
      domain: cookieDomain || undefined,
    };
  }

  private async issueTokens(
    user: UserWithHash,
    fingerprint: RequestFingerprint,
  ): Promise<IssuedTokens> {
    const familyId = randomUUID();
    const refreshToken = this.generateOpaqueToken();
    await this.refreshSessionModel.create({
      userId: user._id,
      familyId,
      tokenHash: this.hashToken(refreshToken),
      expiresAt: this.refreshExpiry(),
      userAgentHash: this.hashFingerprint(fingerprint.userAgent),
      ipHash: this.hashFingerprint(fingerprint.ip),
    });

    return {
      accessToken: await this.signAccessToken(user, familyId),
      expiresIn: 900,
      refreshToken,
      user: this.toPublicUser(user),
    };
  }

  private async signAccessToken(
    user: UserWithHash | UserDocument,
    familyId: string,
  ): Promise<string> {
    return this.jwtService.signAsync(
      {
        sub: String(user._id),
        email: user.email,
        role: user.role,
        sessionFamilyId: familyId,
      },
      {
        secret: this.config.get('jwt.accessSecret', { infer: true }),
        issuer: this.config.get('jwt.issuer', { infer: true }),
        audience: this.config.get('jwt.audience', { infer: true }),
        expiresIn: this.config.get('jwt.accessTtl', { infer: true }),
      },
    );
  }

  private async hashPassword(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: this.config.get('argon2.memoryCost', { infer: true }),
      timeCost: this.config.get('argon2.timeCost', { infer: true }),
      parallelism: this.config.get('argon2.parallelism', { infer: true }),
    });
  }

  private assertPasswordPolicy(password: string): void {
    if (this.commonPasswords.has(password)) {
      throw new ApiException(
        ErrorCode.VALIDATION_ERROR,
        'La solicitud contiene datos invalidos.',
        HttpStatus.BAD_REQUEST,
        [
          {
            field: 'password',
            rule: 'notCommon',
            message: 'La contrasena es demasiado comun.',
          },
        ],
      );
    }
  }

  private async recordFailedLogin(user: UserDocument): Promise<void> {
    user.failedLoginAttempts += 1;
    if (user.failedLoginAttempts >= this.maxFailedAttempts) {
      user.lockedUntil = new Date(Date.now() + this.lockMinutes * 60 * 1000);
    }

    await user.save();
  }

  private invalidCredentials(): ApiException {
    return new ApiException(
      ErrorCode.INVALID_CREDENTIALS,
      'Correo o contrasena invalidos.',
      HttpStatus.UNAUTHORIZED,
    );
  }

  private async revokeRefreshFamily(familyId: string): Promise<void> {
    await this.refreshSessionModel.updateMany(
      { familyId, revokedAt: null },
      { $set: { revokedAt: new Date() } },
    );
  }

  private generateOpaqueToken(): string {
    return randomBytes(64).toString('base64url');
  }

  private hashToken(token: string): string {
    return createHmac('sha256', this.config.get('jwt.refreshSecret', { infer: true }))
      .update(token)
      .digest('hex');
  }

  private hashFingerprint(value?: string): string | null {
    if (!value) {
      return null;
    }

    return createHmac('sha256', this.config.get('jwt.refreshSecret', { infer: true }))
      .update(value)
      .digest('hex');
  }

  private refreshExpiry(): Date {
    return new Date(
      Date.now() + this.config.get('jwt.refreshTtlDays', { infer: true }) * 86_400_000,
    );
  }

  private toPublicUser(user: UserDocument | User | Record<string, unknown>): PublicUser {
    const source = user as User & { _id?: Types.ObjectId; id?: string };
    return {
      id: source.id ?? String(source._id),
      email: source.email,
      role: source.role,
      status: source.status,
    };
  }
}
