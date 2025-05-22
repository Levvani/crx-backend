import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Model } from "mongoose";

@Schema({ timestamps: true, strict: false })
export class Price extends Document {
  @Prop({ required: false, unique: true })
  id: number;

  @Prop({ required: true, unique: true })
  location: string;

  @Prop({ required: true })
  basePrice: number;

  @Prop({ required: true })
  upsellAmount: number;
}

export const PriceSchema = SchemaFactory.createForClass(Price);

// Add pre-save middleware to auto-increment the id
PriceSchema.pre("save", async function (next) {
  if (this.isNew) {
    const lastPrice = await (this.constructor as Model<Price>).findOne(
      {},
      {},
      { sort: { id: -1 } }
    );
    this.id = lastPrice ? (lastPrice.id as number) + 1 : 1;
  }
  next();
});
