// src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { RolesGuard } from './auth/guards/roles.guard';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    logger.log('Initializing NestJS application...');
    const app = await NestFactory.create(AppModule);

    // Add cookie parser middleware FIRST
    logger.log('Setting up cookie parser...');
    app.use(cookieParser());

    // Configure CORS
    const corsOptions: CorsOptions = {
      origin: [process.env.FRONTEND_URL, 'http://localhost:4200'].filter(Boolean),
      credentials: true,
    };
    logger.log('Configuring CORS...');
    app.enableCors(corsOptions);

    // Apply global validation pipe
    logger.log('Applying global validation pipe...');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    const reflector = app.get(Reflector);
    app.useGlobalGuards(new RolesGuard(reflector));

    const port = process.env.PORT || 3000;
    logger.log(`Starting server on port ${port}...`);

    await app.listen(port, '0.0.0.0');
    logger.log(`Application is running on: ${await app.getUrl()}`);
  } catch (error) {
    logger.error(
      `Failed to bootstrap application: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error instanceof Error ? error.stack : 'No stack trace available',
    );
    process.exit(1);
  }
}

bootstrap().catch((error) => {
  console.error('Unhandled exception during bootstrap:', error);
  process.exit(1);
});
