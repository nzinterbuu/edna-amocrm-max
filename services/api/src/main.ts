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

  app.enableCors({
    origin: true,
    credentials: true,
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
}
bootstrap();
