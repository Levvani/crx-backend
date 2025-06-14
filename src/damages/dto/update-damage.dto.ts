import { IsEnum, IsOptional, IsString } from 'class-validator';
import { DamageStatus } from '../schemas/damages.schema';

export class UpdateDamageDto {
  @IsEnum(DamageStatus)
  @IsOptional()
  status?: DamageStatus;

  @IsString()
  @IsOptional()
  approverComment?: string;
}
