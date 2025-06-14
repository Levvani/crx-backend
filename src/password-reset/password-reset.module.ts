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
      useFactory: async (configService: ConfigService) => {
        const config = {
          transport: {
            host: configService.get('SMTP_HOST'),
            port: configService.get('SMTP_PORT'),
            secure: configService.get('SMTP_SECURE') === 'true',
            auth: {
              user: configService.get('SMTP_USER'),
              pass: configService.get('SMTP_PASS'),
            },
            debug: true,
            logger: true,
          },
          defaults: {
            from: '"CRX Platform" <' + configService.get('SMTP_USER') + '>',
          },
        };
        console.log('Mailer configuration:', {
          host: config.transport.host,
          port: config.transport.port,
          secure: config.transport.secure,
          user: config.transport.auth.user,
          hasPass: !!config.transport.auth.pass,
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
