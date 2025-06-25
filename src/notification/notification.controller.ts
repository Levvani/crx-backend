import {
  Body,
  Controller,
  Post,
  Get,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { v4 as uuid } from 'uuid';
import { NotificationService } from './notification.service';
import { NotificationDto } from './dto/notification.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';

@Controller('notification')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  async getNotification(): Promise<NotificationDto | null> {
    const notification = await this.notificationService.getCurrentNotification();
    if (!notification) {
      return null;
    }

    return {
      isOn: notification.isOn,
      message: notification.message,
      image: notification.image,
    };
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = 'uploads/notifications';
          if (!existsSync(uploadPath)) {
            mkdirSync(uploadPath, { recursive: true });
          }
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          cb(null, `${uuid()}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              `Unsupported file type ${extname(file.originalname)}. Only jpg, jpeg, png, gif, and webp are allowed.`,
            ),
            false,
          );
        }
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  )
  async updateNotification(
    @Body('isOn') isOn: string,
    @Body('message') message: string,
    @UploadedFile() image: Express.Multer.File,
  ): Promise<{ message: string }> {
    if (!image) {
      throw new BadRequestException('Image file is required');
    }

    if (isOn === undefined || message === undefined) {
      throw new BadRequestException('isOn and message fields are required');
    }

    // Convert string to boolean
    const isOnBoolean = isOn === 'true' || isOn === '1';

    const notificationDto: NotificationDto = {
      isOn: isOnBoolean,
      message: message,
      image: image.path, // Store the file path
    };

    await this.notificationService.updateNotification(notificationDto);

    return { message: 'Notification created successfully' };
  }
}
