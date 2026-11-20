import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as dotenv from 'dotenv';
import { AppModule } from './app.module';

dotenv.config();

async function bootstrap() {
  const logger = new Logger('OshxonaPOS-CloudAPI');
  const app = await NestFactory.create(AppModule);

  app.enableCors({ origin: '*' });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('☁️ OshxonaPOS Bulut API (Cloud Sync Server)')
    .setDescription('Lokal kassa serverlari va admin web panel uchun markaziy bulut serveri')
    .setVersion('1.0.0')
    .addApiKey({ type: 'apiKey', name: 'x-sync-api-key', in: 'header' }, 'sync-api-key')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.CLOUD_PORT || 5000;
  await app.listen(port);

  logger.log(`☁️ OshxonaPOS Bulut API ishga tushdi: http://localhost:${port}`);
  logger.log(`📚 Swagger API hujjatlari: http://localhost:${port}/api/docs`);
}

bootstrap();
