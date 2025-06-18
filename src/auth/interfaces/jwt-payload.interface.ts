// src/auth/interfaces/jwt-payload.interface.ts
import { UserRole } from '../../users/schemas/user.schema';

export interface JwtPayload {
  sub: number;
  username: string;
  role: UserRole;
  level: string | null;
  iat?: number; // Issued at
  exp?: number; // Expiration time
  iss?: string; // Issuer
}
