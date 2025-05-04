import { Controller, Query, Get } from "@nestjs/common";
import { CopartService } from "./copart.service";

@Controller("copart")
export class CopartController {
  constructor(private readonly copartService: CopartService) {}

  @Get("carDetailsByLot")
  async getCarDetailsByLot(@Query("lotNumber") lotNumber: string) {
    return await this.copartService.getCarDetailsByLot(lotNumber);
  }
}
