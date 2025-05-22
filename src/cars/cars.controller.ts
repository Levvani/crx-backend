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
  Request,
  ForbiddenException,
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
    @UploadedFiles() photos: Express.Multer.File[]
  ): Promise<Car> {
    return this.carsService.create(createCarDto, photos);
  }

  @Put(":carID")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @UseInterceptors(FilesInterceptor("photos", 10, multerOptions))
  async update(
    @Param("carID", ParseIntPipe) carID: number,
    @Body() updateCarDto: UpdateCarDto
  ): Promise<Car> {
    return this.carsService.update(carID, updateCarDto as CreateCarDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR, UserRole.DEALER)
  async findAll(
    @Request() req,
    @Query(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: false }))
    paginationDto: PaginationDto,
    @Query("vinCode") vinCode?: string,
    @Query("containerNumber") containerNumber?: string,
    @Query("username") username?: string,
    @Query("status") status?: string,
    @Query("dateOfPurchase") dateOfPurchase?: string
  ): Promise<{
    cars: any[];
    total: number;
    totalPages: number;
    page: number;
    limit: number;
  }> {
    console.log("BBBBBBBBBBB", req.user);

    // For dealers, force username filter to be their own username
    if (req.user.role === UserRole.DEALER) {
      username = req.user.username;
    }

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
      }
    );

    // Transform the cars to include only the requested fields
    const transformedCars = result.cars.map((car) => {
      return {
        carID: car.carID || null,
        location: car.location || null,
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
  @Roles(UserRole.ADMIN, UserRole.MODERATOR, UserRole.DEALER)
  async findOne(
    @Param("carID", ParseIntPipe) carID: number,
    @Request() req
  ): Promise<any> {
    const car = await this.carsService.findOne(carID);

    // For dealers, check if the car belongs to them
    if (
      req.user.role === UserRole.DEALER &&
      car.username !== req.user.username
    ) {
      throw new ForbiddenException(
        "You do not have permission to view this car"
      );
    }
    // Return all fields from CreateCarDto plus the requested additional fields
    return {
      // All fields from CreateCarDto
      carID: car.carID || null,
      username: car.username || null,
      vinCode: car.vinCode || null,
      carName: car.carName || null,
      location: car.location || null,
      lotNumber: car.lotNumber || null,
      auctionName: car.auctionName || null,
      dateOfPurchase: car.dateOfPurchase || null,
      comment: car.comment || null,
      shippingLine: car.shippingLine || null,
      dateOfContainerOpening: car.dateOfContainerOpening || null,
      greenDate: car.greenDate || null,
      buyer: car.buyer || null,
      buyerPN: car.buyerPN || null,
      buyerPhone: car.buyerPhone || null,
      auctionPrice: car.auctionPrice || null,
      transportationPrice: car.transportationPrice || null,
      totalCost: car.totalCost || null,
      containerNumber: car.containerNumber || null,
      status: car.status || null,
      isHybridOrElectric: car.isHybridOrElectric || false,
      isOffsite: car.isOffsite || false,
      auctionFine: car.auctionFine || null,
      financingAmount: car.financingAmount || null,

      // Additional fields with default values
      paymentLeft: 0,
      profitDifference: 0,

      // Keep the image field from your original response
      image: "/assets/car-logo-icon-emblem-design-600nw-473088037.webp",
      // Remove balanceOfCar as it's being replaced by paymentLeft
      // balanceOfCar: 0,
    };
  }

  @Delete()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async delete(@Body("carID") carID: number): Promise<Car> {
    return this.carsService.delete(carID);
  }
}
