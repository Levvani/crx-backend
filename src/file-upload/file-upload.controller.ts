import {
  Controller,
  Post,
  Get,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";

import { extname } from "path";
import { FileUploadService, FileEntryDto } from "./file-upload.service";
import { FileEntry } from "./schemas/file-entry.schema";
import { TitlesService } from "../titles/titles.service";
import { CreateTitleDto } from "../titles/dto/create-title.dto";
import { Title } from "../titles/schemas/title.schema";

@Controller("file-upload")
export class FileUploadController {
  constructor(
    private readonly fileUploadService: FileUploadService,
    private readonly titlesService: TitlesService
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getFileEntries(): Promise<{ data: FileEntry[] }> {
    const entries = await this.fileUploadService.getFileEntries();
    return { data: entries };
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor("file", {
      storage: undefined, // Explicitly set to undefined to keep file in memory as buffer
      fileFilter: (req, file, cb) => {
        const allowedExtensions = [".xlsx", ".csv", ".numbers"];
        const fileExt = extname(file.originalname).toLowerCase();

        if (allowedExtensions.includes(fileExt)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              `Unsupported file type ${fileExt}. Allowed types: ${allowedExtensions.join(", ")}`
            ),
            false
          );
        }
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    })
  )
  async uploadFile(
    @UploadedFile() file: Express.Multer.File
  ): Promise<{ data: FileEntryDto[]; titles: Title[]; processedRows: number }> {
    if (!file) {
      throw new BadRequestException("File is required");
    }

    console.time("fileProcessing");
    let data: FileEntry[] = [];
    const fileExt = extname(file.originalname).toLowerCase();

    try {
      switch (fileExt) {
        case ".xlsx":
          data = (await this.fileUploadService.parseExcelFile(
            file
          )) as FileEntry[];
          break;
        case ".csv":
          data = (await this.fileUploadService.parseCsvFile(
            file
          )) as FileEntry[];
          break;
        case ".numbers":
          data = (await this.fileUploadService.parseNumbersFile(
            file
          )) as FileEntry[];
          break;
        default:
          throw new BadRequestException(`Unsupported file type: ${fileExt}`);
      }

      console.log(`Parsed ${data.length} entries from file`);
      console.time("titleCreation");

      // Map the parsed data to CreateTitleDto objects
      const titleDtos: CreateTitleDto[] = data.map((entry) => ({
        name: entry.title, // Use 'title' field from the parsed data as 'name'
        description: entry.description,
      }));

      // Send data to titles endpoint using the bulk creation method
      let createdTitles: Title[] = [];
      if (titleDtos.length > 0) {
        // Use createBulk directly for better performance with large datasets
        createdTitles = await this.titlesService.createBulk(titleDtos);
        console.log(`Successfully created ${createdTitles.length} titles`);
      }

      console.timeEnd("titleCreation");
      console.timeEnd("fileProcessing");

      return {
        data,
        titles: createdTitles,
        processedRows: data.length,
      };
    } catch (error) {
      console.error("Error processing file:", error);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      throw new BadRequestException(`Failed to process file: ${error.message}`);
    }
  }
}
