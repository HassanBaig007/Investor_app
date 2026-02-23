import { Test, TestingModule } from '@nestjs/testing';
import { UploadsController } from './uploads.controller';

describe('UploadsController', () => {
  let controller: UploadsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UploadsController],
    }).compile();

    controller = module.get<UploadsController>(UploadsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ═══════════════════════════════════════════════════════════════════
  // uploadFile
  // ═══════════════════════════════════════════════════════════════════
  describe('uploadFile', () => {
    it('throws TypeError if req is undefined', () => {
      // The controller throws a TypeError internally if it tries to access headers on undefined
      expect(() => controller.uploadFile(undefined as any, {} as any)).toThrow(
        TypeError,
      );
    });

    it('returns the configured file path using req headers for protocol and host', () => {
      const mockReq = {
        headers: {
          'x-forwarded-proto': 'https',
          'x-forwarded-host': 'my.cdn.com',
        },
        protocol: 'http',
        get: jest.fn(),
      } as any;

      const mockFile = {
        filename: 'test-file.jpg',
        originalname: 'test-file.jpg',
      } as any;
      const result = controller.uploadFile(mockReq, mockFile);

      expect(result).toEqual({
        url: 'https://my.cdn.com/uploads/test-file.jpg',
        filename: 'test-file.jpg',
        originalname: 'test-file.jpg',
      });
    });
  });
});
