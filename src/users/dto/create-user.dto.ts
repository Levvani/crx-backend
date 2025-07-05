// src/users/dto/create-user.dto.ts
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  IsNumber,
  Min,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UserRole } from '../schemas/user.schema';

export class PersonalContactDto {
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @IsNotEmpty()
  @IsString()
  lastName: string;

  @IsNotEmpty()
  @IsString()
  phoneNumber: string;
}

export class CreateUserDto {
  @IsOptional()
  @IsNumber()
  userID?: number;

  @IsNotEmpty()
  @IsString()
  username: string;
  @IsNotEmpty()
  @IsString()
  firstname: string;

  @IsNotEmpty()
  @IsString()
  lastname: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsString()
  level?: string;

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
