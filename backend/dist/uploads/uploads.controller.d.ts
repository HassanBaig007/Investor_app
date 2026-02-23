import type { Request } from 'express';
export declare class UploadsController {
    uploadFile(req: Request, file: Express.Multer.File): {
        url: string;
        filename: string;
        originalname: string;
    };
}
