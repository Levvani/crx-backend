// src/auth/auth.service.ts
import { Injectable, BadRequestException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { UsersService } from "../users/users.service";
import { JwtPayload } from "./interfaces/jwt-payload.interface";
import { User, UserRole } from "../users/schemas/user.schema";

// Define the interface for the user object as received from the JWT strategy
interface JwtUser {
  userId: string;
  username: string;
  role: UserRole;
  email?: string;
  _id?: string;
  firstname?: string;
  lastname?: string;
  profitBalance?: number;
  totalBalance?: number;
  level?: string | null;
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(
    username: string,
    password: string,
  ): Promise<Partial<User> | null> {
    try {
      const user = await this.usersService.findByUsername(username);
      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (isPasswordValid) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password: _, ...result } = user.toObject() as User;
        return result;
      }

      return null;
    } catch {
      // Error handling - user not found or other error
      return null;
    }
  }

  // In the AuthService class, update the login method
  login(user: JwtUser) {
    const payload: JwtPayload = {
      username: user.username,
      sub: user.userId || user._id, // Use userId if available, fallback to _id
      role: user.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.userId || user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        firstname: user.firstname || null,
        lastname: user.lastname || null,
        profitBalance: user.profitBalance || 0,
        totalBalance: user.totalBalance || 0,
        level: user.level || null,
      },
    };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    // Find the user
    const user = await this.usersService.findById(userId);

    // Verify current password
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );
    if (!isPasswordValid) {
      throw new BadRequestException("Current password is incorrect");
    }

    // Hash the new password
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update the password
    await this.usersService.updatePassword(userId, hashedPassword);
  }
}
