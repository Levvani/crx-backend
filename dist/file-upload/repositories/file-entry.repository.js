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
exports.FileEntryRepository = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const file_entry_schema_1 = require("../schemas/file-entry.schema");
let FileEntryRepository = class FileEntryRepository {
    constructor(fileEntryModel) {
        this.fileEntryModel = fileEntryModel;
    }
    async saveMany(entries) {
        try {
            const documents = entries.map(entry => ({
                title: entry.title,
                description: entry.description,
                createdAt: new Date()
            }));
            if (documents.length > 0) {
                return await this.fileEntryModel.insertMany(documents);
            }
            return [];
        }
        catch (error) {
            console.error('Error saving file entries to database:', error.message);
            throw error;
        }
    }
    async findAll() {
        return this.fileEntryModel.find().exec();
    }
};
exports.FileEntryRepository = FileEntryRepository;
exports.FileEntryRepository = FileEntryRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(file_entry_schema_1.FileEntry.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], FileEntryRepository);
//# sourceMappingURL=file-entry.repository.js.map