"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CarsModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const cars_controller_1 = require("./cars.controller");
const cars_service_1 = require("./cars.service");
const car_schema_1 = require("./schemas/car.schema");
let CarsModule = class CarsModule {
};
exports.CarsModule = CarsModule;
exports.CarsModule = CarsModule = __decorate([
    (0, common_1.Module)({
        imports: [mongoose_1.MongooseModule.forFeature([{ name: car_schema_1.Car.name, schema: car_schema_1.CarSchema }])],
        controllers: [cars_controller_1.CarsController],
        providers: [cars_service_1.CarsService],
        exports: [cars_service_1.CarsService],
    })
], CarsModule);
//# sourceMappingURL=cars.module.js.map