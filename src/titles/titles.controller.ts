// src/titles/titles.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from "@nestjs/common";
import { TitlesService } from "./titles.service";
import { CreateTitleDto } from "./dto/create-title.dto";
import { UpdateTitleDto } from "./dto/update-title.dto";
import { Title } from "./schemas/title.schema";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { UserRole } from "../users/schemas/user.schema";

@Controller("titles")
export class TitlesController {
  constructor(private readonly titlesService: TitlesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  async create(@Body() createTitleDto: CreateTitleDto): Promise<Title> {
    return this.titlesService.create(createTitleDto);
  }

  @Get()
  async findAll(): Promise<Title[]> {
    return this.titlesService.findAll();
  }

  @Get(":titleID")
  async findOne(
    @Param("titleID", ParseIntPipe) titleID: number
  ): Promise<Title> {
    return this.titlesService.findOne(titleID);
  }

  @Put(":titleID")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  async update(
    @Param("titleID", ParseIntPipe) titleID: number,
    @Body() updateTitleDto: UpdateTitleDto
  ): Promise<Title> {
    return this.titlesService.update(titleID, updateTitleDto);
  }
}
