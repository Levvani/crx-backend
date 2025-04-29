import { UserRole } from '../schemas/user.schema';
export declare class CreateUserDto {
    userID?: number;
    username: string;
    firstname: string;
    lastname: string;
    password: string;
    email: string;
    role?: UserRole;
    level?: string;
    totalBalance?: number;
    profitBalance?: number;
    phoneNumber?: number;
}
