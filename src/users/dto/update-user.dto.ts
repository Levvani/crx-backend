import { IsEmail, IsOptional, IsString, MinLength, IsNumber, IsBoolean, Min, ValidateNested, IsObject, IsArray, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';

export class PersonalContactDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsString()
  phoneNumber: string;
}

export class NotificationUpdateDto {
  @IsNumber()
  id: number;

  @IsBoolean()
  isRead: boolean;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  createTime?: Date;

  @IsOptional()
  seenTime?: Date | null;
}

export class DealerUpdateDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NotificationUpdateDto)
  notifications?: NotificationUpdateDto[];
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  firstname?: string;

  @IsOptional()
  @IsString()
  lastname?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  level?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalBalance?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  profitBalance?: number;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  personalManager?: PersonalContactDto | string;

  @IsOptional()
  personalExpert?: PersonalContactDto | string;

  @IsOptional()
  notifications?: Array<{
    id: number;
    isRead: boolean;
    message: string;
    createTime: Date;
    seenTime: Date | null;
  }>;
}
