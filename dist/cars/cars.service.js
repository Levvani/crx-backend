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
exports.CarsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const car_schema_1 = require("./schemas/car.schema");
let CarsService = class CarsService {
    constructor(carModel) {
        this.carModel = carModel;
    }
    async create(createCarDto, photos) {
        const highestCar = await this.carModel.findOne().sort({ carID: -1 }).exec();
        const nextCarID = highestCar ? highestCar.carID + 1 : 1;
        const newCar = new this.carModel(Object.assign(Object.assign({}, createCarDto), { carID: nextCarID, status: "Purchased", photos: (photos === null || photos === void 0 ? void 0 : photos.map((photo) => `/uploads/cars/${photo.filename}`)) || [] }));
        return newCar.save();
    }
    async findAll(filters, paginationOptions = { page: 1, limit: 25 }) {
        const query = {};
        if (filters) {
            if (filters.vinCode)
                query.vinCode = filters.vinCode;
            if (filters.containerNumber)
                query.containerNumber = filters.containerNumber;
            if (filters.username)
                query.username = filters.username;
            if (filters.status)
                query.status = filters.status;
            if (filters.dateOfPurchase)
                query.dateOfPurchase = filters.dateOfPurchase;
        }
        const { page, limit } = paginationOptions;
        const skip = (page - 1) * limit;
        const [cars, total] = await Promise.all([
            this.carModel
                .find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .exec(),
            this.carModel.countDocuments(query).exec(),
        ]);
        return {
            cars,
            total,
            totalPages: Math.ceil(total / limit),
            page,
            limit,
        };
    }
    async delete(carID) {
        return this.carModel.findOneAndDelete({ carID }).exec();
    }
};
exports.CarsService = CarsService;
exports.CarsService = CarsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(car_schema_1.Car.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], CarsService);
//# sourceMappingURL=cars.service.js.map