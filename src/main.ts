import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import * as os from 'os';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(cookieParser());

  // app.enableCors({
  //   origin: true,
  //   credentials: true,
  //   methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  //   allowedHeaders: ['Content-Type', 'Authorization'],
  // }); 

 app.enableCors({
  origin: [
    // ── Customer form (Vercel) ──
    'https://truest-express-form.vercel.app',
    /^https:\/\/truest-express-form[\w-]*\.vercel\.app$/,

    // ── Admin dashboard (production) ──
    'https://truestethiopian.smrestaurant.com',
    'https://admin.truestexpress.smrestaurant.com',
    'https://truestexpress.smrestaurant.com',
    'https://trustexpress.public.truestexpress.smrestaurant.com',

    // ── Backend itself (legacy form + admin tools) ──
    'https://api.truestexpress.smrestaurant.com',

    // ── Local dev ──
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:5174',
    'http://localhost:8080',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'X-Kuma-Revision'],
  maxAge: 86400,
});

  // ══════════════════════════════════════════════════
  //  🩺 HEALTH CHECK — before global prefix so it lives at /health
  //  (not /api/v1/health) so monitoring tools find it easily
  // ══════════════════════════════════════════════════
  const startedAt = Date.now();

  app.use('/health', (req: any, res: any) => {
    const uptimeMs = Date.now() - startedAt;
    const uptimeSec = Math.floor(uptimeMs / 1000);
    const uptimeMin = Math.floor(uptimeSec / 60);
    const uptimeHr = Math.floor(uptimeMin / 60);
    const uptimeDay = Math.floor(uptimeHr / 24);

    const mem = process.memoryUsage();

    res.status(200).json({
      status: 'ok',
      service: 'delivery-ethiopia-api',
      version: process.env.npm_package_version || '0.1.0',
      environment: process.env.NODE_ENV || 'production',
      timestamp: new Date().toISOString(),
      uptime: {
        seconds: uptimeSec,
        human: `${uptimeDay}d ${uptimeHr % 24}h ${uptimeMin % 60}m ${uptimeSec % 60}s`,
      },
      memory: {
        rss_mb: Math.round(mem.rss / 1024 / 1024),
        heap_used_mb: Math.round(mem.heapUsed / 1024 / 1024),
        heap_total_mb: Math.round(mem.heapTotal / 1024 / 1024),
      },
      node: process.version,
      pid: process.pid,
    });
  });

  // Also respond at /healthz (alternative common name)
  app.use('/healthz', (req: any, res: any) => res.redirect(307, '/health'));

  // ══════════════════════════════════════════════════
  //  STATIC FILES (uploads)
  // ══════════════════════════════════════════════════
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  // ══════════════════════════════════════════════════
  //  GLOBAL PREFIX — exclude health + uploads
  // ══════════════════════════════════════════════════
  app.setGlobalPrefix('api/v1', {
    exclude: [
      'health',
      'healthz',
      'uploads/(.*)',
    ],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = Number(process.env.PORT) || 3000;

  await app.listen(port, '0.0.0.0');

  const logger = new Logger('Bootstrap');

  if (process.env.RENDER || process.env.NODE_ENV === 'production') {
    logger.log(`🚀 API running on port ${port}`);
    logger.log(`🩺 Health:  http://localhost:${port}/health`);
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
  logger.log(`🖼️  Files:   http://localhost:${port}/uploads/...`);
  logger.log(`🩺 Health:  http://localhost:${port}/health`);
}

bootstrap();