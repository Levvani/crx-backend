import { UserRole } from '../schemas/user.schema';
export declare class PaginationDto {
    page?: number;
    limit?: number;
    role?: UserRole;
    level?: string;
    search?: string;
}
