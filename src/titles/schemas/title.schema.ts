import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type TitleDocument = Title & Document;

@Schema()
export class Title {
  @Prop({ required: true, unique: true })
  titleID: number;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const TitleSchema = SchemaFactory.createForClass(Title);
