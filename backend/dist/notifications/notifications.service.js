"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var NotificationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const notification_schema_1 = require("./schemas/notification.schema");
const user_schema_1 = require("../users/schemas/user.schema");
let NotificationService = NotificationService_1 = class NotificationService {
    notificationModel;
    userModel;
    logger = new common_1.Logger(NotificationService_1.name);
    constructor(notificationModel, userModel) {
        this.notificationModel = notificationModel;
        this.userModel = userModel;
    }
    isExpoPushToken(token) {
        return (/^ExponentPushToken\[[^\]]+\]$/.test(token) ||
            /^ExpoPushToken\[[^\]]+\]$/.test(token));
    }
    async sendPush(recipientId, title, body, data = {}) {
        const notification = new this.notificationModel({
            recipient: new mongoose_2.Types.ObjectId(recipientId),
            title,
            body,
            payload: data,
        });
        await notification.save();
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
                this.logger.error(`Expo push send failed for recipient ${recipientId}: ${response.status} ${response.statusText}`);
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
        }
        catch (error) {
            this.logger.error(`Expo push send threw for recipient ${recipientId}: ${error?.message || 'unknown error'}`);
            return {
                notificationId: String(notification._id),
                delivered: false,
                reason: 'expo_request_exception',
            };
        }
    }
    async findAll(recipientId) {
        return this.notificationModel
            .find({ recipient: new mongoose_2.Types.ObjectId(recipientId) })
            .sort({ createdAt: -1 })
            .exec();
    }
    async markAsRead(id, recipientId) {
        return this.notificationModel.findOneAndUpdate({
            _id: new mongoose_2.Types.ObjectId(id),
            recipient: new mongoose_2.Types.ObjectId(recipientId),
        }, { isRead: true }, { returnDocument: 'after' });
    }
    async markAllAsRead(recipientId) {
        const result = await this.notificationModel.updateMany({ recipient: new mongoose_2.Types.ObjectId(recipientId), isRead: false }, { isRead: true });
        return { modifiedCount: result.modifiedCount };
    }
    async remove(id, recipientId) {
        return this.notificationModel.findOneAndDelete({
            _id: new mongoose_2.Types.ObjectId(id),
            recipient: new mongoose_2.Types.ObjectId(recipientId),
        });
    }
};
exports.NotificationService = NotificationService;
exports.NotificationService = NotificationService = NotificationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(notification_schema_1.Notification.name)),
    __param(1, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model])
], NotificationService);
//# sourceMappingURL=notifications.service.js.map