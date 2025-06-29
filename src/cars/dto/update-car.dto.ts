import { IsString, IsNumber, Min, IsOptional, IsBoolean, IsEnum, IsArray } from 'class-validator';
import { CarStatus } from '../schemas/car.schema';

export class UpdateCarDto {
  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  vinCode?: string;

  @IsOptional()
  @IsString()
  carName?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  lotNumber?: string;

  @IsOptional()
  @IsString()
  auctionName?: string;

  @IsOptional()
  @IsString()
  dateOfPurchase?: string;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsString()
  shippingLine?: string;

  @IsOptional()
  @IsString()
  dateOfContainerOpening?: string;

  @IsOptional()
  @IsString()
  greenDate?: string;

  @IsOptional()
  @IsString()
  buyer?: string;

  @IsOptional()
  @IsString()
  buyerPN?: string;

  @IsOptional()
  @IsString()
  buyerPhone?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  auctionPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  transportationPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalCost?: number;

  @IsOptional()
  @IsString()
  containerNumber?: string;

  @IsOptional()
  @IsEnum(CarStatus)
  status?: CarStatus;

  @IsOptional()
  @IsBoolean()
  isHybridOrElectric?: boolean;

  @IsOptional()
  @IsBoolean()
  isOffsite?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  auctionFine?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  financingAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  paid?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  toBePaid?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  profit?: number;

  @IsOptional()
  @IsArray()
  photos?: string[];

  @IsOptional()
  @IsBoolean()
  isTaken?: boolean;

  @IsOptional()
  @IsBoolean()
  isOverized?: boolean;
}
