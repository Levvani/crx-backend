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
exports.FileUploadService = void 0;
const common_1 = require("@nestjs/common");
const xlsx = require("xlsx");
const csvParser = require("csv-parser");
const stream_1 = require("stream");
const file_entry_repository_1 = require("./repositories/file-entry.repository");
let FileUploadService = class FileUploadService {
    constructor(fileEntryRepository) {
        this.fileEntryRepository = fileEntryRepository;
    }
    async getFileEntries() {
        try {
            return await this.fileEntryRepository.findAll();
        }
        catch (error) {
            console.error('Error retrieving file entries from database:', error.message);
            throw new Error(`Failed to retrieve file entries: ${error.message}`);
        }
    }
    async parseExcelFile(file) {
        if (!file || !file.buffer) {
            throw new Error('Invalid file or file buffer is missing');
        }
        try {
            const workbook = xlsx.read(file.buffer, { type: 'buffer' });
            if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
                throw new Error('No sheets found in the Excel file');
            }
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            if (!worksheet) {
                throw new Error('Could not read worksheet from Excel file');
            }
            const data = xlsx.utils.sheet_to_json(worksheet);
            if (!data || !Array.isArray(data)) {
                throw new Error('Failed to extract data from Excel file');
            }
            return this.validateAndFormatData(data, file);
        }
        catch (error) {
            throw new Error(`Failed to parse Excel file: ${error.message}`);
        }
    }
    async parseCsvFile(file) {
        if (!file || !file.buffer) {
            throw new Error('Invalid file or file buffer is missing');
        }
        const results = [];
        try {
            return new Promise((resolve, reject) => {
                const stream = stream_1.Readable.from(file.buffer);
                stream
                    .pipe(csvParser())
                    .on('data', (data) => {
                    if (data && typeof data === 'object') {
                        results.push(data);
                    }
                })
                    .on('end', () => resolve(this.validateAndFormatData(results, file)))
                    .on('error', (error) => reject(new Error(`CSV parsing error: ${error.message}`)));
            });
        }
        catch (error) {
            throw new Error(`Failed to parse CSV file: ${error.message}`);
        }
    }
    async parseNumbersFile(file) {
        if (!file || !file.buffer) {
            throw new Error('Invalid file or file buffer is missing');
        }
        try {
            const workbook = xlsx.read(file.buffer, { type: 'buffer' });
            if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
                throw new Error('No sheets found in the Numbers file');
            }
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            if (!worksheet) {
                throw new Error('Could not read worksheet from Numbers file');
            }
            const data = xlsx.utils.sheet_to_json(worksheet);
            return this.validateAndFormatData(data, file);
        }
        catch (error) {
            throw new Error(`Failed to parse Numbers file: ${error.message}`);
        }
    }
    validateAndFormatData(data, file) {
        if (!data || !Array.isArray(data)) {
            return [];
        }
        const formattedData = data.map(item => {
            if (!item || typeof item !== 'object') {
                return { title: '', description: '' };
            }
            const title = item.title || item.Title || '';
            const description = item.description || item.Description || '';
            return { title, description };
        }).filter(item => item.title || item.description);
        this.saveToDatabase(formattedData, file);
        return formattedData;
    }
    async saveToDatabase(data, file) {
        try {
            const entries = data.map(entry => (Object.assign(Object.assign({}, entry), { fileName: (file === null || file === void 0 ? void 0 : file.originalname) || null, fileType: (file === null || file === void 0 ? void 0 : file.mimetype) || null })));
            await this.fileEntryRepository.saveMany(entries);
        }
        catch (error) {
            console.error('Error saving file entries to database:', error.message);
        }
    }
};
exports.FileUploadService = FileUploadService;
exports.FileUploadService = FileUploadService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [file_entry_repository_1.FileEntryRepository])
], FileUploadService);
//# sourceMappingURL=file-upload.service.js.map