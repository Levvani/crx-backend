// src/auth/auth.controller.ts
import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Request,
  HttpCode,
  HttpStatus,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { Public } from './decorators/public.decorator';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Request as ExpressRequest, Response } from 'express';
import { UserRole } from '../users/schemas/user.schema';
import { User } from '../users/schemas/user.schema';
import { RolesGuard } from './guards/roles.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Roles } from './decorators/roles.decorator';

// Define the JWT payload type returned by the JWT strategy
interface JwtUser {
  userID: number;
  username: string;
  role: UserRole;
  firstname?: string;
  lastname?: string;
  profitBalance?: number;
  totalBalance?: number;
}

// Extend Express.Request to include our user type
interface RequestWithUser extends ExpressRequest {
  user: JwtUser;
}

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
  ) {}

  @Post('register')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async register(@Body() createUserDto: CreateUserDto) {
    try {
      console.log('Registration request received:', {
        ...createUserDto,
        password: '[REDACTED]',
      });

      const user = await this.usersService.create(createUserDto);

      // Return everything except the password
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...result } = user.toObject() as User;
      return result;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  @Public()
  @UseGuards(AuthGuard('local'))
  @Post('login')
  async login(@Request() req: RequestWithUser, @Res({ passthrough: true }) response: Response) {
    // Get the complete user data from the database
    const user = await this.usersService.findByUsername(req.user.username);

    // Create a user object with all the required fields
    const userWithAdditionalInfo = {
      ...req.user,
      userID: user.userID,
      firstname: user.firstname,
      lastname: user.lastname,
      profitBalance: user.profitBalance,
      totalBalance: user.totalBalance,
      level: user.level,
    };

    // Pass the enhanced user object and response to the login method
    return this.authService.login(userWithAdditionalInfo, response);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  getProfile(@Request() req: RequestWithUser) {
    return req.user;
  }

  @Public()
  @Post('refresh')
  async refreshTokens(
    @Req() request: ExpressRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = request.cookies?.refresh_token as string;
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not found');
    }
    return this.authService.refreshTokens(refreshToken, response);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Request() req: RequestWithUser,
    @Req() request: ExpressRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    // For the cookies error
    const refreshToken = request.cookies?.refresh_token as string;
    if (refreshToken) {
      await this.authService.logout(req.user.userID, refreshToken, response);
    }
    return { message: 'Logged out successfully' };
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Request() req: RequestWithUser,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    console.log('CHANGE PASSWORD - ', req.user);
    await this.authService.changePassword(
      req.user.userID,
      changePasswordDto.currentPassword,
      changePasswordDto.newPassword,
    );
    return { message: 'Password changed successfully' };
  }
}
