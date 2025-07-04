import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { BogApiService } from './bog-api.service';

@Injectable()
export class BogApiCronService {
  private readonly logger = new Logger(BogApiCronService.name);
  private isRunning = false; // Add execution lock

  constructor(
    private readonly bogApiService: BogApiService,
    private readonly configService: ConfigService,
  ) {}

  @Cron('0 * * * * *') // Run every minute
  async handleBogApiStatementCron() {
    if (this.isRunning) {
      this.logger.warn('Previous BOG API cron job is still running, skipping this execution');
      return;
    }
    await this.executeBogApiStatement();
  }

  // Manual trigger method for testing
  async triggerBogApiStatement() {
    this.logger.log('Manual trigger of BOG API statement job requested');
    if (this.isRunning) {
      this.logger.warn('BOG API job is already running, cannot trigger manually');
      return { success: false, error: 'Job already running' };
    }
    return await this.executeBogApiStatement();
  }

  private async executeBogApiStatement() {
    const startTime = new Date();
    this.isRunning = true; // Set lock
    try {
      this.logger.log(`[${startTime.toISOString()}] Starting BOG API statement cron job...`);

  

      // Get configuration from environment variables with defaults
      const accountNumber = this.configService.get<string>(
        'BOG_ACCOUNT_NUMBER',
        'GE40BG0000000498826082',
      );
      const currency = this.configService.get<string>('BOG_CURRENCY', 'GEL');

      this.logger.log(
        `[${startTime.toISOString()}] Fetching statement from, account: ${accountNumber}, currency: ${currency}`,
      );

      // Call the getStatement method
      const result = await this.bogApiService.getStatement(
        accountNumber,
        currency,

      );

      const recordCount = result?.length || 0; // Changed from result?.Records?.length || 0
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      this.logger.log(
        `[${endTime.toISOString()}] BOG API statement cron job completed successfully in ${duration}ms. Records processed: ${recordCount}`,
      );


      return {
        success: true,
        recordCount,
        duration: `${duration}ms`,
        timestamp: endTime.toISOString(),
      };
    } catch (error) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      this.logger.error(
        `[${endTime.toISOString()}] Error in BOG API statement cron job after ${duration}ms:`,
        error,
      );

      // Log additional error details for debugging
      if (error && typeof error === 'object' && 'response' in error) {
        const apiError = error as { response: { status: number; data: any } };
        this.logger.error(
          `[${endTime.toISOString()}] API Error Status: ${apiError.response.status}`,
        );
        this.logger.error(
          `[${endTime.toISOString()}] API Error Data: ${JSON.stringify(apiError.response.data)}`,
        );
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      return {
        success: false,
        error: errorMessage,
        duration: `${duration}ms`,
        timestamp: endTime.toISOString(),
      };
    } finally {
      this.isRunning = false; // Always release lock
    }
  }
}
