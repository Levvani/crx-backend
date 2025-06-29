import { Controller, Query, Get, HttpException, HttpStatus } from '@nestjs/common';
import { CopartService } from './copart.service';
import { Public } from 'src/auth/decorators/public.decorator';

@Controller('copart')
export class CopartController {
  constructor(private readonly copartService: CopartService) {}
  @Public()
  @Get('health')
  async healthCheck() {
    try {
      const isHealthy = await this.copartService.testBrowserConnection();
      return {
        status: 'ok',
        playwright: isHealthy ? 'working' : 'failed',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Browser health check failed:', errorMessage);
      return {
        status: 'error',
        playwright: 'failed',
        error: errorMessage,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Public()
  @Get('carDetailsByLot')
  async getCarDetailsByLot(@Query('lotNumber') lotNumber: string) {
    try {
      if (!lotNumber) {
        throw new HttpException('lotNumber query parameter is required', HttpStatus.BAD_REQUEST);
      }
      
      console.log(`🔍 Fetching car details for lot: ${lotNumber}`);
      const result = await this.copartService.getCarDetailsByLot(lotNumber);
      console.log(`✅ Successfully fetched car details for lot: ${lotNumber}`);
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ Error in carDetailsByLot endpoint for lot ${lotNumber}:`, errorMessage);
      console.error('Full error stack:', error instanceof Error ? error.stack : 'No stack trace');
      
      // Provide more specific error messages based on the error type
      if (errorMessage.includes('browserType.launch')) {
        throw new HttpException(
          'Browser initialization failed. Please contact support.',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      } else if (errorMessage.includes('timeout')) {
        throw new HttpException(
          'Request timed out. Please try again.',
          HttpStatus.REQUEST_TIMEOUT,
        );
      } else if (errorMessage.includes('network')) {
        throw new HttpException(
          'Network error occurred. Please try again later.',
          HttpStatus.BAD_GATEWAY,
        );
      }
      
      throw new HttpException(
        'Failed to fetch car details. Please try again later.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
