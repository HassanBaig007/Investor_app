import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Notification,
  NotificationDocument,
} from './schemas/notification.schema';
import { User, UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class NotificationService implements OnModuleInit {
  private readonly logger = new Logger(NotificationService.name);
  private readonly missingTokenLogAtByRecipient = new Map<string, number>();
  private readonly missingTokenLogCooldownMs = 10 * 60 * 1000;

  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  private shouldLogMissingPushToken(recipientId: string): boolean {
    const now = Date.now();
    const lastLogAt = this.missingTokenLogAtByRecipient.get(recipientId) || 0;
    const shouldLog = now - lastLogAt >= this.missingTokenLogCooldownMs;

    if (shouldLog) {
      if (this.missingTokenLogAtByRecipient.size > 5000) {
        this.missingTokenLogAtByRecipient.clear();
      }
      this.missingTokenLogAtByRecipient.set(recipientId, now);
    }

    return shouldLog;
  }

  private getFcmServerKey(): string {
    return String(process.env.FCM_SERVER_KEY || '').trim();
  }

  onModuleInit() {
    if (!this.getFcmServerKey()) {
      this.logger.warn(
        'FCM_SERVER_KEY is not configured. Remote push delivery is disabled until a valid key is set.',
      );
    }
  }

  private normalizePushToken(token: unknown): string {
    return typeof token === 'string' ? token.trim() : '';
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

    // 2. Remote push (best-effort)
    const recipient = await this.userModel
      .findById(recipientId)
      .select({ settings: 1 })
      .lean()
      .exec();

    const pushEnabled = recipient?.settings?.notifications?.pushEnabled ?? true;
    if (!pushEnabled) {
      return {
        notificationId: String(notification._id),
        delivered: false,
        reason: 'push_disabled',
      };
    }

    const fcmServerKey = this.getFcmServerKey();
    if (!fcmServerKey) {
      return {
        notificationId: String(notification._id),
        delivered: false,
        reason: 'push_provider_not_configured',
      };
    }

    const pushToken = this.normalizePushToken(recipient?.settings?.pushToken);
    if (!pushToken) {
      if (this.shouldLogMissingPushToken(recipientId)) {
        this.logger.debug(
          `Skipping remote push for recipient ${recipientId}: no push token`,
        );
      }
      return {
        notificationId: String(notification._id),
        delivered: false,
        reason: 'missing_or_invalid_push_token',
      };
    }

    try {
      const response = await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          Authorization: `key=${fcmServerKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: pushToken,
          notification: { title, body },
          data,
        }),
      });

      const providerResult = await response.json().catch(() => null);

      if (!response.ok) {
        this.logger.error(
          `Push send failed for recipient ${recipientId}: ${response.status} ${response.statusText}`,
        );
        return {
          notificationId: String(notification._id),
          delivered: false,
          reason: 'push_request_failed',
          providerResult,
        };
      }

      return {
        notificationId: String(notification._id),
        delivered: true,
        providerResult,
      };
    } catch (error) {
      this.logger.error(
        `Push send threw for recipient ${recipientId}: ${(error as Error)?.message || 'unknown error'}`,
      );
      return {
        notificationId: String(notification._id),
        delivered: false,
        reason: 'push_request_exception',
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
