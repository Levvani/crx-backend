import { IsString, IsNumber, IsNotEmpty } from 'class-validator';

export class AddDynamicKeyDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @IsNotEmpty()
  amount: number;
}
