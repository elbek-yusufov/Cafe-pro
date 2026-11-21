import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

// .env yuklash
dotenv.config();

async function bootstrap() {
  const logger = new Logger('OshxonaPOS-Server');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Uploads papkasi mavjudligini ta'minlash va statik xizmat ko'rsatish
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.useStaticAssets(uploadsDir, { prefix: '/uploads/' });

  // Global CORS (Kassalar va Web interfeys uchun)
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Global Validatsiya
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // Global Xatolik ushlagich va javob formatlagich
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  // Swagger Hujjatlashtirish
  const config = new DocumentBuilder()
    .setTitle('🍽️ OshxonaPOS API — Restoran & Oshxona Boshqaruv Tizimi')
    .setDescription(
      'O\'zbekiston restoran va oshxonalari uchun mo\'ljallangan offline-first POS tizimining lokal server APIsi.',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'OshxonaPOS API Hujjatlari',
  });

  const port = process.env.PORT || 4000;
  await app.listen(port);

  logger.log(`🚀 OshxonaPOS lokal serveri ishga tushdi: http://localhost:${port}`);
  logger.log(`📚 Swagger API hujjatlari: http://localhost:${port}/api/docs`);
}

bootstrap();
