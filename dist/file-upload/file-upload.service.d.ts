import { FileEntry } from './schemas/file-entry.schema';
import { FileEntryRepository } from './repositories/file-entry.repository';
export interface FileEntryDto {
    title: string;
    description: string;
}
export declare class FileUploadService {
    private readonly fileEntryRepository;
    constructor(fileEntryRepository: FileEntryRepository);
    getFileEntries(): Promise<FileEntry[]>;
    parseExcelFile(file: Express.Multer.File): Promise<FileEntryDto[]>;
    parseCsvFile(file: Express.Multer.File): Promise<FileEntryDto[]>;
    parseNumbersFile(file: Express.Multer.File): Promise<FileEntryDto[]>;
    private validateAndFormatData;
    private saveToDatabase;
}
