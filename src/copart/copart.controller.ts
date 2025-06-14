import { Controller, Query, Get, HttpException, HttpStatus } from '@nestjs/common';
import { CopartService } from './copart.service';

@Controller('copart')
export class CopartController {
  constructor(private readonly copartService: CopartService) {}

  @Get('carDetailsByLot')
  async getCarDetailsByLot(@Query('lotNumber') lotNumber: string) {
    try {
      if (!lotNumber) {
        throw new HttpException('lotNumber query parameter is required', HttpStatus.BAD_REQUEST);
      }
      return await this.copartService.getCarDetailsByLot(lotNumber);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Error in carDetailsByLot endpoint: ${errorMessage}`);
      throw new HttpException(
        'Failed to fetch car details. Please try again later.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
