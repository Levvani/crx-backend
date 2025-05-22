import { IsString, IsNumber, IsNotEmpty } from "class-validator";

export class CreatePriceDto {
  @IsString()
  @IsNotEmpty()
  location: string;

  @IsNumber()
  @IsNotEmpty()
  basePrice: number;

  @IsNumber()
  @IsNotEmpty()
  upsellAmount: number;
}
