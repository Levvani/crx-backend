import { IsNotEmpty, IsNumber, IsOptional, IsString, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

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

  @IsOptional()
  @IsString()
  vinCode: string;

  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  amount: number;

  @IsOptional()
  @IsString()
  imageUrl: string;

  @IsOptional()
  @IsArray()
  imageUrls: string[];
}
