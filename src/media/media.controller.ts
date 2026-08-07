import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../auth/roles.enum';
import { AuthenticatedUser } from '../common/types/request-with-context';
import { ConfirmMediaDto, CreateUploadSignatureDto } from './dto/media.dto';
import { MediaService } from './media.service';

@ApiTags('admin/media')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.OWNER, Role.ADMIN, Role.EDITOR)
@Controller('admin/media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('signature')
  @ApiOkResponse({ description: 'Firma segura para carga directa a Cloudinary.' })
  signature(@Body() dto: CreateUploadSignatureDto) {
    return this.mediaService.createUploadSignature(dto);
  }

  @Post('confirm')
  @ApiCreatedResponse({ description: 'Confirma y persiste metadata de Cloudinary.' })
  confirm(@Body() dto: ConfirmMediaDto, @CurrentUser() user: AuthenticatedUser) {
    return this.mediaService.confirm(dto, user);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        folder: {
          type: 'string',
          default: 'products',
        },
      },
    },
  })
  @ApiCreatedResponse({ description: 'Carga directa y persiste metadata de Cloudinary.' })
  upload(
    @UploadedFile() file: any,
    @Body('folder') folder: string = 'products',
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.mediaService.upload(file, folder, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Elimina media si no esta referenciada.' })
  delete(@Param('id') id: string) {
    return this.mediaService.delete(id);
  }
}
