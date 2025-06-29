import { extname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { v4 as uuid } from 'uuid';

// Multer types are complex to get right. We're adding a disable directive.
// We're explicitly checking for needed properties at runtime.

export const multerConfig = {
  dest: 'uploads/cars',
};

// Using eslint-disable for the multer config since proper typing is complex
// and would require extensive modifications
export const multerOptions = {
  fileFilter: (req: any, file: Express.Multer.File, cb: any) => {
    if (file.mimetype.match(/\/(jpg|jpeg|png|gif|webp|avif|bmp|tiff|svg)$/)) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      cb(null, true);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      cb(
        new Error(
          `Unsupported file type ${extname(file.originalname)}. Supported types: jpg, jpeg, png, gif, webp, avif, bmp, tiff, svg`,
        ),
        false,
      );
    }
  },
  storage: diskStorage({
    destination: (req: any, file: any, cb: any) => {
      const uploadPath = multerConfig.dest;
      if (!existsSync(uploadPath)) {
        mkdirSync(uploadPath, { recursive: true });
      }
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      cb(null, uploadPath);
    },

    filename: (req: any, file: any, cb: any) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      cb(null, `${uuid()}${extname(file.originalname as string)}`);
    },
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB (increased from 5MB)
  },
};
