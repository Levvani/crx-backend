import { IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdatePriceDto {
  @IsNumber()
  @IsOptional()
  basePrice?: number;

  @IsNumber()
  @IsOptional()
  upsellAmount?: number;

  @IsOptional()
  @IsString()
  location?: string;
  // Allow any additional dynamic properties (dealer types)
  @IsString()
  key: any;
}
