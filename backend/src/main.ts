import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  app.use(helmet());
  app.use(json({ limit: '1mb' }));
  app.use(urlencoded({ extended: true, limit: '1mb' }));

  let allowedOrigins: string[] | boolean;
  if (process.env.ALLOWED_ORIGINS) {
    allowedOrigins = process.env.ALLOWED_ORIGINS.split(',');
  } else if (process.env.NODE_ENV === 'production') {
    allowedOrigins = ['https://splitflow.app'];
  } else {
    allowedOrigins = true;
  }

  app.enableCors({
    origin: allowedOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}

void bootstrap();
