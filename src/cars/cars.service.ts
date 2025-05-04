import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Car, CarDocument } from "./schemas/car.schema";
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

@Injectable()
export class CarsService {
  constructor(@InjectModel(Car.name) private carModel: Model<CarDocument>) {}

  async create(
    createCarDto: CreateCarDto,
    photos?: Express.Multer.File[],
  ): Promise<CarDocument> {
    // Find the highest carID in the database
    const highestCar = await this.carModel.findOne().sort({ carID: -1 }).exec();
    const nextCarID = highestCar ? highestCar.carID + 1 : 1;
    // Create a new car with the next carID
    const newCar = new this.carModel({
      ...createCarDto,
      carID: nextCarID,
      status: "Purchased",
      photos: photos?.map((photo) => `/uploads/cars/${photo.filename}`) || [],
    });
    return newCar.save();
  }

  async findAll(
    filters?: CarFilters,
    paginationOptions: PaginationOptions = { page: 1, limit: 25 },
  ): Promise<{
    cars: CarDocument[];
    total: number;
    totalPages: number;
    page: number;
    limit: number;
  }> {
    const query: CarFilters = {};
    if (filters) {
      if (filters.vinCode) query.vinCode = filters.vinCode;
      if (filters.containerNumber)
        query.containerNumber = filters.containerNumber;
      if (filters.username) query.username = filters.username;
      if (filters.status) query.status = filters.status;
      if (filters.dateOfPurchase) query.dateOfPurchase = filters.dateOfPurchase;
    }

    const { page, limit } = paginationOptions;
    const skip = (page - 1) * limit;

    const [cars, total] = await Promise.all([
      this.carModel
        .find(query)
        .sort({ createdAt: -1 }) // Sort by createdAt in descending order (newest first)
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

  async delete(carID: number): Promise<CarDocument> {
    return this.carModel.findOneAndDelete({ carID }).exec();
  }
}
