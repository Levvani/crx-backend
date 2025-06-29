import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CarsController } from './cars.controller';
import { CarsService } from './cars.service';
import { Car, CarSchema } from './schemas/car.schema';
import { UsersModule } from '../users/users.module';
import { SmsModule } from '../sms/sms.module';
import { PricesModule } from '../prices/prices.module';
import { AuthModule } from '../auth/auth.module';
import { StorageModule } from '../config/storage.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Car.name, schema: CarSchema }]),
    UsersModule,
    SmsModule,
    PricesModule,
    AuthModule,
    StorageModule,
  ],
  controllers: [CarsController],
  providers: [CarsService],
  exports: [CarsService],
})
export class CarsModule {}
