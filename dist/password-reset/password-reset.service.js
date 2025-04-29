"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PasswordResetService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const password_reset_schema_1 = require("./schemas/password-reset.schema");
const users_service_1 = require("../users/users.service");
const mailer_1 = require("@nestjs-modules/mailer");
const crypto_1 = require("crypto");
const bcrypt = require("bcrypt");
class EmailServiceError extends Error {
    constructor(message, details) {
        super(message);
        this.details = details;
        this.name = 'EmailServiceError';
    }
}
class SmtpConfigError extends EmailServiceError {
    constructor() {
        super('SMTP configuration is incomplete');
        this.name = 'SmtpConfigError';
    }
}
let PasswordResetService = class PasswordResetService {
    constructor(passwordResetModel, usersService, mailerService) {
        this.passwordResetModel = passwordResetModel;
        this.usersService = usersService;
        this.mailerService = mailerService;
    }
    async createPasswordResetToken(email) {
        try {
            const user = await this.usersService.findByEmail(email);
            if (!user) {
                throw new common_1.NotFoundException('User not found');
            }
            const token = (0, crypto_1.randomBytes)(32).toString('hex');
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 1);
            try {
                await this.passwordResetModel.create({
                    email,
                    token,
                    expiresAt,
                });
            }
            catch (dbError) {
                console.error('Failed to create password reset token in database:', dbError);
                throw new common_1.InternalServerErrorException('Failed to process password reset request');
            }
            if (!process.env.SMTP_HOST ||
                !process.env.SMTP_PORT ||
                !process.env.SMTP_USER ||
                !process.env.SMTP_PASS ||
                !process.env.FRONTEND_URL) {
                const error = new SmtpConfigError();
                console.error('SMTP configuration error:', {
                    host: !!process.env.SMTP_HOST,
                    port: !!process.env.SMTP_PORT,
                    user: !!process.env.SMTP_USER,
                    pass: !!process.env.SMTP_PASS,
                    frontendUrl: !!process.env.FRONTEND_URL,
                });
                throw error;
            }
            try {
                await this.mailerService.sendMail({
                    to: email,
                    subject: 'Password Reset Request',
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
                .container { background: #f9f9f9; border-radius: 5px; padding: 20px; }
                .button { display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 15px 0; }
                .footer { margin-top: 20px; font-size: 12px; color: #666; }
              </style>
            </head>
            <body>
              <div class="container">
                <h2>Password Reset Request</h2>
                <p>Hello,</p>
                <p>We received a request to reset the password for your CRX Platform account.</p>
                <p>To reset your password, click the button below:</p>
                <a href="${process.env.FRONTEND_URL}/reset-password?token=${token}" class="button">Reset Password</a>
                <p>This link will expire in 1 hour for security reasons.</p>
                <p>If you didn't request this password reset, please ignore this email or contact support if you have concerns.</p>
                <div class="footer">
                  <p>This is an automated message, please do not reply to this email.</p>
                  <p>CRX Platform Security Team</p>
                </div>
              </div>
            </body>
            </html>
          `,
                });
            }
            catch (emailError) {
                console.error('Failed to send password reset email:', {
                    error: emailError,
                    email,
                    timestamp: new Date().toISOString(),
                });
                throw new EmailServiceError('Failed to send password reset email', emailError);
            }
        }
        catch (error) {
            console.error('Error in createPasswordResetToken:', {
                error: error.message,
                type: error.name,
                timestamp: new Date().toISOString(),
                email: email,
            });
            if (error instanceof common_1.NotFoundException ||
                error instanceof SmtpConfigError ||
                error instanceof EmailServiceError ||
                error instanceof common_1.InternalServerErrorException) {
                throw error;
            }
            throw new common_1.InternalServerErrorException('An unexpected error occurred while processing your request');
        }
    }
    async resetPassword(token, newPassword) {
        try {
            const resetRequest = await this.passwordResetModel.findOne({
                token,
                used: false,
                expiresAt: { $gt: new Date() },
            });
            if (!resetRequest) {
                throw new common_1.BadRequestException('Invalid or expired reset token');
            }
            let hashedPassword;
            try {
                const salt = await bcrypt.genSalt();
                hashedPassword = await bcrypt.hash(newPassword, salt);
            }
            catch (hashError) {
                console.error('Failed to hash new password:', {
                    error: hashError,
                    timestamp: new Date().toISOString(),
                });
                throw new common_1.InternalServerErrorException('Failed to process password reset');
            }
            try {
                const user = await this.usersService.findByEmail(resetRequest.email);
                await this.usersService.updatePassword(user.id, hashedPassword);
            }
            catch (userError) {
                console.error('Failed to update user password:', {
                    error: userError,
                    email: resetRequest.email,
                    timestamp: new Date().toISOString(),
                });
                throw new common_1.InternalServerErrorException('Failed to update password');
            }
            try {
                resetRequest.used = true;
                await resetRequest.save();
            }
            catch (tokenError) {
                console.error('Failed to mark reset token as used:', {
                    error: tokenError,
                    token: token,
                    email: resetRequest.email,
                    timestamp: new Date().toISOString(),
                });
            }
        }
        catch (error) {
            console.error('Error in resetPassword:', {
                error: error.message,
                type: error.name,
                token: token,
                timestamp: new Date().toISOString(),
            });
            if (error instanceof common_1.BadRequestException ||
                error instanceof common_1.InternalServerErrorException) {
                throw error;
            }
            throw new common_1.InternalServerErrorException('An unexpected error occurred while resetting your password');
        }
    }
};
exports.PasswordResetService = PasswordResetService;
exports.PasswordResetService = PasswordResetService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(password_reset_schema_1.PasswordReset.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        users_service_1.UsersService,
        mailer_1.MailerService])
], PasswordResetService);
//# sourceMappingURL=password-reset.service.js.map