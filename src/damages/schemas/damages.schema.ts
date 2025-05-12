import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type DamageDocument = Damage & Document;

@Schema()
export class Damage {
  @Prop({ required: true, unique: true })
  damageID: number;

  @Prop({ required: true })
  carID: number;

  @Prop({ required: true })
  username: string;

  @Prop({ required: true })
  comment: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ default: false })
  isApproved: boolean;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const DamageSchema = SchemaFactory.createForClass(Damage);
