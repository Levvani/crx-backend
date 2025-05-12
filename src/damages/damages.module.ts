import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { DamagesController } from "./damages.controller";
import { DamagesService } from "./damages.service";
import { Damage, DamageSchema } from "./schemas/damages.schema";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Damage.name, schema: DamageSchema }]),
  ],
  controllers: [DamagesController],
  providers: [DamagesService],
  exports: [DamagesService],
})
export class DamagesModule {}
