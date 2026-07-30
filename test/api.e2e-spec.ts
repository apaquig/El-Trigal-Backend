import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { NextFunction, Response } from 'express';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { AdminProductsController } from '../src/catalog/catalog.controller';
import { ProductService } from '../src/catalog/catalog.service';
import { ApiException } from '../src/common/errors/api.exception';
import { ErrorCode } from '../src/common/errors/error-code.enum';
import { ApiExceptionFilter } from '../src/common/filters/api-exception.filter';
import { EnvelopeInterceptor } from '../src/common/interceptors/envelope.interceptor';
import { NoSqlInjectionPipe } from '../src/common/pipes/no-sql-injection.pipe';
import { flattenValidationErrors } from '../src/common/validators/validation-errors';
import { PublicFormsController } from '../src/forms/forms.controller';
import { FormsService } from '../src/forms/forms.service';
import { SettingsController } from '../src/settings/settings.controller';
import { SettingsService } from '../src/settings/settings.service';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/auth/guards/roles.guard';
import { RequestWithContext } from '../src/common/types/request-with-context';

describe('El Trigal API e2e contract', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [SettingsController, PublicFormsController, AdminProductsController],
      providers: [
        JwtAuthGuard,
        RolesGuard,
        Reflector,
        { provide: JwtService, useValue: { verifyAsync: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        {
          provide: SettingsService,
          useValue: {
            getPublicSettings: jest.fn().mockResolvedValue({
              brand: {
                colors: {
                  brown: '#4A3C31',
                  gold: '#D4AF37',
                  goldSecondary: '#C5A059',
                  cream: '#FDFBF7',
                },
              },
            }),
            getAdminSettings: jest.fn(),
            updateSettings: jest.fn(),
          },
        },
        {
          provide: FormsService,
          useValue: {
            submitContact: jest.fn(),
            submitCakeRequest: jest.fn(),
          },
        },
        {
          provide: ProductService,
          useValue: {
            listAdmin: jest.fn(),
            create: jest.fn(),
            findAdmin: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            publish: jest.fn(),
            archive: jest.fn(),
            restore: jest.fn(),
            duplicate: jest.fn(),
          },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use((req: RequestWithContext, _res: Response, next: NextFunction) => {
      req.requestId = randomUUID();
      next();
    });
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new NoSqlInjectionPipe(),
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        forbidUnknownValues: true,
        transform: true,
        transformOptions: { enableImplicitConversion: false },
        exceptionFactory: (errors) =>
          new ApiException(
            ErrorCode.VALIDATION_ERROR,
            'La solicitud contiene datos invalidos.',
            HttpStatus.BAD_REQUEST,
            flattenValidationErrors(errors),
          ),
      }),
    );
    app.useGlobalFilters(new ApiExceptionFilter());
    app.useGlobalInterceptors(new EnvelopeInterceptor());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('wraps public settings in the standard envelope', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/public/settings').expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.brand.colors.brown).toBe('#4A3C31');
    expect(response.body.meta.requestId).toEqual(expect.any(String));
  });

  it('rejects invalid public contact payloads with VALIDATION_ERROR', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/public/contact')
      .send({
        name: { bad: 'shape' },
        email: 'cliente@example.com',
        subject: 'Pedido',
        message: 'Quiero informacion para un evento familiar.',
        locale: 'es',
      })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe(ErrorCode.VALIDATION_ERROR);
  });

  it('protects admin product routes without a bearer token', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/admin/products').expect(401);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe(ErrorCode.UNAUTHORIZED);
  });
});
