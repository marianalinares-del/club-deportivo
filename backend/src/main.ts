import { config } from 'dotenv';
import { resolve } from 'path';

// Cargar .env antes de cualquier import de NestJS/Prisma
config({ path: resolve(__dirname, '..', '.env') });

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Habilitar CORS para desarrollo
  app.enableCors({
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Validación global de DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Prefijo global (los controladores ya definen api/v1)
  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`🚀 Backend corriendo en http://localhost:${port}`);
  console.log(`📋 Endpoints disponibles:`);
  console.log(`   POST   /api/v1/auth/register`);
  console.log(`   POST   /api/v1/auth/login`);
  console.log(`   GET    /api/v1/profile`);
  console.log(`   PUT    /api/v1/profile`);
  console.log(`   GET    /api/v1/disciplines`);
  console.log(`   POST   /api/v1/disciplines`);
  console.log(`   GET    /api/v1/courts`);
  console.log(`   POST   /api/v1/courts`);
  console.log(`   GET    /api/v1/time-slots`);
  console.log(`   GET    /api/v1/time-slots/availability`);
  console.log(`   GET    /api/v1/reservations`);
  console.log(`   POST   /api/v1/reservations`);
  console.log(`   GET    /api/v1/equipment`);
  console.log(`   POST   /api/v1/equipment-rentals`);
  console.log(`   POST   /api/v1/payments`);
  console.log(`   GET    /api/v1/audit-logs`);
}

bootstrap();