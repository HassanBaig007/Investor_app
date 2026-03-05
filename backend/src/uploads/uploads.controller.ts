import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { diskStorage } from 'multer';
import { extname } from 'node:path';

const ALLOWED_UPLOAD_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

const ALLOWED_UPLOAD_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.pdf',
  '.csv',
  '.xls',
  '.xlsx',
]);

export const isAllowedUploadFile = (file: {
  mimetype?: string;
  originalname?: string;
}): boolean => {
  const mimeType = String(file?.mimetype || '').toLowerCase();
  const extension = extname(String(file?.originalname || '')).toLowerCase();

  return (
    ALLOWED_UPLOAD_MIME_TYPES.has(mimeType) &&
    ALLOWED_UPLOAD_EXTENSIONS.has(extension)
  );
};

const getPublicUploadBaseUrl = (): string => {
  const configuredBaseUrl = String(process.env.PUBLIC_BASE_URL || '').trim();
  const fallbackBaseUrl = 'http://localhost:3000';
  const baseUrl = configuredBaseUrl || fallbackBaseUrl;
  return baseUrl.replace(/\/+$/, '');
};

@Controller('uploads')
export class UploadsController {
  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 10 * 1024 * 1024,
        files: 1,
      },
      fileFilter: (req, file, cb) => {
        if (!isAllowedUploadFile(file)) {
          cb(
            new UnsupportedMediaTypeException(
              'Unsupported file type. Allowed types: jpg, jpeg, png, webp, pdf, csv, xls, xlsx',
            ),
            false,
          );
          return;
        }

        cb(null, true);
      },
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const randomName = new Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          return cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    const publicBaseUrl = getPublicUploadBaseUrl();
    return {
      url: `${publicBaseUrl}/uploads/${file.filename}`,
      filename: file.filename,
      originalname: file.originalname,
    };
  }
}
