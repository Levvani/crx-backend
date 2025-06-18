// src/auth/auth.service.ts
import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  OnModuleInit,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { User, UserRole } from '../users/schemas/user.schema';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { Cron } from '@nestjs/schedule';

// Define the interface for the user object as received from the JWT strategy
interface JwtUser {
  userID: number;
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
export class AuthService implements OnModuleInit {
  private tokenBlacklist: Set<string> = new Set();

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async onModuleInit() {
    // Clean up expired tokens on startup
    await this.cleanupExpiredTokens();
  }

  @Cron('0 0 * * *') // Run at midnight every day
  async cleanupExpiredTokens() {
    try {
      await this.usersService.cleanupExpiredTokens();
    } catch {
      // Error during token cleanup - no need to log in production
    }
  }

  async validateUser(username: string, password: string): Promise<Partial<User> | null> {
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
      sub: user.userID,
      username: user.username,
      role: user.role,
      level: user.level || null,
    };

    // Generate tokens
    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken(payload);

    // Save refresh token to user document
    await this.usersService.addRefreshToken(user.userID, refreshToken);

    // Set refresh token as HTTP-only cookie with more permissive settings for testing
    const cookieOptions = {
      httpOnly: true,
      secure: false, // Set to false for local testing
      sameSite: 'lax' as const, // Changed from 'strict' to 'lax' for testing
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/', // Changed from '/auth/refresh' to '/' for testing
    };

    response.cookie('refresh_token', refreshToken, cookieOptions);

    return {
      access_token: accessToken,
      user: {
        id: user.userID,
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
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/auth/refresh',
    };

    response.cookie('refresh_token', token, cookieOptions);
  }

  // Update the refreshTokens method to handle the new token structure
  async refreshTokens(refreshToken: string, response: Response) {
    try {
      const secret = this.configService.get<string>('JWT_SECRET');

      if (!secret) {
        throw new Error('JWT_SECRET is not defined in configuration');
      }

      try {
        const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
          secret,
        });

        // Check if user exists and token is in their refresh tokens
        const user = await this.usersService.findById(payload.sub);
        if (!user) {
          throw new UnauthorizedException('Invalid refresh token');
        }

        const isTokenValid = user.refreshTokens?.some((t) => t && t.token === refreshToken);

        if (!isTokenValid) {
          throw new UnauthorizedException('Invalid refresh token');
        }

        // Generate new tokens - omit exp and iat from payload
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { exp: _, iat: __, ...payloadWithoutTimestamps } = payload;
        const newAccessToken = this.generateAccessToken(payloadWithoutTimestamps);
        const newRefreshToken = this.generateRefreshToken(payloadWithoutTimestamps);

        // Remove old refresh token and add new one
        await this.usersService.removeRefreshToken(payload.sub, refreshToken);
        await this.usersService.addRefreshToken(payload.sub, newRefreshToken);

        // Set the new refresh token as an HTTP-only cookie
        this.setRefreshTokenCookie(response, newRefreshToken);

        return {
          access_token: newAccessToken,
        };
      } catch (verifyError) {
        if (verifyError instanceof Error) {
          if (
            verifyError.name === 'JsonWebTokenError' ||
            verifyError.name === 'TokenExpiredError'
          ) {
            throw new UnauthorizedException('Invalid refresh token');
          }
        }
        throw new UnauthorizedException('Invalid refresh token');
      }
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  // Update the logout method to handle access token blacklisting
  async logout(userId: number, refreshToken: string, response: Response, accessToken?: string) {
    // Remove the refresh token from the user's document
    await this.usersService.removeRefreshToken(userId, refreshToken);

    // Add the access token to the blacklist if provided
    if (accessToken) {
      try {
        interface JwtToken {
          exp: number;
          [key: string]: any;
        }

        const decoded = this.jwtService.verify<JwtToken>(accessToken);
        const remainingTime = decoded.exp - Math.floor(Date.now() / 1000);
        if (remainingTime > 0) {
          this.tokenBlacklist.add(accessToken);
          // Remove from blacklist after token expires
          setTimeout(() => {
            this.tokenBlacklist.delete(accessToken);
          }, remainingTime * 1000);
        }
      } catch {
        // Token is invalid or expired, no need to blacklist
      }
    }

    // Clear the refresh token cookie
    response.clearCookie('refresh_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/auth/refresh',
    });
  }

  // Add method to check if a token is blacklisted
  isTokenBlacklisted(token: string): boolean {
    return this.tokenBlacklist.has(token);
  }

  generateAccessToken(payload: JwtPayload): string {
    return this.jwtService.sign(payload);
  }

  generateRefreshToken(payload: JwtPayload): string {
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: '7d', // Refresh token lasts longer than access token
    });
  }

  async changePassword(
    userID: number,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    // Find the user
    const user = await this.usersService.findById(userID);

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Hash the new password
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update the password
    await this.usersService.updatePassword(userID, hashedPassword);
  }
}
