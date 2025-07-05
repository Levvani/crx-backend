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
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { CarsService } from './cars.service';
import { CreateCarDto } from './dto/create-car.dto';
import { UpdateCarDto } from './dto/update-car.dto';
import { PaginationDto } from './dto/pagination.dto';
import { TransferDto } from './dto/transfer.dto';
import { Car, CarStatus } from './schemas/car.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';

@Controller('cars')
export class CarsController {
  constructor(private readonly carsService: CarsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @UseInterceptors(FileFieldsInterceptor([{ name: 'photos', maxCount: 10 }]))
  async create(
    @Body(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    )
    createCarDto: CreateCarDto,
    @UploadedFiles() files: { photos?: Express.Multer.File[] },
  ): Promise<Car> {
    // Debug logging
    console.log('=== CREATE CAR DEBUG ===');
    console.log('Received files:', files);
    console.log('Files.photos:', files?.photos);
    console.log('Raw DTO before transformation:', createCarDto);
    console.log(
      'auctionPrice type:',
      typeof createCarDto.auctionPrice,
      'value:',
      createCarDto.auctionPrice,
    );
    console.log(
      'transportationPrice type:',
      typeof createCarDto.transportationPrice,
      'value:',
      createCarDto.transportationPrice,
    );
    console.log('totalCost type:', typeof createCarDto.totalCost, 'value:', createCarDto.totalCost);
    console.log('=== END DEBUG ===');

    // Ensure we have an array of files, even if empty
    const photos = files?.photos || [];
    console.log('Photos to be processed:', photos);

    return this.carsService.create(createCarDto, photos);
  }

  @Put(':carID')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR, UserRole.DEALER)
  @UseInterceptors(FileFieldsInterceptor([{ name: 'photos', maxCount: 10 }]))
  async update(
    @Param('carID', ParseIntPipe) carID: number,
    @Body(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    )
    updateCarDto: UpdateCarDto,
    @UploadedFiles() files: { photos?: Express.Multer.File[] },
    @Request() req: { user: { role: UserRole; username: string } },
  ): Promise<Car> {
    // For dealers, restrict updates to only buyer-related fields
    if (req.user.role === UserRole.DEALER) {
      // Check if the car belongs to the dealer
      const car = await this.carsService.findOne(carID);
      if (car.username !== req.user.username) {
        throw new ForbiddenException('You do not have permission to update this car');
      }

      // Create a restricted DTO with only allowed fields
      const restrictedDto: UpdateCarDto = {};
      
      // Only allow buyer-related fields
      if (updateCarDto.buyer !== undefined) {
        restrictedDto.buyer = updateCarDto.buyer;
      }
      if (updateCarDto.buyerPN !== undefined) {
        restrictedDto.buyerPN = updateCarDto.buyerPN;
      }
      if (updateCarDto.buyerPhone !== undefined) {
        restrictedDto.buyerPhone = updateCarDto.buyerPhone;
      }

      // If dealer tries to update other fields, ignore them
      console.log('Dealer update - restricted fields only:', restrictedDto);
      
      // Ensure we have an array of files, even if empty
      const photos = files?.photos || [];
      return this.carsService.update(carID, restrictedDto as CreateCarDto, photos);
    }

    // For ADMIN and MODERATOR, allow all updates
    // Ensure we have an array of files, even if empty
    const photos = files?.photos || [];
    console.log('Admin/Moderator update DTO:', updateCarDto);
    return this.carsService.update(carID, updateCarDto as CreateCarDto, photos);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR, UserRole.DEALER)
  async findAll(
    @Request() req: { user: { role: UserRole; username: string } },
    @Query(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: false }))
    paginationDto: PaginationDto,
    @Query('vinCode') vinCode?: string,
    @Query('containerNumber') containerNumber?: string,
    @Query('username') username?: string,
    @Query('status') status?: string,
    @Query('dateOfPurchase') dateOfPurchase?: string,
    @Query('buyer') buyer?: string,
  ): Promise<{
    cars: any[];
    total: number;
    totalPages: number;
    page: number;
    limit: number;
  }> {
    console.log('BBBBBBBBBBB', req.user);

    // For dealers, force username filter to be their own username
    if (req.user.role === UserRole.DEALER) {
      username = req.user.username;
    }

    // Handle multiple usernames (comma-separated)
    let usernameFilter: string | string[] | undefined = username;
    if (username && username.includes(',')) {
      usernameFilter = username
        .split(',')
        .map((u) => u.trim())
        .filter((u) => u.length > 0);
    }

    // Convert status string to CarStatus enum if provided
    let statusFilter: CarStatus | undefined = undefined;
    if (status && Object.values(CarStatus).includes(status as CarStatus)) {
      statusFilter = status as CarStatus;
    }

    const result = await this.carsService.findAll(
      {
        vinCode,
        containerNumber,
        username: usernameFilter,
        status: statusFilter,
        dateOfPurchase,
        buyer,
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
        location: car.location || null,
        lotNumber: car.lotNumber || null,
        vinCode: car.vinCode || null,
        username: car.username || null,
        carName: car.carName || null,
        buyer: car.buyer || null,
        auctionName: car.auctionName || null,
        dateOfPurchase: car.dateOfPurchase || null,
        dateOfArrival: car.dateOfArrival || null,
        shippingLine: car.shippingLine || null,
        containerNumber: car.containerNumber || null,
        toBePaid: car.toBePaid || null,
        isTaken: car.isTaken || false,
        isTitleTaken: car.isTitleTaken || false,
        doubleRate: car.doubleRate || false,
        oversized: car.oversized || 0,
        dateOfContainerOpening: car.dateOfContainerOpening || null,
        image:
          car.photos && car.photos.length > 0
            ? car.photos[0]
            : '/assets/car-logo-icon-emblem-design-600nw-473088037.webp',
        photos: car.photos || [], // Add the photos array
        bonusReceiver: car.bonusReceiver || null,
        bonusAmount: car.bonusAmount ?? 0,
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

  @Get(':carID')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR, UserRole.DEALER)
  async findOne(
    @Param('carID', ParseIntPipe) carID: number,
    @Request() req: { user: { role: UserRole; username: string } },
  ): Promise<any> {
    const car = await this.carsService.findOne(carID);

    // For dealers, check if the car belongs to them
    if (req.user.role === UserRole.DEALER && car.username !== req.user.username) {
      throw new ForbiddenException('You do not have permission to view this car');
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
      dateOfArrival: car.dateOfArrival || null,
      comment: car.comment || null,
      shippingLine: car.shippingLine || null,
      dateOfContainerOpening: car.dateOfContainerOpening || null,
      greenDate: car.greenDate || null,
      buyer: car.buyer || null,
      buyerPN: car.buyerPN || null,
      buyerPhone: car.buyerPhone || null,
      auctionPrice: car.auctionPrice ?? 0,
      transportationPrice: car.transportationPrice ?? 0,
      totalCost: car.totalCost ?? 0,
      paid: car.paid ?? 0,
      toBePaid: car.toBePaid ?? 0,
      containerNumber: car.containerNumber || null,
      status: car.status || null,
      isHybridOrElectric: car.isHybridOrElectric || false,
      isOffsite: car.isOffsite || false,
      auctionFine: car.auctionFine ?? 0,
      financingAmount: car.financingAmount ?? 0,
      profit: car.profit ?? 0,
      isTaken: car.isTaken || false,
      isTitleTaken: car.isTitleTaken || false,
      doubleRate: car.doubleRate || false,
      oversized: car.oversized || 0,
      image:
        car.photos && car.photos.length > 0
          ? car.photos[0]
          : '/assets/car-logo-icon-emblem-design-600nw-473088037.webp',
      photos: car.photos || [], // Add the photos array
      bonusReceiver: car.bonusReceiver || null,
      bonusAmount: car.bonusAmount ?? 0,
    };
  }

  @Delete()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async delete(@Query('carID', ParseIntPipe) carID: number): Promise<Car> {
    return this.carsService.delete(carID);
  }

  @Post('transfer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR, UserRole.DEALER)
  async transfer(
    @Body() transferDto: TransferDto,
    @Request() req: { user: { role: UserRole; username: string } },
  ): Promise<{ message: string }> {
    // For dealers, check if the car belongs to them
    if (req.user.role === UserRole.DEALER) {
      const car = await this.carsService.findOne(transferDto.id);
      if (car.username !== req.user.username) {
        throw new ForbiddenException('You do not have permission to transfer from this car');
      }
    }

    await this.carsService.transfer(transferDto.id, transferDto.amount);
    return { message: `Successfully transferred ${transferDto.amount} from car ${transferDto.id}` };
  }
}
