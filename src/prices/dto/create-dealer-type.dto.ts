import { IsString, IsNumber, IsOptional, IsBoolean } from 'class-validator';

export class CreateDealerTypeDto {
  @IsString()
  name: string;

  @IsNumber()
  amount: number;
}
