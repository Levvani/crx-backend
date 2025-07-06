import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Min } from 'class-validator';
import { Document } from 'mongoose';

export enum DamageStatus {
  PENDING = 'pending',
  REJECTED = 'rejected',
  APPROVED = 'approved',
}

export type DamageDocument = Damage & Document;

@Schema()
export class Damage {
  @Prop({ required: true, unique: true })
  damageID: number;

  @Prop({ required: true })
  carID: number;

  @Prop({ required: true })
  username: string;

  @Prop()
  vinCode: string;

  @Prop({ required: true })
  comment: string;

  @Prop({ required: true })
  @Min(0)
  amount: number;

  @Prop()
  @Min(0)
  approvedAmount: number;

  @Prop()
  imageUrl: string;

  @Prop({ type: [String], default: [] })
  imageUrls: string[];

  @Prop({ default: DamageStatus.PENDING })
  status: string;

  @Prop()
  approverComment: string;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const DamageSchema = SchemaFactory.createForClass(Damage);
