import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { diskStorage } from 'multer';
import { extname } from 'node:path';
import type { Request } from 'express';

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
  uploadFile(@Req() req: Request, @UploadedFile() file: Express.Multer.File) {
    const proto =
      (req.headers['x-forwarded-proto'] as string) || req.protocol || 'http';
    const host =
      (req.headers['x-forwarded-host'] as string) ||
      req.get('host') ||
      'localhost:3000';
    return {
      url: `${proto}://${host}/uploads/${file.filename}`,
      filename: file.filename,
      originalname: file.originalname,
    };
  }
}
