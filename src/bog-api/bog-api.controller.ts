import { Controller, Get, Query } from '@nestjs/common';
import { BogApiService } from './bog-api.service';

@Controller('bog-api')
export class BogApiController {
  constructor(private readonly bogApiService: BogApiService) {}

  @Get('getStatement')
  async getStatement(
    @Query('accountNumber') accountNumber?: string,
    @Query('currency') currency?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<any> {
    return this.bogApiService.getStatement(accountNumber, currency, startDate, endDate);
  }
}
