import { IsString, IsNumber, IsNotEmpty, IsOptional } from "class-validator";

export class CreatePriceDto {
  @IsString()
  @IsNotEmpty()
  location: string;

  @IsNumber()
  @IsOptional()
  basePrice: number;

  @IsNumber()
  @IsOptional()
  upsellAmount: number;
}
