import { Controller, Get, Query } from '@nestjs/common';
import { IaaIService } from './iaai.service';

@Controller('iaai')
export class IaaIController {
  constructor(private readonly iaaiService: IaaIService) {}

  @Get('carDetailsByLot')
  async getCarDetailsByLot(@Query('lotNumber') lotNumber: string) {
    return this.iaaiService.getDetailsBySalvageId(lotNumber);
  }
}
