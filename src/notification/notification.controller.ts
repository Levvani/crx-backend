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

  @Post('upload-image')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @UseInterceptors(
    FileInterceptor('image', {
      fileFilter: (req, file, cb) => {
        if (file.mimetype.match(/\/(jpg|jpeg|png|gif|webp|avif|bmp|tiff|svg)$/)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              `Unsupported file type. Supported types: jpg, jpeg, png, gif, webp, avif, bmp, tiff, svg`,
            ),
            false,
          );
        }
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  )
  async uploadImage(
    @UploadedFile() image: Express.Multer.File,
  ): Promise<{ imageUrl: string; message: string }> {
    if (!image) {
      throw new BadRequestException('Image file is required');
    }

    const imageUrl = await this.notificationService.uploadImage(image);

    // Update the notification record with the new image URL
    await this.notificationService.updateNotificationImage(imageUrl);

    return {
      imageUrl,
      message: 'Image uploaded and notification updated successfully',
    };
  }

  @Post('clear-image')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  async clearImage(): Promise<{ message: string }> {
    await this.notificationService.updateNotificationImage(null);
    return { message: 'Notification image cleared successfully' };
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  async updateNotification(
    @Body('isOn') isOn: string,
    @Body('message') message: string,
  ): Promise<{ message: string }> {
    if (isOn === undefined || message === undefined) {
      throw new BadRequestException('isOn and message fields are required');
    }

    // Convert string to boolean
    const isOnBoolean = isOn === 'true' || isOn === '1';

    const notificationDto: Partial<NotificationDto> = {
      isOn: isOnBoolean,
      message: message,
    };

    await this.notificationService.updateNotification(notificationDto as NotificationDto);

    return { message: 'Notification updated successfully' };
  }
}
