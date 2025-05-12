import { IsBoolean } from "class-validator";

export class UpdateDamageDto {
  @IsBoolean()
  isApproved: boolean;
}
