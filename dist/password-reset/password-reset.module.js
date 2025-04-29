"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PasswordResetModule = void 0;
const common_1 = require("@nestjs/common");
const password_reset_service_1 = require("./password-reset.service");
const password_reset_controller_1 = require("./password-reset.controller");
const mongoose_1 = require("@nestjs/mongoose");
const password_reset_schema_1 = require("./schemas/password-reset.schema");
const users_module_1 = require("../users/users.module");
const mailer_1 = require("@nestjs-modules/mailer");
const config_1 = require("@nestjs/config");
let PasswordResetModule = class PasswordResetModule {
};
exports.PasswordResetModule = PasswordResetModule;
exports.PasswordResetModule = PasswordResetModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: password_reset_schema_1.PasswordReset.name, schema: password_reset_schema_1.PasswordResetSchema },
            ]),
            users_module_1.UsersModule,
            mailer_1.MailerModule.forRootAsync({
                imports: [config_1.ConfigModule],
                useFactory: async (configService) => {
                    const config = {
                        transport: {
                            host: configService.get('SMTP_HOST'),
                            port: configService.get('SMTP_PORT'),
                            secure: configService.get('SMTP_SECURE') === 'true',
                            auth: {
                                user: configService.get('SMTP_USER'),
                                pass: configService.get('SMTP_PASS'),
                            },
                            debug: true,
                            logger: true,
                        },
                        defaults: {
                            from: '"CRX Platform" <' + configService.get('SMTP_USER') + '>',
                        },
                    };
                    console.log('Mailer configuration:', {
                        host: config.transport.host,
                        port: config.transport.port,
                        secure: config.transport.secure,
                        user: config.transport.auth.user,
                        hasPass: !!config.transport.auth.pass,
                    });
                    return config;
                },
                inject: [config_1.ConfigService],
            }),
        ],
        controllers: [password_reset_controller_1.PasswordResetController],
        providers: [password_reset_service_1.PasswordResetService],
    })
], PasswordResetModule);
//# sourceMappingURL=password-reset.module.js.map