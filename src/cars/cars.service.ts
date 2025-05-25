import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Car, CarDocument } from "./schemas/car.schema";
import { CreateCarDto } from "./dto/create-car.dto";
import { UpdateCarDto } from "./dto/update-car.dto";
import { UsersService } from "../users/users.service";
import { SmsService } from "../sms/sms.service";
import { PricesService } from "../prices/prices.service";
import { User } from "../users/schemas/user.schema";

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
    private smsService: SmsService,
    private pricesService: PricesService
  ) {}

  async create(
    createCarDto: CreateCarDto,
    photos?: Express.Multer.File[]
  ): Promise<CarDocument> {
    // Check if username exists and get user info
    let user: User;
    try {
      user = await this.usersService.findByUsername(createCarDto.username);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException(
          `User ${createCarDto.username} does not exist`
        );
      }
      throw error;
    }

    let transportationPrice = 0;

    // Get price information for the location
    const prices = await this.pricesService.findAll();
    const priceForLocation = prices.find(
      (p) => p.location === createCarDto.location
    );

    if (priceForLocation) {
      // Calculate transportation price
      transportationPrice = priceForLocation.upsellAmount;

      // Add level-specific amount if it exists, otherwise use upsellAmount as default
      const levelKey = user.level;
      if (priceForLocation[levelKey]) {
        transportationPrice += priceForLocation[levelKey];
      }
    } else {
      transportationPrice = 0;
    }
    // Find the highest carID in the database
    const highestCar = await this.carModel.findOne().sort({ carID: -1 }).exec();
    const nextCarID = highestCar ? highestCar.carID + 1 : 1;

    // Create a new car with the calculated transportation price
    const newCar = new this.carModel({
      ...createCarDto,
      carID: nextCarID,
      status: "Purchased",
      transportationPrice,
      photos: photos?.map((photo) => `/uploads/cars/${photo.filename}`) || [],
    });

    return newCar.save();
  }

  async update(
    carID: number,
    updateCarDto: UpdateCarDto
  ): Promise<CarDocument> {
    // Find the car by ID
    const car = await this.carModel.findOne({ carID }).exec();
    if (!car) {
      throw new NotFoundException(`Car with ID ${carID} not found`);
    }

    // Update the car properties
    const updateData = { ...updateCarDto } as UpdateCarDto;

    // Ensure carID cannot be updated even if it's somehow included in the DTO
    if ("carID" in updateData) {
      delete (updateData as { carID?: number }).carID;
    }

    // Check if status is being updated to 'Green'
    const isStatusChangingToGreen =
      updateData.status === "Green" && car.status !== "Green";

    // Update the car and return the updated document
    const updatedCar = await this.carModel
      .findOneAndUpdate(
        { carID },
        { $set: updateData as Partial<CarDocument> },
        { new: true } // Return the updated document
      )
      .exec();

    // If status changed to Green, send SMS notification
    if (isStatusChangingToGreen) {
      try {
        // Get the user to retrieve their phone number
        const user = await this.usersService.findByUsername(
          updatedCar.username
        );

        // Only send SMS if user has a phone number
        if (user.phoneNumber) {
          await this.smsService.sendSms(
            user.phoneNumber.toString(),
            `თქვენი ავტომობილი (${updatedCar.carName}, VIN: ${updatedCar.vinCode}) გამწვანდა, შეგიძლიათ გაიყვანოთ.`
          );
        }
      } catch (error) {
        console.error("Failed to send status notification SMS:", error);
        // Don't throw the error to avoid disrupting the update operation
        // Just log it for monitoring
      }
    }

    return updatedCar;
  }

  async findAll(
    filters?: CarFilters,
    paginationOptions: PaginationOptions = { page: 1, limit: 25 }
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
