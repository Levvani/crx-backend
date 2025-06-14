import { Injectable } from '@nestjs/common';
import { Storage } from '@google-cloud/storage';
import { v4 as uuid } from 'uuid';
import { extname } from 'path';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class StorageService {
  private storage: Storage;
  private bucket: string;

  constructor(private configService: ConfigService) {
    // Initialize Storage with explicit credentials from environment
    const keyFilePath = this.configService.get('GCS_KEY_FILE_PATH');

    if (keyFilePath) {
      this.storage = new Storage({
        keyFilename: keyFilePath,
      });
    } else {
      // Fallback to Application Default Credentials
      this.storage = new Storage();
    }

    this.bucket = this.configService.get('GCS_BUCKET_NAME') || 'default-bucket';
  }

  async uploadFile(file: Express.Multer.File): Promise<string> {
    if (!file) {
      throw new Error('No file provided');
    }

    const fileName = `damages/${uuid()}${extname(file.originalname)}`;
    const fileUpload = this.storage.bucket(this.bucket).file(fileName);

    const stream = fileUpload.createWriteStream({
      metadata: {
        contentType: file.mimetype,
      },
      resumable: false,
    });

    return new Promise((resolve, reject) => {
      stream.on('error', (error) => {
        reject(error);
      });

      stream.on('finish', () => {
        const publicUrl = `https://storage.googleapis.com/${this.bucket}/${fileName}`;
        resolve(publicUrl);
      });

      stream.end(file.buffer);
    });
  }
}
