// src/app.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { CarsModule } from './cars/cars.module';
import { PasswordResetModule } from './password-reset/password-reset.module';
import { FileUploadModule } from './file-upload/file-upload.module';
import { CopartModule } from './copart/copart.module';
import { SmsModule } from './sms/sms.module';
import { DamagesModule } from './damages/damages.module';
import { InvoiceModule } from './invoice/invoice.module';
import { IaaIModule } from './IAAI/iaai.module';
import { StorageModule } from './config/storage.module';
import { TitlesModule } from './titles/titles.module';
import { PricesModule } from './prices/prices.module';
import { BogApiModule } from './bog-api/bog-api.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    ScheduleModule.forRoot(),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),
    UsersModule,
    AuthModule,
    CarsModule,
    PasswordResetModule,
    FileUploadModule,
    CopartModule,
    SmsModule,
    DamagesModule,
    InvoiceModule,
    IaaIModule,
    StorageModule,
    TitlesModule,
    PricesModule,
    BogApiModule,
  ],
})
export class AppModule {}
