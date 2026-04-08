import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { json } from 'express';
import { IncomingMessage, ServerResponse } from 'http';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';

type RawBodyRequest = IncomingMessage & { rawBody?: Buffer };

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    bodyParser: false,
  });
  app.useLogger(app.get(Logger));

  app.use(
    json({
      limit: '2mb',
      verify: (
        req: RawBodyRequest,
        _res: ServerResponse,
        buf: Buffer,
        _encoding: string,
      ) => {
        req.rawBody = buf;
      },
    }),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // Виджет Kommo/amoCRM вызывает API из браузера — без открытого CORS bootstrap падает с status 0.
  app.enableCors({
    origin: '*',
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Accept',
      'Authorization',
      'X-Requested-With',
      'X-Signature',
    ],
    credentials: false,
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
}
bootstrap();
