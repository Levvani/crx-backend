import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { BogApiService } from './bog-api.service';

@Injectable()
export class BogApiCronService {
  private readonly logger = new Logger(BogApiCronService.name);

  constructor(
    private readonly bogApiService: BogApiService,
    private readonly configService: ConfigService,
  ) {}

  @Cron('0 */10 * * * *') // Run every 10 minutes
  async handleBogApiStatementCron() {
    await this.executeBogApiStatement();
  }

  // Manual trigger method for testing
  async triggerBogApiStatement() {
    this.logger.log('Manual trigger of BOG API statement job requested');
    return await this.executeBogApiStatement();
  }

  private async executeBogApiStatement() {
    const startTime = new Date();
    try {
      this.logger.log(`[${startTime.toISOString()}] Starting BOG API statement cron job...`);

      // Get current date in YYYY-MM-DD format
      const currentDate = new Date().toISOString().split('T')[0];

      // Get previous day in YYYY-MM-DD format
      const previousDate = new Date();
      previousDate.setDate(previousDate.getDate() - 1);
      const previousDateString = previousDate.toISOString().split('T')[0];

      // Get configuration from environment variables with defaults
      const accountNumber = this.configService.get<string>(
        'BOG_ACCOUNT_NUMBER',
        'GE40BG0000000498826082',
      );
      const currency = this.configService.get<string>('BOG_CURRENCY', 'USD');

      this.logger.log(
        `[${startTime.toISOString()}] Fetching statement from ${previousDateString} to ${currentDate}, account: ${accountNumber}, currency: ${currency}`,
      );

      // Call the getStatement method with previous day as startDate and current day as endDate
      const result = await this.bogApiService.getStatement(
        accountNumber,
        currency,
        previousDateString, // startDate - day before current day
        currentDate, // endDate - current day
      );

      const recordCount = result?.Records?.length || 0;
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      this.logger.log(
        `[${endTime.toISOString()}] BOG API statement cron job completed successfully in ${duration}ms. Records processed: ${recordCount}`,
      );

      if (recordCount > 0) {
        this.logger.log(
          `[${endTime.toISOString()}] Processed ${recordCount} statement records from ${previousDateString} to ${currentDate}`,
        );
      }

      return {
        success: true,
        recordCount,
        startDate: previousDateString,
        endDate: currentDate,
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
    }
  }
}
