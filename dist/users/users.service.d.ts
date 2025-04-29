import { Model } from 'mongoose';
import { UserDocument, UserRole } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
interface PaginationOptions {
    page: number;
    limit: number;
    role?: UserRole;
    level?: string;
    search?: string;
}
export declare class UsersService {
    private userModel;
    constructor(userModel: Model<UserDocument>);
    create(createUserDto: CreateUserDto): Promise<UserDocument>;
    findByUsername(username: string): Promise<UserDocument>;
    findById(id: string): Promise<UserDocument>;
    findAll(paginationOptions?: PaginationOptions): Promise<{
        users: UserDocument[];
        total: number;
        totalPages: number;
        page: number;
        limit: number;
    }>;
    updateRole(id: string, role: UserRole): Promise<UserDocument>;
    findByEmail(email: string): Promise<UserDocument>;
    updatePassword(id: string, hashedPassword: string): Promise<UserDocument>;
}
export {};
