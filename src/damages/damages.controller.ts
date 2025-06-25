import {
  Controller,
  Post,
  Put,
  Body,
  Get,
  UseGuards,
  Param,
  ParseIntPipe,
  Request,
  ForbiddenException,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { DamagesService } from './damages.service';
import { CreateDamageDto } from './dto/create-damage.dto';
import { UpdateDamageDto } from './dto/update-damage.dto';
import { Damage } from './schemas/damages.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';

@Controller('damages')
export class DamagesController {
  constructor(private readonly damagesService: DamagesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR, UserRole.DEALER)
  @UseInterceptors(FileFieldsInterceptor([{ name: 'images', maxCount: 10 }]))
  async create(
    @Body() createDamageDto: CreateDamageDto,
    @UploadedFiles() files: { images?: Express.Multer.File[] },
  ): Promise<Damage> {
    // Debug logging
    console.log('Received files:', files);
    console.log('Files.images:', files?.images);

    // Ensure we have an array of files, even if empty
    const imageFiles = files?.images || [];
    console.log('Image files to be processed:', imageFiles);

    return this.damagesService.create(createDamageDto, imageFiles);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR, UserRole.DEALER)
  async findAll(@Request() req: { user: { role: UserRole; username: string } }): Promise<Damage[]> {
    // For dealers, only return damages with their username
    if (req.user.role === UserRole.DEALER) {
      return this.damagesService.findAll(req.user.username);
    }
    // For admins and moderators, return all damages
    return this.damagesService.findAll();
  }

  @Get(':damageID')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR, UserRole.DEALER)
  async findOne(
    @Param('damageID', ParseIntPipe) damageID: number,
    @Request() req: { user: { role: UserRole; username: string } },
  ): Promise<Damage> {
    const damage = await this.damagesService.findOne(damageID);

    // For dealers, check if the damage belongs to them
    if (req.user.role === UserRole.DEALER && damage.username !== req.user.username) {
      throw new ForbiddenException('You do not have permission to view this damage');
    }

    return damage;
  }

  @Put(':damageID')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  async update(
    @Param('damageID', ParseIntPipe) damageID: number,
    @Body() updateDamageDto: UpdateDamageDto,
  ): Promise<Damage> {
    return this.damagesService.update(damageID, updateDamageDto);
  }
}
