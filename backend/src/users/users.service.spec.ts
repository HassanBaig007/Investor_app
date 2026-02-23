import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt', () => ({
  genSalt: jest.fn().mockResolvedValue('test-salt'),
  hash: jest.fn().mockResolvedValue('test-hash'),
  compare: jest.fn(),
}));

describe('UsersService', () => {
  let service: UsersService;

  const mockUserModel = {
    findOne: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    countDocuments: jest.fn(),
  };

  const mockProjectModel = {
    updateMany: jest.fn(),
  };

  // Helper to mock mongoose query chains like .exec()
  const mockQuery = (result: any) => ({
    exec: jest.fn().mockResolvedValue(result),
  });

  beforeEach(async () => {
    // Reset mocks before each test
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getModelToken('User'), useValue: mockUserModel },
        { provide: getModelToken('Project'), useValue: mockProjectModel },
        { provide: getModelToken('AppConfig'), useValue: {} },
        { provide: getModelToken('Spending'), useValue: {} },
        { provide: getModelToken('ModificationRequest'), useValue: {} },
        {
          provide: getModelToken('Notification'),
          useValue: { deleteMany: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ═══════════════════════════════════════════════════════════════════
  // create
  // ═══════════════════════════════════════════════════════════════════
  describe('create', () => {
    class MockUserModel {
      save: jest.Mock<any, any>;
      constructor(dto: any) {
        Object.assign(this, dto);
        this.save = jest.fn().mockResolvedValue(this);
      }
    }

    it('normalizes email, username, and phone before saving', async () => {
      // Mock the save function on the model instance
      (service as any).userModel = MockUserModel;

      const result = await service.create({
        email: '  TeSt@ExAmPle.com  ',
        username: '   MyUserNAME  ',
        phone: ' +1 (555) 123-4567 ',
        password: 'password123',
      });

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 'test-salt');
      expect(result.email).toBe('test@example.com');
      expect(result.username).toBe('myusername');
      expect(result.phone).toBe('+15551234567');
      expect((result as any).passwordHash).toBe('test-hash');
      expect((result as any).password).toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // findByIdentifier stress tests
  // ═══════════════════════════════════════════════════════════════════
  describe('findByIdentifier stress tests', () => {
    it.each(
      Array.from({ length: 25 }, (_, i) => [
        `User${i}@Example.com`,
        `user${i}@example.com`,
      ]),
    )('should normalize identifier %s to %s', async (input, expected) => {
      mockUserModel.findOne.mockReturnValue(mockQuery({ _id: 'u-id' }));
      await service.findByIdentifier(input);
      expect(mockUserModel.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          $or: expect.arrayContaining([{ email: expected }]),
        }),
      );
    });

    it('handles phone number normalization in findByIdentifier', async () => {
      mockUserModel.findOne.mockReturnValue(mockQuery({ _id: 'u1' }));
      await service.findByIdentifier(' +91-98765-43210 ');
      expect(mockUserModel.findOne).toHaveBeenCalledWith({
        $or: [
          { email: '+91-98765-43210' },
          { username: '+91-98765-43210' },
          { phone: '+91-98765-43210' },
          { phone: '+919876543210' },
        ],
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // exportUserData stress tests
  // ═══════════════════════════════════════════════════════════════════
  describe('exportUserData deep validation', () => {
    it('throws NotFoundException if user missing', async () => {
      mockUserModel.findById.mockReturnValue(mockQuery(null));
      await expect(service.exportUserData('u1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it.each(Array.from({ length: 25 }, (_, i) => [i]))(
      'should handle export for user with %i data items',
      async (count) => {
        const user = {
          _id: 'u1',
          email: 'u1@test.com',
          toObject: () => ({ email: 'u1@test.com' }),
        };
        mockUserModel.findById.mockReturnValue(mockQuery(user));

        // Mock all dependencies
        (service as any).projectModel.find = jest.fn().mockReturnValue({
          select: jest.fn().mockReturnThis(),
          lean: jest.fn().mockReturnThis(),
          exec: jest
            .fn()
            .mockResolvedValue(
              new Array(count).fill({ name: 'Project', investors: [] }),
            ),
        });
        (service as any).spendingModel.find = jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnThis(),
          lean: jest.fn().mockReturnThis(),
          exec: jest
            .fn()
            .mockResolvedValue(new Array(count).fill({ category: 'Food' })),
        });
        (service as any).modificationModel.find = jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnThis(),
          lean: jest.fn().mockReturnThis(),
          exec: jest
            .fn()
            .mockResolvedValue(new Array(count).fill({ title: 'Mod' })),
        });
        (service as any).notificationModel.find = jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnThis(),
          lean: jest.fn().mockReturnThis(),
          exec: jest
            .fn()
            .mockResolvedValue(new Array(count).fill({ message: 'Hi' })),
        });

        const res = await service.exportUserData('u1');
        expect(res.userData.profile.email).toBe('u1@test.com');
        expect(res.userData.notifications).toHaveLength(count);
        expect(res.userData.memberships).toHaveLength(count);
      },
    );
  });

  describe('Utility methods', () => {
    it('updateKyc should set verified flag', async () => {
      mockUserModel.findByIdAndUpdate.mockReturnValue(
        mockQuery({ kycVerified: true }),
      );
      await service.updateKyc('u1', { id: 'card' });
      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'u1',
        { kycData: { id: 'card' }, kycVerified: true },
        { returnDocument: 'after' },
      );
    });

    it('getAppConfig should return constants', () => {
      const config = service.getAppConfig();
      expect(config.passwordPolicy.minLength).toBe(10);
      expect(config.disposableEmailDomains).toContain('mailinator.com');
    });

    it('registerPushToken should update settings', async () => {
      mockUserModel.findByIdAndUpdate.mockReturnValue(mockQuery({}));
      await service.registerPushToken('u1', 'token-123');
      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'u1',
        expect.objectContaining({
          'settings.pushToken': 'token-123',
        }),
      );
    });
  });
});
