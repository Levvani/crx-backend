// src/titles/dto/create-title.dto.ts
import { IsNotEmpty, IsString } from "class-validator";

export class CreateTitleDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  description: string;
}
