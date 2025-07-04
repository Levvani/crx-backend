import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PasswordReset, PasswordResetDocument } from './schemas/password-reset.schema';
import { UsersService } from '../users/users.service';
import { MailerService } from '@nestjs-modules/mailer';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';

class EmailServiceError extends Error {
  constructor(
    message: string,
    public readonly details?: any,
  ) {
    super(message);
    this.name = 'EmailServiceError';
  }
}

class SmtpConfigError extends EmailServiceError {
  constructor() {
    super('SMTP configuration is incomplete');
    this.name = 'SmtpConfigError';
  }
}

@Injectable()
export class PasswordResetService {
  constructor(
    @InjectModel(PasswordReset.name)
    private passwordResetModel: Model<PasswordResetDocument>,
    private usersService: UsersService,
    private mailerService: MailerService,
  ) {}

  private async sendEmailWithRetry(emailOptions: any, maxRetries = 3): Promise<void> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Email sending attempt ${attempt}/${maxRetries}`, {
          to: emailOptions.to,
          subject: emailOptions.subject,
          attempt,
          timestamp: new Date().toISOString(),
        });
        
        await this.mailerService.sendMail(emailOptions);
        
        console.log('Email sent successfully', {
          to: emailOptions.to,
          attempt,
          timestamp: new Date().toISOString(),
        });
        
        return; // Success, exit the retry loop
      } catch (error) {
        lastError = error as Error;
        
        console.error(`Email sending attempt ${attempt} failed:`, {
          error: lastError.message,
          code: (lastError as any).code,
          command: (lastError as any).command,
          to: emailOptions.to,
          attempt,
          timestamp: new Date().toISOString(),
        });
        
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt - 1) * 1000; // Exponential backoff
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // If we get here, all retries failed
    throw new EmailServiceError(
      `Failed to send email after ${maxRetries} attempts: ${lastError.message}`,
      lastError
    );
  }

  private validateSmtpConfiguration(): void {
    const requiredVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'FRONTEND_URL'];
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.error('SMTP configuration validation failed:', {
        missingVariables: missingVars,
        providedVariables: requiredVars.filter(varName => !!process.env[varName]),
        timestamp: new Date().toISOString(),
      });
      throw new SmtpConfigError();
    }
    
    console.log('SMTP configuration validated successfully', {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE,
      user: process.env.SMTP_USER,
      frontendUrl: process.env.FRONTEND_URL,
      timestamp: new Date().toISOString(),
    });
  }

  async createPasswordResetToken(email: string): Promise<void> {
    try {
      // Check if user exists
      const user = await this.usersService.findByEmail(email);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Generate reset token
      const token = randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1); // Token expires in 1 hour

      // Save reset token
      try {
        await this.passwordResetModel.create({
          email,
          token,
          expiresAt,
        });
        console.log('Password reset token created successfully', {
          email,
          expiresAt,
          timestamp: new Date().toISOString(),
        });
      } catch (dbError) {
        console.error('Failed to create password reset token in database:', {
          error: dbError,
          email,
          timestamp: new Date().toISOString(),
        });
        throw new InternalServerErrorException('Failed to process password reset request');
      }

      // Validate SMTP configuration
      this.validateSmtpConfiguration();

      // Prepare email options
      const emailOptions = {
        to: email,
        subject: 'Password Reset Request - CRX Platform',
        headers: {
          'X-Priority': '1',
          'X-MSMail-Priority': 'High',
          Importance: 'high',
          'List-Unsubscribe': `<${process.env.FRONTEND_URL}/unsubscribe>`,
          'X-Report-Abuse': `${process.env.FRONTEND_URL}/report-abuse`,
          'Feedback-ID': 'password-reset:crx-platform',
        },
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Password Reset Request</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
              .container { background: #f9f9f9; border-radius: 5px; padding: 20px; border: 1px solid #ddd; }
              .button { display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 15px 0; font-weight: bold; }
              .button:hover { background-color: #0056b3; }
              .footer { margin-top: 20px; font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 15px; }
              .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; border-radius: 4px; margin: 15px 0; color: #856404; }
            </style>
          </head>
          <body>
            <div class="container">
              <h2>Password Reset Request</h2>
              <p>Hello,</p>
              <p>We received a request to reset the password for your CRX Platform account associated with this email address.</p>
              <p>To reset your password, click the button below:</p>
              <a href="${process.env.FRONTEND_URL}/reset-password?token=${token}" class="button">Reset Password</a>
              <div class="warning">
                <strong>Important:</strong> This link will expire in 1 hour for security reasons.
              </div>
              <p>If you didn't request this password reset, please ignore this email or contact our support team if you have concerns about your account security.</p>
              <p>For your security, please do not share this link with anyone.</p>
              <div class="footer">
                <p>This is an automated message, please do not reply to this email.</p>
                <p><strong>CRX Platform Security Team</strong></p>
                <p>If you need assistance, please contact our support team.</p>
              </div>
            </div>
          </body>
          </html>
        `,
      };

      // Send reset email with retry logic
      try {
        await this.sendEmailWithRetry(emailOptions);
        console.log('Password reset email sent successfully', {
          email,
          timestamp: new Date().toISOString(),
        });
      } catch (emailError) {
        console.error('Failed to send password reset email after all retries:', {
          error: emailError,
          email,
          timestamp: new Date().toISOString(),
        });
        throw emailError;
      }
    } catch (error) {
      console.error('Error in createPasswordResetToken:', {
        error: (error as Error).message,
        type: (error as Error).name,
        stack: (error as Error).stack,
        timestamp: new Date().toISOString(),
        email: email,
      });

      // Rethrow specific errors that should be handled by the controller
      if (
        error instanceof NotFoundException ||
        error instanceof SmtpConfigError ||
        error instanceof EmailServiceError ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }

      // For any other unexpected errors, throw a generic error
      throw new InternalServerErrorException(
        'An unexpected error occurred while processing your request',
      );
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      // Find valid reset token
      const resetRequest = await this.passwordResetModel.findOne({
        token,
        used: false,
        expiresAt: { $gt: new Date() },
      });

      if (!resetRequest) {
        throw new BadRequestException('Invalid or expired reset token');
      }

      // Hash new password
      let hashedPassword: string;
      try {
        const salt = await bcrypt.genSalt();
        hashedPassword = await bcrypt.hash(newPassword, salt);
      } catch (hashError) {
        console.error('Failed to hash new password:', {
          error: hashError as Error,
          timestamp: new Date().toISOString(),
        });
        throw new InternalServerErrorException('Failed to process password reset');
      }

      // Update user's password
      try {
        const user = await this.usersService.findByEmail(resetRequest.email);
        await this.usersService.updatePassword(Number(user.id), hashedPassword);
      } catch (userError) {
        console.error('Failed to update user password:', {
          error: userError as Error,
          email: resetRequest.email,
          timestamp: new Date().toISOString(),
        });
        throw new InternalServerErrorException('Failed to update password');
      }

      // Mark token as used
      try {
        resetRequest.used = true;
        await resetRequest.save();
      } catch (tokenError) {
        console.error('Failed to mark reset token as used:', {
          error: tokenError as Error,
          token: token,
          email: resetRequest.email,
          timestamp: new Date().toISOString(),
        });
        // Don't throw here since password was already updated
        // but log the error for monitoring
      }
    } catch (error) {
      console.error('Error in resetPassword:', {
        error: (error as Error).message,
        type: (error as Error).name,
        token: token,
        timestamp: new Date().toISOString(),
      });

      if (error instanceof BadRequestException || error instanceof InternalServerErrorException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'An unexpected error occurred while resetting your password',
      );
    }
  }
}
