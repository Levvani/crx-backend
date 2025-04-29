import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CarDocument = Car & Document;

@Schema()
export class Car {
  @Prop({ required: false, unique: true })
  carID: number;
  @Prop({ required: true })
  username: string;

  @Prop({ required: true })
  vinCode: string;

  @Prop({ required: true })
  brand: string;

  @Prop({ required: true })
  model: string;

  @Prop({ required: true })
  year: number;

  @Prop({ required: false })
  km: number;

  @Prop({ required: false })
  lotNumber: string;

  @Prop({ required: false })
  auctionName: string;

  @Prop({ required: false })
  dateOfPurchase: Date;

  @Prop({ required: false })
  dateOfAuctionPayment: Date;

  @Prop({ required: false })
  dateOfStorageDelivery: Date;

  @Prop({ required: false })
  dateOfReceivingDocs: Date;

  @Prop({ required: false })
  sender: string;

  @Prop({ required: false })
  receiver: string;

  @Prop({ required: false })
  comment: string;

  @Prop({ required: false })
  shippingLine: string;

  @Prop({ required: false })
  dateOfContainerArrival: Date;

  @Prop({ required: false })
  dateOfContainerOpening: Date;

  @Prop({ required: false })
  greenDate: Date;

  @Prop({ required: false })
  buyer: string;

  @Prop({ required: false })
  buyerPN: string;

  @Prop({ required: false })
  buyerPhone: string;

  @Prop({ required: false })
  auctionPrice: number;

  @Prop({ required: false })
  amountToPay: number;

  @Prop({ required: false })
  totalAmountPaid: number;

  @Prop({ required: false })
  containerNumber: string;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ type: [String], default: [] })
  photos: string[];

  @Prop({ required: false })
  status: string;

  @Prop({ required: false, default: false })
  hybridElectric: boolean;

  @Prop({ required: false, default: false })
  offsite: boolean;

  @Prop({ required: false })
  fine: number;

  @Prop({ required: false })
  toBeFinanced: number;
}

export const CarSchema = SchemaFactory.createForClass(Car);
