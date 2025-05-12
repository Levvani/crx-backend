import { IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

export class CreateDamageDto {
  @IsNotEmpty()
  @IsNumber()
  carID: number;

  @IsOptional()
  @IsString()
  comment: string;

  @IsOptional()
  @IsString()
  username: string;

  @IsNotEmpty()
  @IsNumber()
  amount: number;
}
