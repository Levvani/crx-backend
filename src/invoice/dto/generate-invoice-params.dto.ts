import { Transform } from 'class-transformer';
import { IsNumber } from 'class-validator';

export class GenerateInvoiceParamsDto {
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber({}, { message: 'carId must be a valid number' })
  carId: number;
}
