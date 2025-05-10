// src/auth/auth.service.ts
import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { UsersService } from "../users/users.service";
import { JwtPayload } from "./interfaces/jwt-payload.interface";
import { User, UserRole } from "../users/schemas/user.schema";
import { ConfigService } from "@nestjs/config";
import { Response } from "express";

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
    private configService: ConfigService,
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
  async login(user: JwtUser, response: Response) {
    const payload: JwtPayload = {
      username: user.username,
      sub: user.userId || user._id,
      role: user.role,
    };

    // Generate tokens
    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken(payload);

    // Save refresh token to user document
    await this.usersService.addRefreshToken(
      user.userId || user._id.toString(),
      refreshToken,
    );

    // Set refresh token as HTTP-only cookie
    this.setRefreshTokenCookie(response, refreshToken);

    return {
      access_token: accessToken,
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

  // Add this new method to set the refresh token cookie
  private setRefreshTokenCookie(response: Response, token: string) {
    response.cookie("refresh_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Use secure in production
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
      path: "/auth/refresh", // Only sent to the refresh endpoint
    });
  }

  // Update the refreshTokens method to use cookies
  async refreshTokens(refreshToken: string, response: Response) {
    try {
      // Verify the refresh token
      const secret = this.configService.get<string>("JWT_SECRET");
      if (!secret) {
        throw new Error("JWT_SECRET is not defined in configuration");
      }

      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret,
      });
      // Check if user exists and token is in their refresh tokens
      const user = await this.usersService.findById(payload.sub);
      const isTokenValid = user.refreshTokens?.includes(refreshToken);

      if (!isTokenValid) {
        throw new UnauthorizedException("Invalid refresh token");
      }

      // Generate new tokens (token rotation for security)
      const newAccessToken = this.generateAccessToken(payload);
      const newRefreshToken = this.generateRefreshToken(payload);

      // Remove old refresh token and add new one
      await this.usersService.removeRefreshToken(payload.sub, refreshToken);
      await this.usersService.addRefreshToken(payload.sub, newRefreshToken);

      // Set the new refresh token as an HTTP-only cookie
      this.setRefreshTokenCookie(response, newRefreshToken);

      return {
        access_token: newAccessToken,
      };
    } catch {
      throw new UnauthorizedException("Invalid refresh token");
    }
  }

  // Update the logout method to clear the cookie
  async logout(userId: string, refreshToken: string, response: Response) {
    // Remove the refresh token from the user's document
    await this.usersService.removeRefreshToken(userId, refreshToken);

    // Clear the refresh token cookie
    response.clearCookie("refresh_token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/auth/refresh",
    });
  }

  generateAccessToken(payload: JwtPayload): string {
    return this.jwtService.sign(payload);
  }

  generateRefreshToken(payload: JwtPayload): string {
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>("JWT_SECRET"),
      expiresIn: "7d", // Refresh token lasts longer than access token
    });
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
