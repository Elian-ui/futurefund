import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const corsOrigins = (
    process.env.CORS_ORIGINS ??
    process.env.FRONTEND_ORIGIN ??
    'http://localhost:3001,http://localhost:3000,http://localhost:5173'
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.use((req: any, res: any, next: () => void) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    next();
  });

  app.use('/auth', (req: any, res: any, next: () => void) => {
    const windowMs = Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS ?? 60_000);
    const max = Number(process.env.AUTH_RATE_LIMIT_MAX ?? 20);
    const key = `${req.ip}:${req.path}`;
    const now = Date.now();
    const entry = rateLimitStore.get(key);

    if (!entry || entry.resetAt <= now) {
      rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (entry.count >= max) {
      res.status(429).json({ message: 'Too many auth requests. Try again shortly.' });
      return;
    }

    entry.count += 1;
    next();
  });

  app.enableCors({
    origin: corsOrigins,
  });
  await app.listen(process.env.PORT ?? 4000);
}
bootstrap();
