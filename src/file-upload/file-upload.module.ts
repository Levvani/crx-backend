import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { FileUploadController } from "./file-upload.controller";
import { FileUploadService } from "./file-upload.service";
import { FileEntry, FileEntrySchema } from "./schemas/file-entry.schema";
import { FileEntryRepository } from "./repositories/file-entry.repository";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FileEntry.name, schema: FileEntrySchema },
    ]),
  ],
  controllers: [FileUploadController],
  providers: [FileUploadService, FileEntryRepository],
  exports: [FileUploadService],
})
export class FileUploadModule {}
