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
import { User, UserRole } from "./schemas/user.schema";
import { PaginationDto } from "./dto/pagination.dto";

@Controller("users")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

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

  @Get(":id")
  @Roles(UserRole.ADMIN, UserRole.MODERATOR, UserRole.ACCOUNTANT)
  async findOne(@Param("id") id: string) {
    const user = await this.usersService.findById(id);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = user.toObject() as User;
    return result;
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
