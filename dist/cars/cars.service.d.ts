import { Model } from "mongoose";
import { CarDocument } from "./schemas/car.schema";
import { CreateCarDto } from "./dto/create-car.dto";
interface CarFilters {
    vinCode?: string;
    containerNumber?: string;
    username?: string;
    status?: string;
    dateOfPurchase?: string;
}
interface PaginationOptions {
    page: number;
    limit: number;
}
export declare class CarsService {
    private carModel;
    constructor(carModel: Model<CarDocument>);
    create(createCarDto: CreateCarDto, photos?: Express.Multer.File[]): Promise<CarDocument>;
    findAll(filters?: CarFilters, paginationOptions?: PaginationOptions): Promise<{
        cars: CarDocument[];
        total: number;
        totalPages: number;
        page: number;
        limit: number;
    }>;
    delete(carID: number): Promise<CarDocument>;
}
export {};
