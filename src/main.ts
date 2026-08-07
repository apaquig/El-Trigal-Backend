import 'reflect-metadata';
import { HttpStatus, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { ApiException } from './common/errors/api.exception';
import { ErrorCode } from './common/errors/error-code.enum';
import { ApiExceptionFilter } from './common/filters/api-exception.filter';
import { EnvelopeInterceptor } from './common/interceptors/envelope.interceptor';
import { NoSqlInjectionPipe } from './common/pipes/no-sql-injection.pipe';
import { flattenValidationErrors } from './common/validators/validation-errors';
import { AppConfig } from './config/configuration';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  const config = app.get<ConfigService<AppConfig, true>>(ConfigService);

  app.use(helmet());
  app.use(compression());
  app.use(cookieParser());
  app.use(json({ limit: config.get('jsonBodyLimit', { infer: true }) }));
  app.use(urlencoded({ extended: false, limit: config.get('jsonBodyLimit', { infer: true }) }));

  const allowedOrigins = [
    ...config.get('publicOrigins', { infer: true }),
    ...config.get('adminOrigins', { infer: true }),
    'https://eltrigalpancalientito.com',
    'https://www.eltrigalpancalientito.com',
    'https://eltrigalbakery.com',
    'https://www.eltrigalbakery.com',
  ];

  app.enableCors({
    origin(origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('CORS origin denied'), false);
    },
    credentials: true,
  });

  app.setGlobalPrefix('api/v1', {
    exclude: ['health/live', 'health/ready'],
  });

  app.useGlobalPipes(
    new NoSqlInjectionPipe(),
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      forbidUnknownValues: false,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      exceptionFactory: (errors) => {
        try {
          const fs = require('fs');
          const path = require('path');
          const logPath = path.join(__dirname, '..', 'validation_debug.log');
          fs.appendFileSync(logPath, JSON.stringify({ time: new Date().toISOString(), errors }, null, 2) + '\n---\n');
        } catch (e) {}
        return new ApiException(
          ErrorCode.VALIDATION_ERROR,
          'La solicitud contiene datos invalidos.',
          HttpStatus.BAD_REQUEST,
          flattenValidationErrors(errors),
        );
      },
    }),
  );
  app.useGlobalFilters(new ApiExceptionFilter());
  app.useGlobalInterceptors(new EnvelopeInterceptor());

  if (config.get('nodeEnv', { infer: true }) !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('El Trigal API')
      .setDescription('API REST independiente para website Astro y panel Angular.')
      .setVersion('1.0.0')
      .addServer('/api/v1')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/v1/docs', app, document, {
      jsonDocumentUrl: 'api/v1/docs-json',
    });
  }

  await app.listen(config.get('port', { infer: true }));
}

void bootstrap();
