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
exports.FileUploadController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const path_1 = require("path");
const file_upload_service_1 = require("./file-upload.service");
let FileUploadController = class FileUploadController {
    constructor(fileUploadService) {
        this.fileUploadService = fileUploadService;
    }
    async getFileEntries() {
        const entries = await this.fileUploadService.getFileEntries();
        return { data: entries };
    }
    async uploadFile(file) {
        if (!file) {
            throw new common_1.BadRequestException('File is required');
        }
        let data = [];
        const fileExt = (0, path_1.extname)(file.originalname).toLowerCase();
        try {
            switch (fileExt) {
                case '.xlsx':
                    data = (await this.fileUploadService.parseExcelFile(file));
                    break;
                case '.csv':
                    data = (await this.fileUploadService.parseCsvFile(file));
                    break;
                case '.numbers':
                    data = (await this.fileUploadService.parseNumbersFile(file));
                    break;
                default:
                    throw new common_1.BadRequestException(`Unsupported file type: ${fileExt}`);
            }
            return { data };
        }
        catch (error) {
            throw new common_1.BadRequestException(`Failed to process file: ${error.message}`);
        }
    }
};
exports.FileUploadController = FileUploadController;
__decorate([
    (0, common_1.Get)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], FileUploadController.prototype, "getFileEntries", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        storage: undefined,
        fileFilter: (req, file, cb) => {
            const allowedExtensions = ['.xlsx', '.csv', '.numbers'];
            const fileExt = (0, path_1.extname)(file.originalname).toLowerCase();
            if (allowedExtensions.includes(fileExt)) {
                cb(null, true);
            }
            else {
                cb(new common_1.BadRequestException(`Unsupported file type ${fileExt}. Allowed types: ${allowedExtensions.join(', ')}`), false);
            }
        },
        limits: {
            fileSize: 10 * 1024 * 1024,
        },
    })),
    __param(0, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FileUploadController.prototype, "uploadFile", null);
exports.FileUploadController = FileUploadController = __decorate([
    (0, common_1.Controller)('file-upload'),
    __metadata("design:paramtypes", [file_upload_service_1.FileUploadService])
], FileUploadController);
//# sourceMappingURL=file-upload.controller.js.map