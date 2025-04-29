import { Injectable } from '@nestjs/common';
import * as xlsx from 'xlsx';
import * as fs from 'fs-extra';
import * as csvParser from 'csv-parser';
import { Readable } from 'stream';
import { FileEntry } from './schemas/file-entry.schema';
import { FileEntryRepository } from './repositories/file-entry.repository';

// Keep this interface for backward compatibility
export interface FileEntryDto {
  title: string;
  description: string;
}

@Injectable()
export class FileUploadService {
  constructor(
    private readonly fileEntryRepository: FileEntryRepository
  ) {}

  /**
   * Get all file entries from the database
   */
  async getFileEntries(): Promise<FileEntry[]> {
    try {
      return await this.fileEntryRepository.findAll();
    } catch (error) {
      console.error('Error retrieving file entries from database:', error.message);
      throw new Error(`Failed to retrieve file entries: ${error.message}`);
    }
  }

  /**
   * Parse Excel (.xlsx) file
   */
  async parseExcelFile(file: Express.Multer.File): Promise<FileEntryDto[]> {
    if (!file || !file.buffer) {
      throw new Error('Invalid file or file buffer is missing');
    }
    
    try {
      const workbook = xlsx.read(file.buffer, { type: 'buffer' });
      
      // Verify workbook has sheets
      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        throw new Error('No sheets found in the Excel file');
      }
      
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!worksheet) {
        throw new Error('Could not read worksheet from Excel file');
      }
      
      const data = xlsx.utils.sheet_to_json(worksheet);
      if (!data || !Array.isArray(data)) {
        throw new Error('Failed to extract data from Excel file');
      }
      
      return this.validateAndFormatData(data, file);
    } catch (error) {
      throw new Error(`Failed to parse Excel file: ${error.message}`);
    }
  }

  /**
   * Parse CSV file
   */
  async parseCsvFile(file: Express.Multer.File): Promise<FileEntryDto[]> {
    if (!file || !file.buffer) {
      throw new Error('Invalid file or file buffer is missing');
    }
    
    const results: FileEntryDto[] = [];
    
    try {
      return new Promise((resolve, reject) => {
        const stream = Readable.from(file.buffer);
        
        stream
          .pipe(csvParser())
          .on('data', (data) => {
            if (data && typeof data === 'object') {
              results.push(data);
            }
          })
          .on('end', () => resolve(this.validateAndFormatData(results, file)))
          .on('error', (error) => reject(new Error(`CSV parsing error: ${error.message}`)));
      });
    } catch (error) {
      throw new Error(`Failed to parse CSV file: ${error.message}`);
    }
  }

  /**
   * Parse Numbers (macOS) file
   * Note: Numbers files are actually zip files containing XML data
   * For simplicity, we'll convert it to xlsx format first
   */
  async parseNumbersFile(file: Express.Multer.File): Promise<FileEntryDto[]> {
    // Numbers files can be complex to parse directly
    // For production, consider using a more robust solution
    if (!file || !file.buffer) {
      throw new Error('Invalid file or file buffer is missing');
    }
    
    try {
      // Attempt to parse as Excel file
      const workbook = xlsx.read(file.buffer, { type: 'buffer' });
      
      // Verify workbook has sheets
      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        throw new Error('No sheets found in the Numbers file');
      }
      
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!worksheet) {
        throw new Error('Could not read worksheet from Numbers file');
      }
      
      const data = xlsx.utils.sheet_to_json(worksheet);
      return this.validateAndFormatData(data, file);
    } catch (error) {
      throw new Error(`Failed to parse Numbers file: ${error.message}`);
    }
  }

  /**
   * Validate and format data to ensure it has title and description fields
   */
  private validateAndFormatData(data: any[], file?: Express.Multer.File): FileEntryDto[] {
    if (!data || !Array.isArray(data)) {
      return [];
    }
    
    const formattedData = data.map(item => {
      if (!item || typeof item !== 'object') {
        return { title: '', description: '' };
      }
      // Look for title/Title and description/Description fields
      const title = item.title || item.Title || '';
      const description = item.description || item.Description || '';
      
      return { title, description };
    }).filter(item => item.title || item.description); // Filter out empty entries

    // Save the formatted data to MongoDB
    this.saveToDatabase(formattedData, file);
    
    return formattedData;
  }

  /**
   * Save the formatted data to MongoDB
   */
  private async saveToDatabase(data: FileEntryDto[], file?: Express.Multer.File): Promise<void> {
    try {
      // Create entries with file metadata if available
      const entries = data.map(entry => ({
        ...entry,
        fileName: file?.originalname || null,
        fileType: file?.mimetype || null
      }));
      
      // Use the repository to save the data
      await this.fileEntryRepository.saveMany(entries);
    } catch (error) {
      console.error('Error saving file entries to database:', error.message);
      // We don't throw here to avoid breaking the file upload process
      // The data is still returned to the client even if DB save fails
    }
  }
}