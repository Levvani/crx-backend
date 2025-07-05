// src/users/users.controller.ts
import { Controller, Get, Param, UseGuards, Put, Body, Query, Delete, Request, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UsersService } from './users.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument, UserRole } from './schemas/user.schema';
import { NotFoundException } from '@nestjs/common';
import { PaginationDto } from './dto/pagination.dto';
import { UpdateUserDto } from './dto/update-user.dto';

// Define the JWT user interface
interface JwtUser {
  userID: number;
  username: string;
  role: UserRole;
  level?: string;
}

interface RequestWithUser extends Request {
  user: JwtUser;
}

@Controller('users')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class UsersController {
  constructor(
    private usersService: UsersService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  @Get()
  @Roles(UserRole.ADMIN)
  async findAll(@Query() paginationDto: PaginationDto) {
    const result = await this.usersService.findAll({
      page: paginationDto.page,
      limit: paginationDto.limit,
      role: paginationDto.role,
      level: paginationDto.level,
      search: paginationDto.search,
    });

    // Remove password from each user
    const usersWithoutPassword = result.users.map((user) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...userData } = user.toObject() as User;
      return userData;
    });

    return {
      users: usersWithoutPassword,
      total: result.total,
      totalPages: result.totalPages,
      page: result.page,
      limit: result.limit,
    };
  }

  @Get('dealers') // This specific route MUST come before the parameterized route
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  async findDealers(@Query() paginationDto: PaginationDto) {
    // Use the dedicated dealers method
    const result = await this.usersService.findDealers({
      page: paginationDto.page,
      limit: paginationDto.limit,
      level: paginationDto.level,
      search: paginationDto.search,
    });

    // Remove password from each user - with safer conversion
    const usersWithoutPassword = result.users.map((user) => {
      // Check if user is a Mongoose document or plain object
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const userObj = user.toObject ? user.toObject() : user;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...userData } = userObj as User;
      return userData;
    });

    return {
      users: usersWithoutPassword,
      total: result.total,
      totalPages: result.totalPages,
      page: result.page,
      limit: result.limit,
    };
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MODERATOR, UserRole.ACCOUNTANT, UserRole.DEALER)
  async findOne(@Param('id') id: number, @Request() req: RequestWithUser) {
    const currentUser = req.user;
    
    // If the user is a dealer, they can only access their own data
    if (currentUser.role === UserRole.DEALER && currentUser.userID !== id) {
      throw new ForbiddenException('Dealers can only access their own user information');
    }
    
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = user.toObject() as User;
    return result;
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  async updateUser(@Param('id') id: number, @Body() updateUserDto: UpdateUserDto) {
    const user = await this.usersService.update(id, updateUserDto);
    // Remove password from response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = user.toObject() as User;
    return result;
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  async deleteUser(@Param('id') id: number) {
    const user = await this.usersService.delete(id);
    // Remove password from response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = user.toObject() as User;
    return {
      message: `User ${result.username} (ID: ${result.userID}) has been successfully deleted`,
      deletedUser: result,
    };
  }
}
