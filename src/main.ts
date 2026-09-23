import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import * as os from 'os';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(cookieParser());

  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = Number(process.env.PORT) || 3000;

  // 🔑 MUST bind to 0.0.0.0 for Render (and LAN devices)
  await app.listen(port, '0.0.0.0');

  const logger = new Logger('Bootstrap');

  if (process.env.RENDER || process.env.NODE_ENV === 'production') {
    logger.log(`🚀 API running on port ${port}`);
    return;
  }

  const nets = os.networkInterfaces();
  const lanIps: string[] = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      if (net.family === 'IPv4' && !net.internal) {
        lanIps.push(net.address);
      }
    }
  }

  logger.log(`🚀 Local:   http://localhost:${port}/api/v1`);
  for (const ip of lanIps) {
    logger.log(`📱 LAN:     http://${ip}:${port}/api/v1`);
  }
  logger.log(`🤖 Emu:     http://10.0.2.2:${port}/api/v1  (Android emulator)`);
}

bootstrap();
