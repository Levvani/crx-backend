// src/users/users.controller.ts
import {
  Controller,
  Get,
  Param,
  UseGuards,
  Put,
  Body,
  Query,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { UsersService } from "./users.service";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { User, UserDocument, UserRole } from "./schemas/user.schema";
import { NotFoundException } from "@nestjs/common";
import { PaginationDto } from "./dto/pagination.dto";

@Controller("users")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class UsersController {
  constructor(
    private usersService: UsersService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  @Get()
  @Roles(UserRole.ADMIN)
  async findAll(@Query() paginationDto: PaginationDto) {
    console.log("Received query parameters:", paginationDto);

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

  @Get("dealers") // This specific route MUST come before the parameterized route
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  async findDealers(@Query() paginationDto: PaginationDto) {
    try {
      console.log("Fetching dealers with parameters:", paginationDto);

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
    } catch (error) {
      console.error("Error in findDealers:", error);
      // Instead of throwing the error directly, return a proper error response
      throw new Error("Internal server error while fetching dealers");
    }
  }

  @Get(":id") // This parameterized route MUST come after specific routes
  @Roles(UserRole.ADMIN, UserRole.MODERATOR, UserRole.ACCOUNTANT)
  async findOne(@Param("id") id: string) {
    try {
      // Try to parse as numeric ID first
      const numericId = parseInt(id, 10);

      // If it's a valid number, use findById which now uses userID
      if (!isNaN(numericId)) {
        const user = await this.usersService.findById(id);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password, ...result } = user.toObject() as User;
        return result;
      }
      // If it's not a valid number, it might be a MongoDB ObjectId
      else {
        // Use Mongoose's findById directly for MongoDB _id
        const user = await this.userModel.findById(id).exec();
        if (!user) {
          throw new NotFoundException(`User with MongoDB id ${id} not found`);
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password, ...result } = user.toObject() as User;
        return result;
      }
    } catch (error) {
      console.error(`Error finding user with id ${id}:`, error);
      throw error;
    }
  }

  @Put(":id/role")
  @Roles(UserRole.ADMIN)
  async updateRole(@Param("id") id: string, @Body() body: { role: UserRole }) {
    const user = await this.usersService.updateRole(id, body.role);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = user.toObject() as User;
    return result;
  }
}
