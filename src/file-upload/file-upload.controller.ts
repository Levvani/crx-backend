import {
  Controller,
  Post,
  Get,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { extname } from 'path';
import { FileUploadService, FileEntryDto } from './file-upload.service';
import { FileEntry } from './schemas/file-entry.schema';

@Controller('file-upload')
export class FileUploadController {
  constructor(private readonly fileUploadService: FileUploadService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getFileEntries(): Promise<{ data: FileEntry[] }> {
    const entries = await this.fileUploadService.getFileEntries();
    return { data: entries };
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: undefined, // Explicitly set to undefined to keep file in memory as buffer
      fileFilter: (req, file, cb) => {
        const allowedExtensions = ['.xlsx', '.csv', '.numbers'];
        const fileExt = extname(file.originalname).toLowerCase();

        if (allowedExtensions.includes(fileExt)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              `Unsupported file type ${fileExt}. Allowed types: ${allowedExtensions.join(', ')}`,
            ),
            false,
          );
        }
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  )
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ data: FileEntryDto[] }> {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    let data: FileEntry[] = [];
    const fileExt = extname(file.originalname).toLowerCase();

    try {
      switch (fileExt) {
        case '.xlsx':
          data = (await this.fileUploadService.parseExcelFile(
            file,
          )) as FileEntry[];
          break;
        case '.csv':
          data = (await this.fileUploadService.parseCsvFile(
            file,
          )) as FileEntry[];
          break;
        case '.numbers':
          data = (await this.fileUploadService.parseNumbersFile(
            file,
          )) as FileEntry[];
          break;
        default:
          throw new BadRequestException(`Unsupported file type: ${fileExt}`);
      }

      return { data };
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      throw new BadRequestException(`Failed to process file: ${error.message}`);
    }
  }
}
