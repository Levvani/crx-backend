"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const core_2 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const jwt_auth_guard_1 = require("./auth/guards/jwt-auth.guard");
const roles_guard_1 = require("./auth/guards/roles.guard");
async function bootstrap() {
    const logger = new common_1.Logger("Bootstrap");
    try {
        logger.log("Initializing NestJS application...");
        const app = await core_1.NestFactory.create(app_module_1.AppModule);
        const corsOptions = {
            origin: process.env.FRONTEND_URL || "http://localhost:4200",
            credentials: true,
        };
        logger.log("Configuring CORS...");
        app.enableCors(corsOptions);
        logger.log("Applying global validation pipe...");
        app.useGlobalPipes(new common_1.ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }));
        const reflector = app.get(core_2.Reflector);
        app.useGlobalGuards(new jwt_auth_guard_1.JwtAuthGuard(reflector));
        app.useGlobalGuards(new roles_guard_1.RolesGuard(reflector));
        const port = process.env.PORT || 3000;
        logger.log(`Starting server on port ${port}...`);
        await app.listen(port, "0.0.0.0");
        logger.log(`Application is running on: ${await app.getUrl()}`);
    }
    catch (error) {
        logger.error(`Failed to bootstrap application: ${error instanceof Error ? error.message : "Unknown error"}`, error instanceof Error ? error.stack : "No stack trace available");
        process.exit(1);
    }
}
bootstrap().catch((error) => {
    console.error("Unhandled exception during bootstrap:", error);
    process.exit(1);
});
//# sourceMappingURL=main.js.map