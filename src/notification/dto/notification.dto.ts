import { IsBoolean, IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class NotificationDto {
  @IsBoolean()
  @IsNotEmpty()
  isOn: boolean;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsString()
  @IsOptional() // Image will be handled as file upload, so optional for validation
  image: string;
}
