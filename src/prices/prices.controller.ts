import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  UseGuards,
  ParseIntPipe,
  Request,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PricesService } from './prices.service';
import { CreatePriceDto } from './dto/create-price.dto';
import { AddDynamicKeyDto } from './dto/add-dynamic-key.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';
import { extname } from 'path';
import { UpdatePriceDto } from './dto/update-price.dto';

@Controller('basePrices')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PricesController {
  constructor(private readonly pricesService: PricesService) {}

  @Post('base')
  @Roles(UserRole.ADMIN)
  create(@Body() createPriceDto: CreatePriceDto) {
    return this.pricesService.create(createPriceDto);
  }

  @Post('upload')
  @Roles(UserRole.ADMIN)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: undefined, // Keep file in memory as buffer
      fileFilter: (req, file, cb) => {
        const allowedExtensions = ['.xlsx', '.csv', '.numbers'];
        const ext = extname(file.originalname).toLowerCase();
        if (allowedExtensions.includes(ext)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Only .xlsx, .csv, and .numbers files are allowed'), false);
        }
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
      },
    }),
  )
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    return this.pricesService.parseAndSaveFile(file);
  }

  @Put('add-dynamic-key')
  @Roles(UserRole.ADMIN)
  addDynamicKey(@Body() addDynamicKeyDto: AddDynamicKeyDto) {
    return this.pricesService.addDynamicKey(addDynamicKeyDto);
  }

  @Get('base')
  @Roles(UserRole.ADMIN, UserRole.MODERATOR, UserRole.DEALER)
  findAll(@Request() req: Request & { user: { role: UserRole; level: number } }) {
    const userRole = req.user.role;
    const userLevel = req.user.level;

    if (userRole === UserRole.DEALER) {
      return this.pricesService.findAllForDealer(userLevel.toString());
    }
    return this.pricesService.findAll();
  }

  @Get('base/:id')
  @Roles(UserRole.ADMIN)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.pricesService.findOne(id);
  }

  @Put('base/:id')
  @Roles(UserRole.ADMIN)
  @UsePipes(
    new ValidationPipe({
      whitelist: false,
      forbidNonWhitelisted: false,
      transform: true,
      skipMissingProperties: true,
    }),
  )
  update(@Param('id', ParseIntPipe) id: number, @Body() updateData: any) {
    return this.pricesService.update(id, updateData as UpdatePriceDto);
  }

  // Dealer Type endpoints
  @Roles(UserRole.ADMIN)
  @Get('dealer-types/:id')
  async findDealerTypeById(@Param('id') id: string) {
    return this.pricesService.findDealerTypeById(id);
  }
  @Roles(UserRole.ADMIN)
  @Get('dealer-types')
  async findAllDealerTypes() {
    return this.pricesService.findAllDealerTypes();
  }
}
