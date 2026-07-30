import 'reflect-metadata';
import { writeFile } from 'node:fs/promises';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';

async function main(): Promise<void> {
  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix('api/v1', { exclude: ['health/live', 'health/ready'] });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('El Trigal API')
    .setDescription('API REST independiente para website Astro y panel Angular.')
    .setVersion('1.0.0')
    .addServer('/api/v1')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  await writeFile('openapi/el-trigal-api.v1.generated.json', JSON.stringify(document, null, 2));
  await app.close();
}

void main();
