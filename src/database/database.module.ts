import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppConfig } from '../config/configuration';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => ({
        uri: config.get('mongoUri', { infer: true }),
        autoIndex: config.get('nodeEnv', { infer: true }) !== 'production',
        sanitizeFilter: true,
        serverSelectionTimeoutMS: 5000,
        maxPoolSize: 20,
      }),
    }),
  ],
})
export class DatabaseModule {}
