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
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { PricesService } from "./prices.service";
import { CreatePriceDto } from "./dto/create-price.dto";
import { UpdatePriceDto } from "./dto/update-price.dto";
import { AddDynamicKeyDto } from "./dto/add-dynamic-key.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { UserRole } from "../users/schemas/user.schema";
import { diskStorage } from "multer";
import { extname } from "path";

@Controller("basePrices")
@UseGuards(JwtAuthGuard, RolesGuard)
export class PricesController {
  constructor(private readonly pricesService: PricesService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() createPriceDto: CreatePriceDto) {
    return this.pricesService.create(createPriceDto);
  }

  @Post("upload")
  @Roles(UserRole.ADMIN)
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: "./uploads/prices",
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + "-" + Math.round(Math.random() * 1e9);
          cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        const allowedExtensions = [".xlsx", ".csv", ".numbers"];
        const ext = extname(file.originalname).toLowerCase();
        if (allowedExtensions.includes(ext)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              "Only .xlsx, .csv, and .numbers files are allowed"
            ),
            false
          );
        }
      },
    })
  )
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException("No file uploaded");
    }
    return this.pricesService.parseAndSaveFile(file);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MODERATOR, UserRole.DEALER)
  findAll(@Request() req) {
    const userRole = req.user.role;
    const userLevel = req.user.level;

    if (userRole === UserRole.DEALER) {
      return this.pricesService.findAllForDealer(userLevel);
    }
    return this.pricesService.findAll();
  }

  @Get(":id")
  @Roles(UserRole.ADMIN)
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.pricesService.findOne(id);
  }

  @Put(":id")
  @Roles(UserRole.ADMIN)
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() updatePriceDto: UpdatePriceDto
  ) {
    return this.pricesService.update(id, updatePriceDto);
  }

  @Put("add/dynamic-key")
  @Roles(UserRole.ADMIN)
  addDynamicKey(@Body() addDynamicKeyDto: AddDynamicKeyDto) {
    return this.pricesService.addDynamicKey(addDynamicKeyDto);
  }
}
