import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { getMenuImagesDir } from './uploads/uploads.service';
import { mkdirSync } from 'fs';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as dotenv from 'dotenv';
import { AppModule } from './app.module';
import { AuthService } from './auth/auth.service';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { assertSecurityConfig, corsOriginCallback } from './config/security.config';
import { networkInterfaces } from 'os';

// .env yuklash (apps/local-server/.env -> monorepo ildizidagi .env ga symlink bo'lishi mumkin)
dotenv.config();

/** Server LAN manzillari — boshqa kassa/KDS qurilmalari shu manzil orqali ulanadi. */
function getLanAddresses(): string[] {
  return Object.values(networkInterfaces())
    .flat()
    .filter((i): i is NonNullable<typeof i> => !!i && i.family === 'IPv4' && !i.internal)
    .map((i) => i.address);
}

async function bootstrap() {
  const logger = new Logger('OshxonaPOS-Server');

  // Majburiy sozlamalar (JWT kalitlari, DATABASE_URL) — yo'q bo'lsa ishga tushmaymiz
  assertSecurityConfig();

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Yuklangan taom rasmlari (faqat /uploads/menu/*.jpg|png|webp; papka ro'yxati va yashirin fayllar yopiq)
  mkdirSync(getMenuImagesDir(), { recursive: true });
  app.useStaticAssets(getMenuImagesDir(), {
    prefix: '/uploads/menu/',
    index: false,
    dotfiles: 'deny',
    redirect: false,
    maxAge: '7d',
    setHeaders: (res) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Security-Policy', "default-src 'none'");
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    },
  });

  // CORS: faqat CORS_ORIGINS ro'yxati (+ ixtiyoriy lokal tarmoq) ga ruxsat.
  // Autentifikatsiya Bearer token orqali — cookie ishlatilmaydi, shuning uchun credentials=false.
  app.enableCors({
    origin: corsOriginCallback,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: ['Content-Type', 'Authorization', 'x-device-id'],
    credentials: false,
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

  // Swagger faqat development yoki aniq yoqilganda
  if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_SWAGGER === 'true') {
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      customSiteTitle: 'OshxonaPOS API Hujjatlari',
    });
  }

  // Production'da demo (seed) PIN/parol bilan faol hisob bo'lsa — ishga tushmaymiz
  if (process.env.NODE_ENV === 'production') {
    const weak = await app.get(AuthService).findDefaultCredentialUsers();
    if (weak.length) {
      throw new Error(
        `[security] Standart (demo) PIN/parol bilan faol hisoblar bor: ${weak.join(', ')}. ` +
          'Admin paneldan PIN/parolni almashtiring yoki hisobni o\'chiring.',
      );
    }
  }

  const port = Number(process.env.PORT) || 4000;
  // 0.0.0.0 — lokal tarmoqdagi boshqa kassalar va KDS ekranlari ulanishi uchun
  const host = process.env.HOST || '0.0.0.0';
  await app.listen(port, host);

  logger.log(`🚀 OshxonaPOS lokal serveri ishga tushdi: http://localhost:${port}`);
  for (const ip of getLanAddresses()) {
    logger.log(`🌐 LAN manzil (boshqa qurilmalar uchun): http://${ip}:${port}`);
  }
  if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_SWAGGER === 'true') {
    logger.log(`📚 Swagger API hujjatlari: http://localhost:${port}/api/docs`);
  }
}

bootstrap().catch((err) => {
  new Logger('OshxonaPOS-Server').error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
