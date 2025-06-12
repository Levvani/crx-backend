import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { PricesService } from "./prices.service";
import { PricesController } from "./prices.controller";
import { Price, PriceSchema } from "./schemas/price.schema";
import { DealerType, DealerTypeSchema } from "./schemas/dealer-type.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Price.name, schema: PriceSchema },
      { name: DealerType.name, schema: DealerTypeSchema },
    ]),
  ],
  controllers: [PricesController],
  providers: [PricesService],
  exports: [PricesService],
})
export class PricesModule {}
