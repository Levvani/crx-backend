import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification, NotificationDocument } from './schemas/notification.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { NotificationDto } from './dto/notification.dto';
import { StorageFactoryService } from '../config/storage-factory.service';

@Injectable()
export class NotificationService {
  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<NotificationDocument>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
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

  private async generateNotificationId(): Promise<number> {
    // Find the highest notification ID across all users
    const result = await this.userModel.aggregate([
      { $unwind: '$notifications' },
      { $group: { _id: null, maxId: { $max: '$notifications.id' } } }
    ]).exec();
    
    return result.length > 0 ? (result[0].maxId || 0) + 1 : 1;
  }

  async updateNotification(notificationDto: NotificationDto): Promise<Notification> {
    // Get the current notification to check if message is changing
    const currentNotification = await this.notificationModel.findOne({}).exec();
    const isNewMessage = !currentNotification || currentNotification.message !== notificationDto.message;

    // Since we want to overwrite with new values, we'll use findOneAndUpdate with upsert
    // This will update the existing notification or create a new one if none exists
    const updateData: Partial<Notification> = {
      isOn: notificationDto.isOn,
      message: notificationDto.message,
    };

    // Update image if provided (including null to clear it)
    if (notificationDto.image !== undefined) {
      updateData.image = notificationDto.image;
    } else {
      updateData.image = null;
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

    // If this is a new message, add it to all users
    if (isNewMessage) {
      await this.addNotificationToAllUsers(notificationDto.message);
    }

    return updatedNotification;
  }

  private async addNotificationToAllUsers(message: string): Promise<void> {
    try {
      const notificationId = await this.generateNotificationId();
      const currentTime = new Date();

      // Use bulk operation to efficiently update all users
      const bulkOps = await this.userModel.find({}).lean().exec();
      
      if (bulkOps.length === 0) {
        console.log('No users found to add notification to');
        return;
      }

      // Prepare bulk operations
      const bulkOperations = bulkOps.map(user => ({
        updateOne: {
          filter: { _id: user._id },
          update: {
            $push: {
              notifications: {
                id: notificationId,
                isRead: false,
                message: message,
                createTime: currentTime,
                seenTime: null
              }
            }
          }
        }
      }));

      // Execute bulk operation
      const result = await this.userModel.bulkWrite(bulkOperations);
      
      console.log(`Successfully added notification to ${result.modifiedCount} users`);
    } catch (error) {
      console.error('Error adding notification to all users:', error);
      throw new Error(`Failed to add notification to users: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
}
