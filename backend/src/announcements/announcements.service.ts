import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Announcement,
  AnnouncementDocument,
} from './schemas/announcement.schema';

@Injectable()
export class AnnouncementsService {
  constructor(
    @InjectModel(Announcement.name)
    private readonly announcementModel: Model<AnnouncementDocument>,
  ) {}

  async create(createDto: any, userId: string) {
    const created = new this.announcementModel({
      ...createDto,
      createdBy: userId,
      isActive: true,
    });
    return created.save();
  }

  async findAll() {
    return this.announcementModel
      .find({ isActive: true })
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name')
      .exec();
  }

  async findOne(id: string) {
    return this.announcementModel.findById(id).exec();
  }

  async update(id: string, updateDto: any) {
    return this.announcementModel
      .findByIdAndUpdate(id, updateDto, { returnDocument: 'after' })
      .exec();
  }

  async markAsRead(id: string, userId: string) {
    return this.announcementModel
      .findByIdAndUpdate(
        id,
        { $addToSet: { readBy: userId } },
        { returnDocument: 'after' },
      )
      .exec();
  }

  async remove(id: string) {
    return this.announcementModel.findByIdAndDelete(id).exec();
  }
}
