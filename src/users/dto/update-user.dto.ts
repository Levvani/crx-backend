import { IsEmail, IsOptional, IsString, MinLength, IsNumber, IsBoolean, Min } from 'class-validator';

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
  @IsString()
  personalManager?: string;

  @IsOptional()
  @IsString()
  personalExpert?: string;

  @IsOptional()
  notifications?: Array<{
    id: number;
    isRead: boolean;
    message: string;
    createTime: Date;
    seenTime: Date | null;
  }>;
}
