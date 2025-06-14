import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DamagesController } from './damages.controller';
import { DamagesService } from './damages.service';
import { Damage, DamageSchema } from './schemas/damages.schema';
import { UsersModule } from 'src/users/users.module';
import { CarsModule } from 'src/cars/cars.module';
import { StorageModule } from 'src/config/storage.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Damage.name, schema: DamageSchema }]),
    UsersModule,
    CarsModule,
    StorageModule,
  ],
  controllers: [DamagesController],
  providers: [DamagesService],
  exports: [DamagesService],
})
export class DamagesModule {}
