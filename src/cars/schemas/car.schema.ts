import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum CarStatus {
  PURCHASED = 'Purchased',
  GREEN = 'Green',
  IN_TRANSIT = 'In Transit',
}

export type CarDocument = Car & Document;

@Schema()
export class Car {
  @Prop({ required: false, unique: true })
  carID: number;
  @Prop({ required: true })
  username: string;

  @Prop({ required: true, unique: true })
  vinCode: string;

  @Prop({ required: true })
  carName: string;

  @Prop({ required: false })
  location: string;

  @Prop({ required: false })
  lotNumber: string;

  @Prop({ required: false })
  auctionName: string;

  @Prop({ required: false })
  dateOfPurchase: string;

  @Prop({ required: false })
  dateOfArrival: string;

  @Prop({ required: false })
  comment: string;

  @Prop({ required: false })
  shippingLine: string;

  @Prop({ required: false })
  dateOfContainerOpening: string;

  @Prop({ required: false })
  greenDate: string;

  @Prop({ required: false })
  buyer: string;

  @Prop({ required: false })
  buyerPN: string;

  @Prop({ required: false })
  buyerPhone: string;

  @Prop({ required: false, default: 0 })
  auctionPrice: number;

  @Prop({ required: false, default: 0 })
  transportationPrice: number;

  @Prop({ required: false, default: 0 })
  auctionPriceToPay: number;

  @Prop({ required: false, default: 0 })
  transPriceToPay: number;

  @Prop({ required: false, default: 0 })
  totalCost: number;

  @Prop({ required: false })
  containerNumber: string;

  @Prop({ required: false })
  bonusReceiver: string;

  @Prop({ required: false, default: 0 })
  bonusAmount: number;

  @Prop({ required: false, default: 0 })
  interestSum: number;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ required: false })
  status: CarStatus;

  @Prop({ required: false, default: false })
  isHybridOrElectric: boolean;

  @Prop({ required: false, default: false })
  isOffsite: boolean;

  @Prop({ required: false, default: 0 })
  auctionFine: number;

  @Prop({ required: false, default: 0 })
  financingAmount: number;

  @Prop({ required: false, default: 0 })
  paid: number;

  @Prop({ required: false, default: 0 })
  toBePaid: number;

  @Prop({ required: false, default: 0 })
  profit: number;

  @Prop({ type: [String], default: [] })
  photos: string[];

  @Prop({ required: false, default: false })
  isTaken: boolean;

  @Prop({ required: false, default: false })
  isTitleTaken: boolean;

  @Prop({ required: false, default: false })
  doubleRate: boolean;

  @Prop({ required: false, default: 0 })
  oversized: number;
}

export const CarSchema = SchemaFactory.createForClass(Car);
