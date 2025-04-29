import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Request as ExpressRequest } from 'express';
import { UserRole } from '../users/schemas/user.schema';
interface JwtUser {
    userId: string;
    username: string;
    role: UserRole;
}
interface RequestWithUser extends ExpressRequest {
    user: JwtUser;
}
export declare class AuthController {
    private authService;
    private usersService;
    constructor(authService: AuthService, usersService: UsersService);
    register(createUserDto: CreateUserDto): Promise<{
        userID: number;
        username: string;
        firstname: string;
        lastname: string;
        email: string;
        role: UserRole;
        level: string;
        isActive: boolean;
        totalBalance: number;
        profitBalance: number;
        phoneNumber: number;
        createdAt: Date;
    }>;
    login(req: RequestWithUser): {
        access_token: string;
        user: {
            id: string;
            username: string;
            email: string;
            role: UserRole;
        };
    };
    getProfile(req: RequestWithUser): JwtUser;
    logout(): {
        message: string;
    };
    changePassword(req: RequestWithUser, changePasswordDto: ChangePasswordDto): Promise<{
        message: string;
    }>;
}
export {};
