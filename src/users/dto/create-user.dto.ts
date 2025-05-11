// src/users/dto/create-user.dto.ts
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  IsNumber,
} from "class-validator";
import { UserRole } from "../schemas/user.schema";

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
  totalBalance?: number;

  @IsOptional()
  @IsNumber()
  profitBalance?: number;

  @IsOptional()
  @IsString()
  phoneNumber?: string;
}
