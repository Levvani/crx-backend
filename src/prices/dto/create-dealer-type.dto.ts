import { IsString, IsNumber } from 'class-validator';

export class CreateDealerTypeDto {
  @IsString()
  name: string;

  @IsNumber()
  amount: number;
}
