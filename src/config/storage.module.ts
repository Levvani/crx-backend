import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { HetznerStorageService } from './hetzner-storage.service';
import { StorageFactoryService } from './storage-factory.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [StorageService, HetznerStorageService, StorageFactoryService],
  exports: [StorageFactoryService],
})
export class StorageModule {}
