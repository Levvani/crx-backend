import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuid } from 'uuid';
import { extname } from 'path';
import * as AWS from 'aws-sdk';
import { IStorageService } from './storage.interface';

@Injectable()
export class HetznerStorageService implements IStorageService {
  private s3Client: AWS.S3;
  private bucket: string;
  private endpoint: string;

  constructor(private configService: ConfigService) {
    this.endpoint =
      this.configService.get<string>('HETZNER_ENDPOINT') || 'https://fsn1.your-objectstorage.com';
    this.bucket = this.configService.get<string>('HETZNER_BUCKET_NAME') || 'default-bucket';

    const accessKeyId = this.configService.get<string>('HETZNER_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('HETZNER_SECRET_ACCESS_KEY');

    if (!accessKeyId || !secretAccessKey) {
      throw new Error('Hetzner Object Storage credentials are required');
    }

    this.s3Client = new AWS.S3({
      endpoint: this.endpoint,
      accessKeyId: accessKeyId,
      secretAccessKey: secretAccessKey,
      s3ForcePathStyle: true, // Required for Hetzner Object Storage
      signatureVersion: 'v4',
      region: 'us-east-1', // Hetzner doesn't require a specific region
    });
  }

  async uploadFile(file: Express.Multer.File, folder: string = 'damages'): Promise<string> {
    if (!file) {
      throw new Error('No file provided');
    }

    const fileName = `${folder}/${uuid()}${extname(file.originalname)}`;

    try {
      const params: AWS.S3.PutObjectRequest = {
        Bucket: this.bucket,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'public-read', // Make the file publicly accessible
      };

      await this.s3Client.putObject(params).promise();
      const publicUrl = `${this.endpoint}/${this.bucket}/${fileName}`;
      return publicUrl;
    } catch (error) {
      console.error('Hetzner upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to upload file to Hetzner: ${errorMessage}`);
    }
  }

  async deleteFile(fileUrl: string): Promise<void> {
    try {
      // Extract the key from the URL
      const urlParts = fileUrl.split('/');
      const key = urlParts.slice(-2).join('/'); // Get 'folder/filename.ext'

      const params: AWS.S3.DeleteObjectRequest = {
        Bucket: this.bucket,
        Key: key,
      };

      await this.s3Client.deleteObject(params).promise();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to delete file from Hetzner: ${errorMessage}`);
    }
  }
}
