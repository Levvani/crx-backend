import { Controller, Query, Get, HttpException, HttpStatus } from '@nestjs/common';
import { CopartService } from './copart.service';

@Controller('copart')
export class CopartController {
  private isProcessing = false;
  private requestQueue: Array<{
    lotNumber: string;
    resolve: (value: any) => void;
    reject: (reason: any) => void;
  }> = [];

  constructor(private readonly copartService: CopartService) {}

  @Get('health')
  async healthCheck() {
    try {
      const isHealthy = await this.copartService.testBrowserConnection();
      return {
        status: 'ok',
        playwright: isHealthy ? 'working' : 'failed',
        timestamp: new Date().toISOString(),
        isProcessing: this.isProcessing,
        queueLength: this.requestQueue.length,
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

  @Get('carDetailsByLot')
  async getCarDetailsByLot(@Query('lotNumber') lotNumber: string) {
    try {
      if (!lotNumber) {
        throw new HttpException('lotNumber query parameter is required', HttpStatus.BAD_REQUEST);
      }

      // Queue requests to prevent concurrent browser operations
      if (this.isProcessing) {
        console.log(`🔄 Request for lot ${lotNumber} queued - another request is processing`);
        return new Promise((resolve, reject) => {
          this.requestQueue.push({ lotNumber, resolve, reject });

          // Set a timeout for queued requests
          setTimeout(() => {
            const index = this.requestQueue.findIndex((req) => req.lotNumber === lotNumber);
            if (index !== -1) {
              this.requestQueue.splice(index, 1);
              reject(
                new HttpException(
                  'Request timeout - too many concurrent requests',
                  HttpStatus.REQUEST_TIMEOUT,
                ),
              );
            }
          }, 30000); // 30 second timeout
        });
      }

      return await this.processRequest(lotNumber);
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
        throw new HttpException('Request timed out. Please try again.', HttpStatus.REQUEST_TIMEOUT);
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

  private async processRequest(lotNumber: string) {
    this.isProcessing = true;
    try {
      console.log(`🔍 Processing request for lot: ${lotNumber}`);
      const result = await this.copartService.getCarDetailsByLot(lotNumber);
      console.log(`✅ Successfully processed request for lot: ${lotNumber}`);
      return result;
    } finally {
      this.isProcessing = false;

      // Process next item in queue
      if (this.requestQueue.length > 0) {
        const nextRequest = this.requestQueue.shift();
        if (nextRequest) {
          console.log(`🔄 Processing queued request for lot: ${nextRequest.lotNumber}`);
          this.processRequest(nextRequest.lotNumber)
            .then((result: any) => nextRequest.resolve(result))
            .catch((error: any) => nextRequest.reject(error));
        }
      }
    }
  }
}
