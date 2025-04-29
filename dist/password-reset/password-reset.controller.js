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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PasswordResetController = void 0;
const common_1 = require("@nestjs/common");
const password_reset_service_1 = require("./password-reset.service");
const public_decorator_1 = require("../auth/decorators/public.decorator");
const password_reset_dto_1 = require("./dto/password-reset.dto");
let PasswordResetController = class PasswordResetController {
    constructor(passwordResetService) {
        this.passwordResetService = passwordResetService;
    }
    async requestReset({ email }) {
        if (!email) {
            throw new common_1.BadRequestException('Email is required');
        }
        await this.passwordResetService.createPasswordResetToken(email);
        return {
            message: 'If an account exists with this email, a password reset link has been sent.',
        };
    }
    async resetPassword({ token, newPassword }) {
        if (!token || !newPassword) {
            throw new common_1.BadRequestException('Token and new password are required');
        }
        await this.passwordResetService.resetPassword(token, newPassword);
        return { message: 'Password has been successfully reset' };
    }
};
exports.PasswordResetController = PasswordResetController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('request'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [password_reset_dto_1.RequestResetDto]),
    __metadata("design:returntype", Promise)
], PasswordResetController.prototype, "requestReset", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('reset'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [password_reset_dto_1.ResetPasswordDto]),
    __metadata("design:returntype", Promise)
], PasswordResetController.prototype, "resetPassword", null);
exports.PasswordResetController = PasswordResetController = __decorate([
    (0, common_1.Controller)('password-reset'),
    __metadata("design:paramtypes", [password_reset_service_1.PasswordResetService])
], PasswordResetController);
//# sourceMappingURL=password-reset.controller.js.map