import { Test, TestingModule } from '@nestjs/testing';
import { UploadsController, isAllowedUploadFile } from './uploads.controller';

describe('UploadsController', () => {
  let controller: UploadsController;
  const originalPublicBaseUrl = process.env.PUBLIC_BASE_URL;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UploadsController],
    }).compile();

    controller = module.get<UploadsController>(UploadsController);
    delete process.env.PUBLIC_BASE_URL;
  });

  afterAll(() => {
    if (originalPublicBaseUrl === undefined) {
      delete process.env.PUBLIC_BASE_URL;
      return;
    }

    process.env.PUBLIC_BASE_URL = originalPublicBaseUrl;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('isAllowedUploadFile', () => {
    it('returns true for supported mime and extension combinations', () => {
      expect(
        isAllowedUploadFile({
          mimetype: 'application/pdf',
          originalname: 'report.pdf',
        } as Express.Multer.File),
      ).toBe(true);

      expect(
        isAllowedUploadFile({
          mimetype:
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          originalname: 'statement.xlsx',
        } as Express.Multer.File),
      ).toBe(true);
    });

    it('returns false for unsupported mime or extension', () => {
      expect(
        isAllowedUploadFile({
          mimetype: 'application/x-msdownload',
          originalname: 'malware.exe',
        } as Express.Multer.File),
      ).toBe(false);

      expect(
        isAllowedUploadFile({
          mimetype: 'application/pdf',
          originalname: 'shell.php',
        } as Express.Multer.File),
      ).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // uploadFile
  // ═══════════════════════════════════════════════════════════════════
  describe('uploadFile', () => {
    it('returns upload URL from configured PUBLIC_BASE_URL', () => {
      process.env.PUBLIC_BASE_URL = 'https://my.cdn.com/';
      const mockFile = {
        filename: 'test-file.jpg',
        originalname: 'test-file.jpg',
      } as any;
      const result = controller.uploadFile(mockFile);

      expect(result).toEqual({
        url: 'https://my.cdn.com/uploads/test-file.jpg',
        filename: 'test-file.jpg',
        originalname: 'test-file.jpg',
      });
    });

    it('falls back to localhost base URL when PUBLIC_BASE_URL is not set', () => {
      const mockFile = {
        filename: 'test-file.jpg',
        originalname: 'test-file.jpg',
      } as any;

      const result = controller.uploadFile(mockFile);

      expect(result).toEqual({
        url: 'http://localhost:3000/uploads/test-file.jpg',
        filename: 'test-file.jpg',
        originalname: 'test-file.jpg',
      });
    });
  });
});
