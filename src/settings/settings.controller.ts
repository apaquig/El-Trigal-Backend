import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedUser } from '../common/types/request-with-context';
import { Role } from '../auth/roles.enum';
import { UpdateSettingsDto } from './dto/settings.dto';
import { SettingsService } from './settings.service';

@ApiTags('settings')
@Controller()
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('public/settings')
  @ApiOkResponse({ description: 'Configuracion publica, incluida la paleta oficial.' })
  getPublicSettings() {
    return this.settingsService.getPublicSettings();
  }

  @Get('admin/settings')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOkResponse({ description: 'Configuracion administrativa.' })
  getAdminSettings() {
    return this.settingsService.getAdminSettings();
  }

  @Patch('admin/settings')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOkResponse({ description: 'Actualiza configuracion administrativa.' })
  updateSettings(@Body() dto: UpdateSettingsDto, @CurrentUser() user: AuthenticatedUser) {
    return this.settingsService.updateSettings(dto, user.role as Role);
  }
}
