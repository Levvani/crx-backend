import { IsString, IsNumber, IsOptional, IsIn } from 'class-validator';

export class GenerateInvoiceBodyDto {
  @IsString()
  @IsIn(['transportation', 'car'], {
    message: 'Type must be either "transportation" or "car"',
  })
  type: string;

  @IsOptional()
  @IsNumber()
  amount?: number;
}
