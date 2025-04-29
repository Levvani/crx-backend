import { CarsService } from './cars.service';
import { CreateCarDto } from './dto/create-car.dto';
import { PaginationDto } from './dto/pagination.dto';
import { Car } from './schemas/car.schema';
export declare class CarsController {
    private readonly carsService;
    constructor(carsService: CarsService);
    create(createCarDto: CreateCarDto, photos: Express.Multer.File[]): Promise<Car>;
    findAll(paginationDto: PaginationDto, vinCode?: string, containerNumber?: string, username?: string, status?: string, dateOfPurchase?: string): Promise<{
        cars: Car[];
        total: number;
        totalPages: number;
        page: number;
        limit: number;
    }>;
    delete(carID: number): Promise<Car>;
}
