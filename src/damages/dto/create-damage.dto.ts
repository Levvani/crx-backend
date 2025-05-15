import { IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";
import { Type } from "class-transformer";

export class CreateDamageDto {
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  carID: number;

  @IsOptional()
  @IsString()
  comment: string;

  @IsOptional()
  @IsString()
  username: string;

  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  amount: number;

  @IsOptional()
  @IsString()
  imageUrl: string;
}
