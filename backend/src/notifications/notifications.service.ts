import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Notification,
  NotificationDocument,
} from './schemas/notification.schema';
import { User, UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  private isExpoPushToken(token: string) {
    return (
      /^ExponentPushToken\[[^\]]+\]$/.test(token) ||
      /^ExpoPushToken\[[^\]]+\]$/.test(token)
    );
  }

  async sendPush(
    recipientId: string,
    title: string,
    body: string,
    data: any = {},
  ) {
    // 1. Create Notification in DB
    const notification = new this.notificationModel({
      recipient: new Types.ObjectId(recipientId),
      title,
      body,
      payload: data,
    });
    await notification.save();

    // 2. Remote push via Expo (best-effort)
    const recipient = await this.userModel
      .findById(recipientId)
      .select({ settings: 1 })
      .lean()
      .exec();

    const pushToken = recipient?.settings?.pushToken;
    if (!pushToken || !this.isExpoPushToken(String(pushToken))) {
      this.logger.debug(`No valid push token for recipient ${recipientId}`);
      return {
        notificationId: String(notification._id),
        delivered: false,
        reason: 'missing_or_invalid_push_token',
      };
    }

    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: String(pushToken),
          title,
          body,
          data,
          sound: 'default',
        }),
      });

      const expoResult = await response.json().catch(() => null);

      if (!response.ok) {
        this.logger.error(
          `Expo push send failed for recipient ${recipientId}: ${response.status} ${response.statusText}`,
        );
        return {
          notificationId: String(notification._id),
          delivered: false,
          reason: 'expo_request_failed',
          expoResult,
        };
      }

      return {
        notificationId: String(notification._id),
        delivered: true,
        expoResult,
      };
    } catch (error) {
      this.logger.error(
        `Expo push send threw for recipient ${recipientId}: ${(error as Error)?.message || 'unknown error'}`,
      );
      return {
        notificationId: String(notification._id),
        delivered: false,
        reason: 'expo_request_exception',
      };
    }
  }

  async findAll(recipientId: string) {
    return this.notificationModel
      .find({ recipient: new Types.ObjectId(recipientId) as any })
      .sort({ createdAt: -1 })
      .exec();
  }

  async markAsRead(id: string, recipientId: string) {
    return this.notificationModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(id) as any,
        recipient: new Types.ObjectId(recipientId) as any,
      },
      { isRead: true },
      { returnDocument: 'after' },
    );
  }

  async markAllAsRead(recipientId: string) {
    const result = await this.notificationModel.updateMany(
      { recipient: new Types.ObjectId(recipientId) as any, isRead: false },
      { isRead: true },
    );
    return { modifiedCount: result.modifiedCount };
  }

  async remove(id: string, recipientId: string) {
    return this.notificationModel.findOneAndDelete({
      _id: new Types.ObjectId(id) as any,
      recipient: new Types.ObjectId(recipientId) as any,
    });
  }
}
