import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { User, UserRole } from '../users/schemas/user.schema';
interface JwtUser {
    userId: string;
    username: string;
    role: UserRole;
    email?: string;
    _id?: string;
}
export declare class AuthService {
    private usersService;
    private jwtService;
    constructor(usersService: UsersService, jwtService: JwtService);
    validateUser(username: string, password: string): Promise<Partial<User> | null>;
    login(user: JwtUser): {
        access_token: string;
        user: {
            id: string;
            username: string;
            email: string;
            role: UserRole;
        };
    };
    changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void>;
}
export {};
