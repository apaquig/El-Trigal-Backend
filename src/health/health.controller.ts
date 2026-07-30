import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Connection } from 'mongoose';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  @Get('live')
  @ApiOkResponse({ description: 'Proceso vivo.' })
  live(): { status: 'ok' } {
    return { status: 'ok' };
  }

  @Get('ready')
  @ApiOkResponse({ description: 'Proceso listo y conectado a MongoDB.' })
  ready(): { status: 'ok'; mongo: 'connected' } {
    if (this.connection.readyState !== 1) {
      throw new ServiceUnavailableException('MongoDB is not ready');
    }

    return { status: 'ok', mongo: 'connected' };
  }
}
