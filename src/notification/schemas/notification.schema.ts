import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type NotificationDocument = Notification & Document;

@Schema({ timestamps: true })
export class Notification {
  @Prop({ required: true })
  isOn: boolean;

  @Prop({ required: true })
  message: string;

  @Prop({ required: false })
  image: string;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
