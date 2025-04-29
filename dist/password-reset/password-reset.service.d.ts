import { Model } from 'mongoose';
import { PasswordResetDocument } from './schemas/password-reset.schema';
import { UsersService } from '../users/users.service';
import { MailerService } from '@nestjs-modules/mailer';
export declare class PasswordResetService {
    private passwordResetModel;
    private usersService;
    private mailerService;
    constructor(passwordResetModel: Model<PasswordResetDocument>, usersService: UsersService, mailerService: MailerService);
    createPasswordResetToken(email: string): Promise<void>;
    resetPassword(token: string, newPassword: string): Promise<void>;
}
