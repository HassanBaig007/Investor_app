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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketNewsItemSchema = exports.MarketNewsItem = void 0;
const mongoose_1 = require("@nestjs/mongoose");
let MarketNewsItem = class MarketNewsItem {
    title;
    time;
    category;
    description;
    trend;
    displayOrder;
    isActive;
};
exports.MarketNewsItem = MarketNewsItem;
__decorate([
    (0, mongoose_1.Prop)({ required: true, trim: true }),
    __metadata("design:type", String)
], MarketNewsItem.prototype, "title", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, trim: true }),
    __metadata("design:type", String)
], MarketNewsItem.prototype, "time", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, trim: true }),
    __metadata("design:type", String)
], MarketNewsItem.prototype, "category", void 0);
__decorate([
    (0, mongoose_1.Prop)({ trim: true, default: '' }),
    __metadata("design:type", String)
], MarketNewsItem.prototype, "description", void 0);
__decorate([
    (0, mongoose_1.Prop)({ trim: true, default: '' }),
    __metadata("design:type", String)
], MarketNewsItem.prototype, "trend", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, default: 0 }),
    __metadata("design:type", Number)
], MarketNewsItem.prototype, "displayOrder", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, default: true }),
    __metadata("design:type", Boolean)
], MarketNewsItem.prototype, "isActive", void 0);
exports.MarketNewsItem = MarketNewsItem = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], MarketNewsItem);
exports.MarketNewsItemSchema = mongoose_1.SchemaFactory.createForClass(MarketNewsItem);
//# sourceMappingURL=market-news-item.schema.js.map