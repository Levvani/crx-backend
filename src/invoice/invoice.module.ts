import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { InvoiceService } from "./invoice.service";
import { InvoiceController } from "./invoice.controller";
import * as mongoose from "mongoose";
import { CarsModule } from "../cars/cars.module";

// Counter schema for auto-incrementing invoice numbers
const CounterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

@Module({
  imports: [
    MongooseModule.forFeature([{ name: "Counter", schema: CounterSchema }]),
    CarsModule, // Import CarsModule to make CarsService available
  ],
  controllers: [InvoiceController],
  providers: [InvoiceService],
  exports: [InvoiceService],
})
export class InvoiceModule {}
