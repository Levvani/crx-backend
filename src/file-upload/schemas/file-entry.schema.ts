import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type FileEntryDocument = FileEntry & Document;

@Schema()
export class FileEntry {
  @Prop({ required: true })
  title: string;

  @Prop({ required: false })
  description: string;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ required: false })
  fileName: string;

  @Prop({ required: false })
  fileType: string;
}

export const FileEntrySchema = SchemaFactory.createForClass(FileEntry);
