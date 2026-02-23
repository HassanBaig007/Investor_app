"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const common_1 = require("@nestjs/common");
const helmet_1 = __importDefault(require("helmet"));
const express_1 = require("express");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.setGlobalPrefix('api');
    app.use((0, helmet_1.default)());
    app.use((0, express_1.json)({ limit: '1mb' }));
    app.use((0, express_1.urlencoded)({ extended: true, limit: '1mb' }));
    let allowedOrigins;
    if (process.env.ALLOWED_ORIGINS) {
        allowedOrigins = process.env.ALLOWED_ORIGINS.split(',');
    }
    else if (process.env.NODE_ENV === 'production') {
        allowedOrigins = ['https://splitflow.app'];
    }
    else {
        allowedOrigins = true;
    }
    app.enableCors({
        origin: allowedOrigins,
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
        credentials: true,
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
    }));
    await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
void bootstrap();
//# sourceMappingURL=main.js.map