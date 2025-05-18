// src/titles/dto/update-title.dto.ts
import { IsOptional, IsString } from "class-validator";

export class UpdateTitleDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
