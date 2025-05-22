import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  UseGuards,
  ParseIntPipe,
} from "@nestjs/common";
import { PricesService } from "./prices.service";
import { CreatePriceDto } from "./dto/create-price.dto";
import { UpdatePriceDto } from "./dto/update-price.dto";
import { AddDynamicKeyDto } from "./dto/add-dynamic-key.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { UserRole } from "../users/schemas/user.schema";

@Controller("basePrices")
@UseGuards(JwtAuthGuard, RolesGuard)
export class PricesController {
  constructor(private readonly pricesService: PricesService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() createPriceDto: CreatePriceDto) {
    return this.pricesService.create(createPriceDto);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  findAll() {
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
