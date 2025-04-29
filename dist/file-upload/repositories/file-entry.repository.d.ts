import { Model } from 'mongoose';
import { FileEntry, FileEntryDocument } from '../schemas/file-entry.schema';
import { FileEntryDto } from '../file-upload.service';
export declare class FileEntryRepository {
    private fileEntryModel;
    constructor(fileEntryModel: Model<FileEntryDocument>);
    saveMany(entries: FileEntryDto[]): Promise<FileEntry[]>;
    findAll(): Promise<FileEntry[]>;
}
