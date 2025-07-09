import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum CarStatus {
  PURCHASED = 'Purchased',
  GREEN = 'Green',
  IN_TRANSIT = 'In Transit',
}

export type CarDocument = Car & Document;

// Helper function to round to 2 decimal places
const roundToTwoDecimals = (value: number): number => {
  if (value == null || isNaN(value)) return value;
  return Math.round((value + Number.EPSILON) * 100) / 100;
};

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

  @Prop({ 
    required: false, 
    default: 0,
    set: roundToTwoDecimals
  })
  auctionPrice: number;

  @Prop({ 
    required: false, 
    default: 0,
    set: roundToTwoDecimals
  })
  transportationPrice: number;

  @Prop({ 
    required: false, 
    default: 0,
    set: roundToTwoDecimals
  })
  auctionPriceToPay: number;

  @Prop({ 
    required: false, 
    default: 0,
    set: roundToTwoDecimals
  })
  transPriceToPay: number;

  @Prop({ 
    required: false, 
    default: 0,
    set: roundToTwoDecimals
  })
  totalCost: number;

  @Prop({ required: false })
  containerNumber: string;

  @Prop({ required: false })
  bonusReceiver: string;

  @Prop({ 
    required: false, 
    default: 0,
    set: roundToTwoDecimals
  })
  bonusAmount: number;

  @Prop({ 
    required: false, 
    default: 0,
    set: roundToTwoDecimals
  })
  interestSum: number;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ required: false })
  status: CarStatus;

  @Prop({ required: false, default: false })
  isHybridOrElectric: boolean;

  @Prop({ required: false, default: false })
  isOffsite: boolean;

  @Prop({ 
    required: false, 
    default: 0,
    set: roundToTwoDecimals
  })
  auctionFine: number;

  @Prop({ 
    required: false, 
    default: 0,
    set: roundToTwoDecimals
  })
  financingAmount: number;

  @Prop({ 
    required: false, 
    default: 0,
    set: roundToTwoDecimals
  })
  paid: number;

  @Prop({ 
    required: false, 
    default: 0,
    set: roundToTwoDecimals
  })
  toBePaid: number;

  @Prop({ 
    required: false, 
    default: 0,
    set: roundToTwoDecimals
  })
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

  @Prop({ required: false })
  arrivalPort: string;

  @Prop({ required: false, default: false })
  iAuctionClosed: boolean;

  @Prop({ 
    required: false, 
    default: 0,
    set: roundToTwoDecimals
  })
  titlePrice: number;
}

export const CarSchema = SchemaFactory.createForClass(Car);
