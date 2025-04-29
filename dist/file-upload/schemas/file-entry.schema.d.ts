import { Document } from 'mongoose';
export type FileEntryDocument = FileEntry & Document;
export declare class FileEntry {
    title: string;
    description: string;
    createdAt: Date;
    fileName: string;
    fileType: string;
}
export declare const FileEntrySchema: import("mongoose").Schema<FileEntry, import("mongoose").Model<FileEntry, any, any, any, Document<unknown, any, FileEntry, any> & FileEntry & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, FileEntry, Document<unknown, {}, import("mongoose").FlatRecord<FileEntry>, {}> & import("mongoose").FlatRecord<FileEntry> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
