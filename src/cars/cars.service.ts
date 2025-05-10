import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Car, CarDocument } from "./schemas/car.schema";
import { CreateCarDto } from "./dto/create-car.dto";
// Import the UpdateCarDto
import { UpdateCarDto } from "./dto/update-car.dto";
import { UsersService } from "../users/users.service";

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
  constructor(
    @InjectModel(Car.name) private carModel: Model<CarDocument>,
    private usersService: UsersService,
  ) {}

  async create(
    createCarDto: CreateCarDto,
    photos?: Express.Multer.File[],
  ): Promise<CarDocument> {
    // Check if username exists
    try {
      await this.usersService.findByUsername(createCarDto.username);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException(
          `User ${createCarDto.username} does not exist`,
        );
      }
      throw error;
    }

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

  async update(
    carID: number,
    updateCarDto: UpdateCarDto,
  ): Promise<CarDocument> {
    // Find the car by ID
    const car = await this.carModel.findOne({ carID }).exec();
    if (!car) {
      throw new NotFoundException(`Car with ID ${carID} not found`);
    }

    // Update the car properties
    const updateData: any = { ...updateCarDto };

    // Ensure carID cannot be updated even if it's somehow included in the DTO
    if ("carID" in updateData) {
      delete (updateData as { carID?: number }).carID;
    }

    // Update the car and return the updated document
    const updatedCar = await this.carModel
      .findOneAndUpdate(
        { carID },
        { $set: updateData as Partial<CarDocument> },
        { new: true }, // Return the updated document
      )
      .exec();

    return updatedCar;
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
        query.dateOfPurchase = filters.dateOfPurchase;
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

  async findOne(carID: number): Promise<CarDocument> {
    const car = await this.carModel.findOne({ carID }).exec();
    if (!car) {
      throw new NotFoundException(`Car with ID ${carID} not found`);
    }
    return car;
  }
}
