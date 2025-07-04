import { Controller, Get, Post, Query } from '@nestjs/common';
import { BogApiService } from './bog-api.service';
import { BogApiCronService } from './bog-api-cron.service';

@Controller('bog-api')
export class BogApiController {
  constructor(
    private readonly bogApiService: BogApiService,
    private readonly bogApiCronService: BogApiCronService,
  ) {}

  @Get('getStatement')
  async getStatement(
    @Query('accountNumber') accountNumber?: string,
    @Query('currency') currency?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<any> {
    return this.bogApiService.getStatement(accountNumber, currency);
  }

  @Post('trigger-cron')
  async triggerCron(): Promise<any> {
    return this.bogApiCronService.triggerBogApiStatement();
  }
}
