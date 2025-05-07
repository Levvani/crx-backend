import {
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
  IsOptional,
  IsBoolean,
} from "class-validator";

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
  carName: string;

  @IsOptional()
  @IsString()
  location: string;

  @IsOptional()
  @IsString()
  lotNumber: string;

  @IsOptional()
  @IsString()
  auctionName: string;

  @IsOptional()
  @IsString()
  dateOfPurchase: string;

  @IsOptional()
  @IsString()
  comment: string;

  @IsOptional()
  @IsString()
  shippingLine: string;

  @IsOptional()
  @IsString()
  dateOfContainerOpening: string;

  @IsOptional()
  @IsString()
  greenDate: string;

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
  transportationPrice: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalCost: number;

  @IsOptional()
  @IsString()
  containerNumber: string;

  @IsOptional()
  @IsString()
  status: string;

  @IsOptional()
  @IsBoolean()
  isHybridOrElectric: boolean;

  @IsOptional()
  @IsBoolean()
  isOffsite: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  auctionFine: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  financingAmount: number;
}
