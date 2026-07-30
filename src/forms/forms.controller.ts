import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../auth/roles.enum';
import {
  AdminCakeRequestQueryDto,
  ContactDto,
  CustomCakeRequestDto,
  UpdateCakeRequestDto,
} from './dto/forms.dto';
import { FormsService } from './forms.service';

@ApiTags('public/forms')
@Controller('public')
export class PublicFormsController {
  constructor(private readonly formsService: FormsService) {}

  @Post('contact')
  @ApiCreatedResponse({ description: 'Mensaje de contacto recibido.' })
  contact(@Body() dto: ContactDto) {
    return this.formsService.submitContact(dto);
  }

  @Post('custom-cake-requests')
  @ApiCreatedResponse({ description: 'Solicitud de pastel recibida.' })
  customCake(@Body() dto: CustomCakeRequestDto) {
    return this.formsService.submitCakeRequest(dto);
  }
}

@ApiTags('admin/custom-cake-requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.OWNER, Role.ADMIN)
@Controller('admin/custom-cake-requests')
export class AdminCakeRequestsController {
  constructor(private readonly formsService: FormsService) {}

  @Get()
  @ApiOkResponse({ description: 'Lista solicitudes de pastel.' })
  list(@Query() query: AdminCakeRequestQueryDto) {
    return this.formsService.listCakeRequests(query);
  }

  @Get(':id')
  find(@Param('id') id: string) {
    return this.formsService.findCakeRequest(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCakeRequestDto) {
    return this.formsService.updateCakeRequest(id, dto);
  }
}
