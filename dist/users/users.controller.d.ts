import { UsersService } from './users.service';
import { UserRole } from './schemas/user.schema';
import { PaginationDto } from './dto/pagination.dto';
export declare class UsersController {
    private usersService;
    constructor(usersService: UsersService);
    findAll(paginationDto: PaginationDto): Promise<{
        users: {
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
        }[];
        total: number;
        totalPages: number;
        page: number;
        limit: number;
    }>;
    findOne(id: string): Promise<{
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
    updateRole(id: string, body: {
        role: UserRole;
    }): Promise<{
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
}
