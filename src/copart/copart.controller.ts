import { Controller, Post, Body } from "@nestjs/common";
import { CopartService } from "./copart.service";
import { CarDetailsDto } from "./dto/car-details.dto";

@Controller("copart")
export class CopartController {
  constructor(private readonly copartService: CopartService) {}

  @Post("carDetailsByLot")
  async getCarDetailsByLot(@Body() carDetailsDto: CarDetailsDto) {
    return await this.copartService.getCarDetailsByLot(carDetailsDto.lotNumber);
  }
}
