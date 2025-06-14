import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type DealerTypeDocument = DealerType & Document;

@Schema({ timestamps: true })
export class DealerType extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  amount: number;
}

export const DealerTypeSchema = SchemaFactory.createForClass(DealerType);
