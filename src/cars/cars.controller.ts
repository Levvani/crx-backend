import {
  Controller,
  Post,
  Put,
  Body,
  Query,
  Get,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  Delete,
  ValidationPipe,
  Param,
  ParseIntPipe,
} from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import { CarsService } from "./cars.service";
import { CreateCarDto } from "./dto/create-car.dto";
import { UpdateCarDto } from "./dto/update-car.dto";
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

  @Put(":carID")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @UseInterceptors(FilesInterceptor("photos", 10, multerOptions))
  async update(
    @Param("carID", ParseIntPipe) carID: number,
    @Body() updateCarDto: UpdateCarDto,
  ): Promise<Car> {
    return this.carsService.update(carID, updateCarDto as CreateCarDto);
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
    cars: any[];
    total: number;
    totalPages: number;
    page: number;
    limit: number;
  }> {
    const result = await this.carsService.findAll(
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

    // Transform the cars to include only the requested fields
    const transformedCars = result.cars.map((car) => {
      return {
        carID: car.carID || null,
        lotNumber: car.lotNumber || null,
        vinCode: car.vinCode || null,
        username: car.username || null,
        carName: car.carName || null,
        buyer: car.buyer || null,
        auctionName: car.auctionName || null,
        dateOfPurchase: car.dateOfPurchase || null,
        shippingLine: car.shippingLine || null,
        containerNumber: car.containerNumber || null,
        balanceOfCar: 0, // Set to 0 by default as requested
        image: "/assets/car-logo-icon-emblem-design-600nw-473088037.webp", // Use the image from assets folder
      };
    });

    return {
      cars: transformedCars,
      total: result.total,
      totalPages: result.totalPages,
      page: result.page,
      limit: result.limit,
    };
  }

  @Get(":carID")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  async findOne(@Param("carID", ParseIntPipe) carID: number): Promise<any> {
    const car = await this.carsService.findOne(carID);
    // Transform the car to match the format used in findAll
    return {
      carID: car.carID || null,
      lotNumber: car.lotNumber || null,
      vinCode: car.vinCode || null,
      username: car.username || null,
      carName: car.carName || null,
      buyer: car.buyer || null,
      auctionName: car.auctionName || null,
      dateOfPurchase: car.dateOfPurchase || null,
      shippingLine: car.shippingLine || null,
      containerNumber: car.containerNumber || null,
      balanceOfCar: 0, // Set to 0 by default as requested
      image: "/assets/car-logo-icon-emblem-design-600nw-473088037.webp", // Use the image from assets folder
    };
  }

  @Delete()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async delete(@Body("carID") carID: number): Promise<Car> {
    return this.carsService.delete(carID);
  }
}
