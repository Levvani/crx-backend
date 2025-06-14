// src/titles/dto/create-title.dto.ts
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateTitleDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description: string;
}
