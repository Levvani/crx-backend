import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ProcessedEntryDocument = ProcessedEntry & Document;

@Schema()
export class ProcessedEntry {
  @Prop({ required: true, unique: true })
  entryId: number;

  @Prop({ required: true })
  processedAt: Date;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  vinCode: string;
}

export const ProcessedEntrySchema = SchemaFactory.createForClass(ProcessedEntry);
