import { IsNotEmpty, IsNumber, IsInt, Min } from 'class-validator';

export class TransferDto {
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  id: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  amount: number;
}
