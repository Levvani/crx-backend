import { IsNumber, IsOptional } from 'class-validator';

export class UpdatePriceDto {
  @IsNumber()
  @IsOptional()
  basePrice?: number;

  @IsNumber()
  @IsOptional()
  upsellAmount?: number;
}
