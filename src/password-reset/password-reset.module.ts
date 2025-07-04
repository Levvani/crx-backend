import { Module } from '@nestjs/common';
import { PasswordResetService } from './password-reset.service';
import { PasswordResetController } from './password-reset.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { PasswordReset, PasswordResetSchema } from './schemas/password-reset.schema';
import { UsersModule } from '../users/users.module';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: PasswordReset.name, schema: PasswordResetSchema }]),
    UsersModule,
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const port = configService.get<number>('SMTP_PORT');
        const isSecure = configService.get<string>('SMTP_SECURE') === 'true';
        
        const config = {
          transport: {
            host: configService.get<string>('SMTP_HOST'),
            port: port,
            secure: isSecure, // true for 465, false for other ports
            requireTLS: !isSecure, // Force TLS when not using secure connection
            auth: {
              user: configService.get<string>('SMTP_USER'),
              pass: configService.get<string>('SMTP_PASS'),
            },
            tls: {
              // Accept self-signed certificates (for development)
              rejectUnauthorized: configService.get<string>('NODE_ENV') === 'production',
              // Minimum TLS version
              minVersion: 'TLSv1.2',
              // Allow specific ciphers for better compatibility
              ciphers: 'HIGH:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!MD5:!PSK:!SRP:!CAMELLIA'
            },
            // Add connection timeout
            connectionTimeout: 60000,
            socketTimeout: 60000,
            // Additional options for better compatibility
            pool: true,
            maxConnections: 5,
            maxMessages: 100,
            debug: configService.get<string>('NODE_ENV') !== 'production',
            logger: configService.get<string>('NODE_ENV') !== 'production',
          },
          defaults: {
            from: '"CRX Platform" <' + configService.get('SMTP_USER') + '>',
          },
        };
        
        console.log('Mailer configuration:', {
          host: config.transport.host,
          port: config.transport.port,
          secure: config.transport.secure,
          requireTLS: config.transport.requireTLS,
          user: config.transport.auth.user,
          hasPass: !!config.transport.auth.pass,
          nodeEnv: configService.get<string>('NODE_ENV'),
        });
        
        return config;
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [PasswordResetController],
  providers: [PasswordResetService],
})
export class PasswordResetModule {}
