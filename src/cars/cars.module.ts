import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { CarsController } from "./cars.controller";
import { CarsService } from "./cars.service";
import { Car, CarSchema } from "./schemas/car.schema";
import { UsersModule } from "../users/users.module";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Car.name, schema: CarSchema }]),
    UsersModule,
  ],
  controllers: [CarsController],
  providers: [CarsService],
  exports: [CarsService],
})
export class CarsModule {}
