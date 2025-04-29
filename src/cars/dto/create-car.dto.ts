import {
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
  Max,
  IsOptional,
  IsDate,
} from 'class-validator';

export class CreateCarDto {
  @IsOptional()
  @IsNumber()
  carID: number;

  @IsNotEmpty()
  @IsString()
  username: string;

  @IsNotEmpty()
  @IsString()
  vinCode: string;

  @IsNotEmpty()
  @IsString()
  brand: string;

  @IsNotEmpty()
  @IsString()
  model: string;

  @IsNotEmpty()
  @IsNumber()
  @Max(new Date().getFullYear() + 1)
  year: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  km: number;

  @IsOptional()
  @IsString()
  lotNumber: string;

  @IsOptional()
  @IsString()
  auctionName: string;

  @IsOptional()
  @IsDate()
  dateOfPurchase: Date;

  @IsOptional()
  @IsDate()
  dateOfAuctionPayment: Date;

  @IsOptional()
  @IsDate()
  dateOfStorageDelivery: Date;

  @IsOptional()
  @IsDate()
  dateOfReceivingDocs: Date;

  @IsOptional()
  @IsString()
  sender: string;

  @IsOptional()
  @IsString()
  receiver: string;

  @IsOptional()
  @IsString()
  comment: string;

  @IsOptional()
  @IsString()
  shippingLine: string;

  @IsOptional()
  @IsDate()
  dateOfContainerArrival: Date;

  @IsOptional()
  @IsDate()
  dateOfContainerOpening: Date;

  @IsOptional()
  @IsDate()
  greenDate: Date;

  @IsOptional()
  @IsString()
  buyer: string;

  @IsOptional()
  @IsString()
  buyerPN: string;

  @IsOptional()
  @IsString()
  buyerPhone: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  auctionPrice: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amountToPay: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalAmountPaid: number;

  @IsOptional()
  @IsString()
  containerNumber: string;

  @IsOptional()
  @IsString()
  status: string;

  @IsOptional()
  hybridElectric: boolean;

  @IsOptional()
  offsite: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  fine: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  toBeFinanced: number;
}
