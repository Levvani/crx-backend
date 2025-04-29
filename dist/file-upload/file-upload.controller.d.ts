import { FileUploadService, FileEntryDto } from './file-upload.service';
import { FileEntry } from './schemas/file-entry.schema';
export declare class FileUploadController {
    private readonly fileUploadService;
    constructor(fileUploadService: FileUploadService);
    getFileEntries(): Promise<{
        data: FileEntry[];
    }>;
    uploadFile(file: Express.Multer.File): Promise<{
        data: FileEntryDto[];
    }>;
}
