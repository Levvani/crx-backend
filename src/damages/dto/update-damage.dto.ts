import { IsEnum, IsOptional, IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { DamageStatus } from '../schemas/damages.schema';

export class UpdateDamageDto {
  @IsEnum(DamageStatus)
  @IsOptional()
  status?: DamageStatus;

  @IsString()
  @IsOptional()
  approverComment?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  approvedAmount?: number;
}
