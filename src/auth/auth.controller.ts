import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { CurrentUser } from './decorators/current-user.decorator';
import { Roles } from './decorators/roles.decorator';
import {
  ChangePasswordDto,
  CreateUserDto,
  ForgotPasswordDto,
  LoginDto,
  ResetPasswordDto,
  UpdateUserDto,
} from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Role } from './roles.enum';
import { AuthService, REFRESH_COOKIE_NAME } from './auth.service';
import { RequestWithContext } from '../common/types/request-with-context';

@ApiTags('auth')
@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('auth/login')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Login administrativo.' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto, {
      ip: req.ip,
      userAgent: req.header('user-agent'),
    });
    const cookie = this.authService.buildRefreshCookie(result.refreshToken);
    res.cookie(cookie.name, cookie.value, cookie.options);
    const { refreshToken: _refreshToken, ...body } = result;
    return body;
  }

  @Post('auth/refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Rota el refresh token y entrega access token nuevo.' })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const cookies = req.cookies as Record<string, string | undefined> | undefined;
    const result = await this.authService.refresh(cookies?.[REFRESH_COOKIE_NAME], {
      ip: req.ip,
      userAgent: req.header('user-agent'),
    });
    const cookie = this.authService.buildRefreshCookie(result.refreshToken);
    res.cookie(cookie.name, cookie.value, cookie.options);
    const { refreshToken: _refreshToken, ...body } = result;
    return body;
  }

  @Post('auth/logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const cookies = req.cookies as Record<string, string | undefined> | undefined;
    await this.authService.logout(cookies?.[REFRESH_COOKIE_NAME]);
    res.clearCookie(REFRESH_COOKIE_NAME, this.authService.clearRefreshCookieOptions());
  }

  @Post('auth/forgot-password')
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('auth/reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Get('auth/me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: RequestWithContext['user']) {
    return this.authService.getMe(user?.sub ?? '');
  }

  @Post('auth/change-password')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  changePassword(@CurrentUser() user: RequestWithContext['user'], @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(user?.sub ?? '', dto);
  }
}

@ApiTags('admin/users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.OWNER)
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly authService: AuthService) {}

  @Get()
  listUsers() {
    return this.authService.listUsers();
  }

  @Post()
  createUser(@Body() dto: CreateUserDto) {
    return this.authService.createUser(dto);
  }

  @Patch(':id')
  updateUser(
    @Param('id') id: string,
    @CurrentUser() user: RequestWithContext['user'],
    @Body() dto: UpdateUserDto,
  ) {
    return this.authService.updateUser(id, dto, {
      id: user?.sub ?? '',
      role: user?.role as Role,
    });
  }
}
