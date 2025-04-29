import { Document } from 'mongoose';
export declare enum UserRole {
    ADMIN = "admin",
    MODERATOR = "moderator",
    ACCOUNTANT = "accountant",
    DEALER = "dealer"
}
export type UserDocument = User & Document;
export declare class User {
    userID: number;
    username: string;
    firstname: string;
    lastname: string;
    password: string;
    email: string;
    role: UserRole;
    level: string;
    isActive: boolean;
    totalBalance: number;
    profitBalance: number;
    phoneNumber: number;
    createdAt: Date;
}
export declare const UserSchema: import("mongoose").Schema<User, import("mongoose").Model<User, any, any, any, Document<unknown, any, User, any> & User & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, User, Document<unknown, {}, import("mongoose").FlatRecord<User>, {}> & import("mongoose").FlatRecord<User> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
