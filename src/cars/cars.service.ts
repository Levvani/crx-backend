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
    // Use a more specific type that matches MongoDB query structure
    const query: Record<string, any> = {};
    if (filters) {
      if (filters.vinCode)
        query.vinCode = { $regex: new RegExp(filters.vinCode, "i") };
      if (filters.containerNumber)
        query.containerNumber = {
          $regex: new RegExp(filters.containerNumber, "i"),
        };
      if (filters.username)
        query.username = { $regex: new RegExp(filters.username, "i") };
      if (filters.status)
        query.status = { $regex: new RegExp(filters.status, "i") };
      if (filters.dateOfPurchase) {
        try {
          // Assuming dateOfPurchase is sent as a string in ISO format (YYYY-MM-DD)
          const date = new Date(filters.dateOfPurchase);
          // Create a range for the entire day
          const startOfDay = new Date(date.setHours(0, 0, 0, 0));
          const endOfDay = new Date(date.setHours(23, 59, 59, 999));

          query.dateOfPurchase = {
            $gte: startOfDay,
            $lte: endOfDay,
          };
        } catch (error) {
          console.error("Error parsing dateOfPurchase:", error);
        }
      }
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
