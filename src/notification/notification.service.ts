import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification, NotificationDocument } from './schemas/notification.schema';
import { NotificationDto } from './dto/notification.dto';

@Injectable()
export class NotificationService {
  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<NotificationDocument>,
  ) {}

  async updateNotification(notificationDto: NotificationDto): Promise<Notification> {
    // Since we want to overwrite with new values, we'll use findOneAndUpdate with upsert
    // This will update the existing notification or create a new one if none exists
    const updatedNotification = await this.notificationModel.findOneAndUpdate(
      {}, // Empty filter to match any document (assuming single notification settings)
      {
        isOn: notificationDto.isOn,
        message: notificationDto.message,
        image: notificationDto.image,
      },
      {
        new: true, // Return the updated document
        upsert: true, // Create if doesn't exist
        runValidators: true,
      },
    );

    return updatedNotification;
  }

  async getCurrentNotification(): Promise<Notification | null> {
    return this.notificationModel.findOne({}).exec();
  }
}
