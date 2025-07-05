// src/users/schemas/user.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum UserRole {
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  ACCOUNTANT = 'accountant',
  DEALER = 'dealer',
}

export interface RefreshToken {
  _id?: Types.ObjectId; // MongoDB automatically adds this to array objects
  token: string;
  expiresAt: Date;
}

export type UserDocument = User & Document;

@Schema()
export class User {
  @Prop({ required: true, unique: true })
  userID: number;

  @Prop({ required: true, unique: true })
  username: string;

  @Prop({ required: true })
  firstname: string;

  @Prop({ required: true })
  lastname: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ type: String, enum: UserRole, default: UserRole.DEALER })
  role: UserRole;

  @Prop({ required: false, default: null })
  level: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 0 })
  totalBalance: number;

  @Prop({ default: 0 })
  profitBalance: number;

  @Prop({ required: false })
  phoneNumber: string;

  @Prop({ required: false })
  personalManager: string;

  @Prop({ required: false })
  personalExpert: string;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({
    type: [
      {
        token: String,
        expiresAt: Date,
      },
    ],
    default: [],
    validate: [
      {
        validator: function (tokens: RefreshToken[]) {
          return tokens.length <= 5; // Maximum 5 refresh tokens per user
        },
        message: 'Maximum number of refresh tokens exceeded',
      },
    ],
  })
  refreshTokens: RefreshToken[];
}

export const UserSchema = SchemaFactory.createForClass(User);
