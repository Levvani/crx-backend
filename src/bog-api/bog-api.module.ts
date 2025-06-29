import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { BogApiService } from './bog-api.service';
import { BogApiController } from './bog-api.controller';
import { BogApiCronService } from './bog-api-cron.service';
import { Car, CarSchema } from '../cars/schemas/car.schema';
import { CarsModule } from '../cars/cars.module';
import { UsersModule } from '../users/users.module';
import { ProcessedEntry, ProcessedEntrySchema } from './schemas/processed-entry.schema';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    MongooseModule.forFeature([
      { name: Car.name, schema: CarSchema },
      { name: ProcessedEntry.name, schema: ProcessedEntrySchema },
    ]),
    CarsModule,
    UsersModule,
  ],
  controllers: [BogApiController],
  providers: [BogApiService, BogApiCronService],
  exports: [BogApiService],
})
export class BogApiModule {}
