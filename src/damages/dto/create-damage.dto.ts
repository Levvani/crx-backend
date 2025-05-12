import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class CreateDamageDto {
  @IsNotEmpty()
  @IsNumber()
  carID: number;

  @IsNotEmpty()
  @IsString()
  comment: string;

  @IsNotEmpty()
  @IsString()
  username: string;

  @IsNotEmpty()
  @IsNumber()
  amount: number;
}
