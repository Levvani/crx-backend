import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageService } from './storage.service';
import { HetznerStorageService } from './hetzner-storage.service';
import { IStorageService } from './storage.interface';

export enum StorageProvider {
  GCS = 'gcs',
  HETZNER = 'hetzner',
}

@Injectable()
export class StorageFactoryService {
  private provider: StorageProvider;

  constructor(
    private configService: ConfigService,
    private gcsStorageService: StorageService,
    private hetznerStorageService: HetznerStorageService,
  ) {
    this.provider =
      (this.configService.get<string>('STORAGE_PROVIDER') as StorageProvider) ||
      StorageProvider.HETZNER;
  }

  getStorageService(): IStorageService {
    if (this.provider === StorageProvider.GCS) {
      return this.gcsStorageService;
    } else {
      return this.hetznerStorageService;
    }
  }

  getCurrentProvider(): StorageProvider {
    return this.provider;
  }
}
