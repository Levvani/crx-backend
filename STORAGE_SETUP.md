# Storage Configuration

This application supports two storage providers for file uploads:

## 1. Hetzner Object Storage (Default)

### Environment Variables Required:

```env
STORAGE_PROVIDER=hetzner
HETZNER_ENDPOINT=https://fsn1.your-objectstorage.com
HETZNER_BUCKET_NAME=your-hetzner-bucket-name
HETZNER_ACCESS_KEY_ID=your-hetzner-access-key
HETZNER_SECRET_ACCESS_KEY=your-hetzner-secret-key
```

### Setup Steps:

1. Enable Object Storage in your Hetzner Cloud Console
2. Create a bucket for your application
3. Generate access keys in the Object Storage section
4. Update your environment variables with the provided credentials

## 2. Google Cloud Storage (Legacy)

### Environment Variables Required:

```env
STORAGE_PROVIDER=gcs
GCS_BUCKET_NAME=your-gcs-bucket-name
GCS_KEY_FILE_PATH=path/to/your/gcs-key-file.json
```

### Setup Steps:

1. Create a Google Cloud project
2. Enable Cloud Storage API
3. Create a service account and download the JSON key file
4. Create a bucket and set appropriate permissions
5. Update your environment variables

## Switching Between Providers

To switch between storage providers, simply change the `STORAGE_PROVIDER` environment variable:

- `STORAGE_PROVIDER=hetzner` - Uses Hetzner Object Storage
- `STORAGE_PROVIDER=gcs` - Uses Google Cloud Storage

## File Structure

The storage services are organized as follows:

```
src/config/
├── storage.interface.ts          # Common interface for storage services
├── storage.service.ts            # Google Cloud Storage implementation
├── hetzner-storage.service.ts    # Hetzner Object Storage implementation
├── storage-factory.service.ts    # Factory to choose between providers
└── storage.module.ts             # Module configuration
```

## Usage in Services

The storage factory automatically chooses the correct provider based on your configuration:

```typescript
constructor(private storageFactoryService: StorageFactoryService) {}

async uploadFiles(files: Express.Multer.File[]) {
  const storageService = this.storageFactoryService.getStorageService();
  const uploadPromises = files.map(file => storageService.uploadFile(file));
  return Promise.all(uploadPromises);
}
```

## File URLs

- **Hetzner**: `https://fsn1.your-objectstorage.com/bucket-name/damages/filename.ext`
- **GCS**: `https://storage.googleapis.com/bucket-name/damages/filename.ext`

## Notes

- Both providers store files in a `damages/` folder with UUID-based filenames
- Files are made publicly accessible for easy retrieval
- The system maintains backward compatibility with existing GCS URLs
- Error handling is consistent across both providers
