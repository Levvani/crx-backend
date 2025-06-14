import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { PasswordResetService } from './password-reset.service';
import { Public } from '../auth/decorators/public.decorator';
import { RequestResetDto, ResetPasswordDto } from './dto/password-reset.dto';

@Controller('password-reset')
export class PasswordResetController {
  constructor(private readonly passwordResetService: PasswordResetService) {}

  @Public()
  @Post('request')
  async requestReset(@Body() { email }: RequestResetDto): Promise<{ message: string }> {
    if (!email) {
      throw new BadRequestException('Email is required');
    }

    await this.passwordResetService.createPasswordResetToken(email);
    return {
      message: 'If an account exists with this email, a password reset link has been sent.',
    };
  }

  @Public()
  @Post('reset')
  async resetPassword(
    @Body() { token, newPassword }: ResetPasswordDto,
  ): Promise<{ message: string }> {
    if (!token || !newPassword) {
      throw new BadRequestException('Token and new password are required');
    }

    await this.passwordResetService.resetPassword(token, newPassword);
    return { message: 'Password has been successfully reset' };
  }
}
