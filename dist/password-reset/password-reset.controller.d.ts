import { PasswordResetService } from './password-reset.service';
import { RequestResetDto, ResetPasswordDto } from './dto/password-reset.dto';
export declare class PasswordResetController {
    private readonly passwordResetService;
    constructor(passwordResetService: PasswordResetService);
    requestReset({ email }: RequestResetDto): Promise<{
        message: string;
    }>;
    resetPassword({ token, newPassword }: ResetPasswordDto): Promise<{
        message: string;
    }>;
}
