import { UserRole } from '../../users/schemas/user.schema';
export interface JwtPayload {
    sub: string;
    username: string;
    role: UserRole;
}
