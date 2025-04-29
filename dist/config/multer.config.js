"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.multerOptions = exports.multerConfig = void 0;
const path_1 = require("path");
const fs_1 = require("fs");
const multer_1 = require("multer");
const uuid_1 = require("uuid");
exports.multerConfig = {
    dest: 'uploads/cars',
};
exports.multerOptions = {
    fileFilter: (req, file, cb) => {
        if (file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
            cb(null, true);
        }
        else {
            cb(new Error(`Unsupported file type ${(0, path_1.extname)(file.originalname)}`), false);
        }
    },
    storage: (0, multer_1.diskStorage)({
        destination: (req, file, cb) => {
            const uploadPath = exports.multerConfig.dest;
            if (!(0, fs_1.existsSync)(uploadPath)) {
                (0, fs_1.mkdirSync)(uploadPath, { recursive: true });
            }
            cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
            cb(null, `${(0, uuid_1.v4)()}${(0, path_1.extname)(file.originalname)}`);
        },
    }),
    limits: {
        fileSize: 5 * 1024 * 1024,
    },
};
//# sourceMappingURL=multer.config.js.map