import { IsOptional, IsInt, Min, Max, IsString, IsEnum } from "class-validator";
import { Type, Transform } from "class-transformer";
import { UserRole } from "../schemas/user.schema";

export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 25;

  @IsOptional()
  @IsEnum(UserRole)
  @Transform(({ value }) => {
    if (typeof value === "string") {
      return value.toLowerCase() as UserRole;
    }
    return value as UserRole;
  })
  role?: UserRole;

  @IsOptional()
  @IsString()
  level?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
