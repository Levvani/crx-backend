import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification, NotificationDocument } from './schemas/notification.schema';
import { NotificationDto } from './dto/notification.dto';
import { StorageFactoryService } from '../config/storage-factory.service';

@Injectable()
export class NotificationService {
  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<NotificationDocument>,
    private storageFactoryService: StorageFactoryService,
  ) {}

  async uploadImage(image: Express.Multer.File): Promise<string> {
    if (!image) {
      throw new Error('No image provided');
    }

    try {
      const storageService = this.storageFactoryService.getStorageService();
      const imageUrl = await storageService.uploadFile(image, 'notifications');
      return imageUrl;
    } catch (error) {
      console.error('Error uploading notification image:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to upload image: ${errorMessage}`);
    }
  }

  async updateNotification(notificationDto: NotificationDto): Promise<Notification> {
    // Since we want to overwrite with new values, we'll use findOneAndUpdate with upsert
    // This will update the existing notification or create a new one if none exists
    const updateData: Partial<Notification> = {
      isOn: notificationDto.isOn,
      message: notificationDto.message,
    };

    // Only update image if it's provided, otherwise keep existing
    if (notificationDto.image !== undefined) {
      updateData.image = notificationDto.image;
    }

    const updatedNotification = await this.notificationModel.findOneAndUpdate(
      {}, // Empty filter to match any document (assuming single notification settings)
      updateData,
      {
        new: true, // Return the updated document
        upsert: true, // Create if doesn't exist
        runValidators: true,
      },
    );

    return updatedNotification;
  }

  async getCurrentNotification(): Promise<Notification | null> {
    const notification = await this.notificationModel.findOne({}).exec();

    // If notification exists and has a local file path, return null for image
    if (notification && notification.image && notification.image.startsWith('uploads/')) {
      // Return notification without the local image path
      return {
        ...notification.toObject(),
        image: null,
      };
    }

    return notification;
  }

  async updateNotificationImage(imageUrl: string | null): Promise<Notification> {
    const updateData: Partial<Notification> = {
      image: imageUrl,
    };

    const updatedNotification = await this.notificationModel.findOneAndUpdate(
      {}, // Empty filter to match any document
      updateData,
      {
        new: true, // Return the updated document
        upsert: true, // Create if doesn't exist
        runValidators: true,
      },
    );

    return updatedNotification;
  }
}
