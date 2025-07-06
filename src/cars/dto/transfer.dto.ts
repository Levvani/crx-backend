import { IsNotEmpty, IsNumber, IsInt, Min, IsIn } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class TransferDto {
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    const num = Number(value);
    return isNaN(num) ? undefined : num;
  })
  id: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    const num = Number(value);
    return isNaN(num) ? undefined : num;
  })
  amount: number;

  @IsNotEmpty()
  @IsInt()
  @IsIn([1, 2], { message: 'Transfer type must be 1 (auction) or 2 (transportation)' })
  @Type(() => Number)
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    const num = Number(value);
    return isNaN(num) ? undefined : num;
  })
  transferType: number;
}
