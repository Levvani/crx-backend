import {
  Controller,
  Post,
  Body,
  Query,
  Get,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  Delete,
  ValidationPipe,
} from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import { CarsService } from "./cars.service";
import { CreateCarDto } from "./dto/create-car.dto";
import { PaginationDto } from "./dto/pagination.dto";
import { Car } from "./schemas/car.schema";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { UserRole } from "../users/schemas/user.schema";
import { multerOptions } from "../config/multer.config";

@Controller("cars")
export class CarsController {
  constructor(private readonly carsService: CarsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @UseInterceptors(FilesInterceptor("photos", 10, multerOptions))
  async create(
    @Body() createCarDto: CreateCarDto,
    @UploadedFiles() photos: Express.Multer.File[],
  ): Promise<Car> {
    return this.carsService.create(createCarDto, photos);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  async findAll(
    @Query(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: false }))
    paginationDto: PaginationDto,
    @Query("vinCode") vinCode?: string,
    @Query("containerNumber") containerNumber?: string,
    @Query("username") username?: string,
    @Query("status") status?: string,
    @Query("dateOfPurchase") dateOfPurchase?: string,
  ): Promise<{
    cars: Car[];
    total: number;
    totalPages: number;
    page: number;
    limit: number;
  }> {
    return this.carsService.findAll(
      {
        vinCode,
        containerNumber,
        username,
        status,
        dateOfPurchase,
      },
      {
        page: paginationDto.page,
        limit: paginationDto.limit,
      },
    );
  }

  @Delete()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async delete(@Body("carID") carID: number): Promise<Car> {
    return this.carsService.delete(carID);
  }
}
