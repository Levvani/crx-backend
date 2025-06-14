import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FileEntry, FileEntryDocument } from '../schemas/file-entry.schema';
import { FileEntryDto } from '../file-upload.service';

@Injectable()
export class FileEntryRepository {
  constructor(
    @InjectModel(FileEntry.name)
    private fileEntryModel: Model<FileEntryDocument>,
  ) {}

  /**
   * Save multiple file entries to the database
   */
  async saveMany(entries: FileEntryDto[]): Promise<FileEntry[]> {
    try {
      // Create a batch of documents to insert
      const documents = entries.map((entry) => ({
        title: entry.title,
        description: entry.description,
        createdAt: new Date(),
      }));

      // Insert all documents at once if there are any
      if (documents.length > 0) {
        return await this.fileEntryModel.insertMany(documents);
      }
      return [];
    } catch (error) {
      console.error('Error saving file entries to database:', error.message);
      throw error;
    }
  }

  /**
   * Find all file entries
   */
  async findAll(): Promise<FileEntry[]> {
    return this.fileEntryModel.find().exec();
  }
}
