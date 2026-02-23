import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { AnnouncementsService } from './announcements.service';

describe('AnnouncementsService', () => {
  let service: AnnouncementsService;
  let model: any;

  beforeEach(async () => {
    // We create a mock that can both be called as a function (constructor)
    // and has static methods (like find, findByIdAndUpdate)
    const mockModel: any = jest.fn().mockImplementation((dto) => ({
      ...dto,
      save: jest.fn().mockResolvedValue({ ...dto, _id: 'mock-id' }),
    }));

    mockModel.find = jest.fn().mockReturnThis();
    mockModel.findById = jest.fn().mockReturnThis();
    mockModel.findByIdAndUpdate = jest.fn().mockReturnThis();
    mockModel.findByIdAndDelete = jest.fn().mockReturnThis();
    mockModel.sort = jest.fn().mockReturnThis();
    mockModel.populate = jest.fn().mockReturnThis();
    mockModel.exec = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnnouncementsService,
        {
          provide: getModelToken('Announcement'),
          useValue: mockModel,
        },
      ],
    }).compile();

    service = module.get<AnnouncementsService>(AnnouncementsService);
    model = module.get(getModelToken('Announcement'));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it.each(
      Array.from({ length: 25 }, (_, i) => [
        { title: `Title ${i}`, content: `Content ${i}` },
        `user-${i}`,
      ]),
    )('should create announcement #%#', async (dto, userId) => {
      const res = await service.create(dto, userId);
      expect(res._id).toBe('mock-id');
      expect(res.createdBy).toBe(userId);
    });
  });

  describe('markAsRead', () => {
    it.each(Array.from({ length: 20 }, (_, i) => [`ann-${i}`, `user-${i}`]))(
      'should mark as read #%#',
      async (aid, uid) => {
        model.exec.mockResolvedValueOnce({ _id: aid, readBy: [uid] });
        const res = await service.markAsRead(aid, uid);
        expect(model.findByIdAndUpdate).toHaveBeenCalled();
        expect(res._id).toBe(aid);
      },
    );
  });

  describe('CRUD', () => {
    it('findAll', async () => {
      model.exec.mockResolvedValueOnce([]);
      await service.findAll();
      expect(model.find).toHaveBeenCalled();
    });

    it('findOne', async () => {
      model.exec.mockResolvedValueOnce({ id: '1' });
      await service.findOne('1');
      expect(model.findById).toHaveBeenCalledWith('1');
    });

    it('update', async () => {
      model.exec.mockResolvedValueOnce({});
      await service.update('1', {});
      expect(model.findByIdAndUpdate).toHaveBeenCalled();
    });

    it('remove', async () => {
      model.exec.mockResolvedValueOnce({});
      await service.remove('1');
      expect(model.findByIdAndDelete).toHaveBeenCalledWith('1');
    });
  });
});
