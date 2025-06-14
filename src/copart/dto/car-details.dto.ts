import { IsNotEmpty, IsString } from 'class-validator';

export class CarDetailsDto {
  @IsNotEmpty()
  @IsString()
  lotNumber: string;
}
