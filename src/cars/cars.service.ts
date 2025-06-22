import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cron } from '@nestjs/schedule';
import { Car, CarDocument } from './schemas/car.schema';
import { CreateCarDto } from './dto/create-car.dto';
import { UpdateCarDto } from './dto/update-car.dto';
import { UsersService } from '../users/users.service';
import { SmsService } from '../sms/sms.service';
import { PricesService } from '../prices/prices.service';
import { User } from '../users/schemas/user.schema';

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

interface PriceForLocation {
  location: string;
  basePrice: number;
  upsellAmount: number;
  [key: string]: any; // For dynamic level properties like 'A', 'B', etc.
}

@Injectable()
export class CarsService {
  constructor(
    @InjectModel(Car.name) private carModel: Model<CarDocument>,
    private usersService: UsersService,
    private smsService: SmsService,
    private pricesService: PricesService,
  ) {}

  private async updateUserTotalBalance(username: string, totalCost: number): Promise<void> {
    try {
      const user = await this.usersService.findByUsername(username);
      const newTotalBalance = (user.totalBalance || 0) + totalCost;
      if (newTotalBalance >= 0) {
        await this.usersService.update(user.userID, {
          totalBalance: newTotalBalance,
        });
      }
    } catch (error) {
      console.error(`Failed to update total balance for user ${username}:`, error);
      // Don't throw the error to avoid disrupting the car operation
    }
  }

  private async getPriceForLocation(location: string): Promise<PriceForLocation | undefined> {
    const prices = await this.pricesService.findAll();
    return prices.find((p) => p.location === location) as PriceForLocation | undefined;
  }

  async create(createCarDto: CreateCarDto, photos?: Express.Multer.File[]): Promise<CarDocument> {
    // Check if username exists and get user info
    let user: User;
    try {
      user = await this.usersService.findByUsername(createCarDto.username);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException(`User ${createCarDto.username} does not exist`);
      }
      throw error;
    }

    let transportationPrice = 0;
    let profit = 0;

    // Get price information for the location
    const priceForLocation = await this.getPriceForLocation(createCarDto.location);

    if (priceForLocation) {
      // Calculate transportation price
      transportationPrice = priceForLocation.upsellAmount;

      // Add level-specific amount if it exists, otherwise use upsellAmount as default
      const levelKey = user.level;
      if (priceForLocation[levelKey]) {
        transportationPrice += priceForLocation[levelKey];
        profit = transportationPrice - priceForLocation.basePrice;
      }
    } else {
      transportationPrice = 0;
    }

    // Find the highest carID in the database
    const highestCar = await this.carModel.findOne().sort({ carID: -1 }).exec();
    const nextCarID = highestCar ? highestCar.carID + 1 : 1;

    // Calculate totalCost as sum of transportationPrice and auctionPrice
    const totalCost = transportationPrice + (createCarDto.auctionPrice || 0);

    // Create a new car with the calculated transportation price and totalCost
    const newCar = new this.carModel({
      ...createCarDto,
      carID: nextCarID,
      status: 'Purchased',
      transportationPrice,
      totalCost,
      photos: photos?.map((photo) => `/uploads/cars/${photo.filename}`) || [],
      toBePaid: totalCost,
      profit: profit,
    });

    const savedCar = await newCar.save();

    // Update user's total balance if totalCost exists
    if (savedCar.totalCost) {
      await this.updateUserTotalBalance(savedCar.username, savedCar.totalCost);
    }

    return savedCar;
  }

  async update(carID: number, updateCarDto: UpdateCarDto): Promise<CarDocument> {
    // Find the car by ID
    const car = await this.carModel.findOne({ carID }).exec();
    if (!car) {
      throw new NotFoundException(`Car with ID ${carID} not found`);
    }

    // Update the car properties
    const updateData = { ...updateCarDto } as UpdateCarDto;

    // Ensure carID cannot be updated even if it's somehow included in the DTO
    if ('carID' in updateData) {
      delete (updateData as { carID?: number }).carID;
    }

    // Calculate new totalCost if either transportationPrice or auctionPrice is being updated
    if (updateData.transportationPrice !== undefined || updateData.auctionPrice !== undefined) {
      const newTransportationPrice = updateData.transportationPrice ?? car.transportationPrice;
      const newAuctionPrice = updateData.auctionPrice ?? car.auctionPrice;
      updateData.totalCost = newTransportationPrice + newAuctionPrice;
      if (updateData.totalCost >= car.paid) {
        updateData.toBePaid = updateData.totalCost - car.paid;
      } else {
        updateData.toBePaid = 0;
      }

      // Calculate profit if transportationPrice is being updated
      if (updateData.transportationPrice !== undefined && car.location) {
        const priceForLocation = await this.getPriceForLocation(car.location);
        if (priceForLocation && priceForLocation.basePrice !== undefined) {
          updateData.profit = updateData.transportationPrice - priceForLocation.basePrice;
        }
      }
    }

    // Check if status is being updated to 'Green'
    const isStatusChangingToGreen = updateData.status === 'Green' && car.status !== 'Green';

    // Update the car and return the updated document
    const updatedCar = await this.carModel
      .findOneAndUpdate(
        { carID },
        { $set: updateData as Partial<CarDocument> },
        { new: true }, // Return the updated document
      )
      .exec();

    // Check if paid exceeds totalCost and handle profit
    const carPaid = updatedCar.paid || 0;
    const carTotalCost = updatedCar.totalCost || 0;

    if (carPaid > carTotalCost && carTotalCost > 0) {
      const profitAmount = carPaid - carTotalCost;

      // Update car: set paid to totalCost and toBePaid to 0
      await this.carModel.updateOne(
        { carID },
        {
          $set: {
            paid: car.totalCost,
            toBePaid: 0,
          },
        },
      );

      // Add the profit amount to user's profitBalance
      try {
        const user = await this.usersService.findByUsername(updatedCar.username);
        await this.usersService.update(user.userID, {
          profitBalance: (user.profitBalance || 0) + profitAmount,
        });

        console.log(
          `Added profit ${profitAmount} to user ${updatedCar.username} for car ${carID} during update`,
        );
      } catch (error) {
        console.error(
          `Failed to update profit balance for user ${updatedCar.username} during update:`,
          error,
        );
        // Don't throw the error to avoid disrupting the car operation
      }

      // // Update the returned car object to reflect the changes
      // updatedCar.paid = carTotalCost;
      // updatedCar.toBePaid = 0;
    }

    // Update user's total balance only if totalCost was actually changed
    if (updateData.totalCost !== undefined) {
      const oldTotalCost = car.totalCost || 0;
      const newTotalCost = updateData.totalCost;

      // Only update if there's an actual change in totalCost
      if (oldTotalCost !== newTotalCost) {
        // Calculate the difference to add to user's balance
        const costDifference = newTotalCost - oldTotalCost;
        await this.updateUserTotalBalance(updatedCar.username, costDifference);
      }
    }

    // If status changed to Green, send SMS notification
    if (isStatusChangingToGreen) {
      try {
        // Get the user to retrieve their phone number
        const user = await this.usersService.findByUsername(updatedCar.username);

        // Only send SMS if user has a phone number
        if (user.phoneNumber) {
          await this.smsService.sendSms(
            user.phoneNumber.toString(),
            `თქვენი ავტომობილი (${updatedCar.carName}, VIN: ${updatedCar.vinCode}) გამწვანდა, შეგიძლიათ გაიყვანოთ.`,
          );
        }
      } catch (error) {
        console.error('Failed to send status notification SMS:', error);
        // Don't throw the error to avoid disrupting the update operation
        // Just log it for monitoring
      }
    }

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
      if (filters.vinCode) query.vinCode = { $regex: new RegExp(filters.vinCode, 'i') };
      if (filters.containerNumber)
        query.containerNumber = {
          $regex: new RegExp(filters.containerNumber, 'i'),
        };
      if (filters.username) query.username = { $regex: new RegExp(filters.username, 'i') };
      if (filters.status) query.status = { $regex: new RegExp(filters.status, 'i') };
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

  async updateToBePaid(carID: number, amount: number): Promise<void> {
    // Validate amount parameter
    if (amount === undefined || amount === null || isNaN(amount) || amount === 0) {
      console.log(
        `Invalid or zero amount provided for car ${carID}: ${amount}. Setting toBePaid to totalCost.`,
      );

      // Find the car and set toBePaid equal to totalCost
      const car = await this.carModel.findOne({ carID }).exec();
      if (!car) {
        throw new NotFoundException(`Car with carID ${carID} not found`);
      }

      const result = await this.carModel.updateOne(
        { carID },
        { $set: { toBePaid: car.totalCost } },
      );

      if (result.matchedCount === 0) {
        throw new NotFoundException(`Car with carID ${carID} not found`);
      }
      return;
    }

    // Get current car data to check if paid exceeds totalCost after update
    const car = await this.carModel.findOne({ carID }).exec();
    if (!car) {
      throw new NotFoundException(`Car with carID ${carID} not found`);
    }

    const currentPaid = car.paid || 0;
    const totalCost = car.totalCost || 0;
    const currentToBePaid = car.toBePaid || 0;
    const newToBePaid = currentToBePaid + amount;

    // If paid already exceeds totalCost, keep toBePaid at 0
    if (currentPaid > totalCost && totalCost > 0) {
      await this.carModel.updateOne({ carID }, { $set: { toBePaid: 0 } });
      return;
    }

    // Update toBePaid, but ensure it doesn't go below 0
    const finalToBePaid = Math.max(0, newToBePaid);
    await this.carModel.updateOne({ carID }, { $set: { toBePaid: finalToBePaid } });
  }

  async updatePaid(carID: number, amount: number): Promise<void> {
    // Validate amount parameter
    if (amount === undefined || amount === null || isNaN(amount)) {
      console.log(`Invalid amount provided for car ${carID}: ${amount}. Setting paid to 0.`);
      amount = 0;
    }

    // First, get the current car data to check totalCost and current paid amount
    const car = await this.carModel.findOne({ carID }).exec();
    if (!car) {
      throw new NotFoundException(`Car with carID ${carID} not found`);
    }

    const currentPaid = car.paid || 0;
    const totalCost = car.totalCost || 0;
    const newPaid = currentPaid + amount;

    // Check if new paid amount exceeds totalCost
    if (newPaid > totalCost && totalCost > 0) {
      const profitAmount = newPaid - totalCost;

      // Update car: set paid to totalCost and toBePaid to 0
      await this.carModel.updateOne(
        { carID },
        {
          $set: {
            paid: totalCost,
            toBePaid: 0,
          },
        },
      );

      // Add the profit amount to user's profitBalance
      try {
        const user = await this.usersService.findByUsername(car.username);
        await this.usersService.update(user.userID, {
          profitBalance: (user.profitBalance || 0) + profitAmount,
        });

        console.log(`Added profit ${profitAmount} to user ${car.username} for car ${carID}`);
      } catch (error) {
        console.error(`Failed to update profit balance for user ${car.username}:`, error);
        // Don't throw the error to avoid disrupting the car operation
      }
    } else {
      // Normal case: just increment the paid amount
      await this.carModel.updateOne({ carID }, { $inc: { paid: amount } });
    }
  }

  async transfer(carID: number, amount: number): Promise<void> {
    // Find the car by carID
    const car = await this.carModel.findOne({ carID }).exec();
    if (!car) {
      throw new NotFoundException(`Car with carID ${carID} not found`);
    }

    // Get the user linked to this car
    const user = await this.usersService.findByUsername(car.username);
    const currentProfitBalance = user.profitBalance || 0;

    // Check if user has sufficient profit balance
    if (currentProfitBalance < amount) {
      throw new BadRequestException(
        `Insufficient profit balance. User ${car.username} has ${currentProfitBalance} but ${amount} is required`,
      );
    }

    // Deduct amount from user's profit balance and total balance
    const newProfitBalance = currentProfitBalance - amount;
    const currentTotalBalance = user.totalBalance || 0;
    const newTotalBalance = currentTotalBalance - amount;

    await this.usersService.update(user.userID, {
      profitBalance: newProfitBalance,
      totalBalance: newTotalBalance,
    });

    const currentToBePaid = car.toBePaid || 0;

    // Calculate new toBePaid value after deducting the amount
    const newToBePaid = Math.max(0, currentToBePaid - amount);

    // Update the car's toBePaid value
    await this.carModel.updateOne({ carID }, { $set: { toBePaid: newToBePaid } });

    console.log(
      `Transferred ${amount} from car ${carID}. User ${car.username} profitBalance: ${currentProfitBalance} -> ${newProfitBalance}, totalBalance: ${currentTotalBalance} -> ${newTotalBalance}. Car toBePaid: ${currentToBePaid} -> ${newToBePaid}`,
    );
  }

  @Cron('0 0 * * *') // Run every day at midnight (end of day)
  async applyDailyFinancingInterest(): Promise<void> {
    console.log('Running daily financing interest calculation...');

    try {
      // Find all cars with financing amount greater than 0
      const carsWithFinancing = await this.carModel.find({ financingAmount: { $gt: 0 } }).exec();

      if (carsWithFinancing.length === 0) {
        console.log('No cars with financing found');
        return;
      }

      console.log(`Found ${carsWithFinancing.length} cars with financing amounts`);

      // Process each car
      for (const car of carsWithFinancing) {
        const financingAmount = car.financingAmount || 0;
        const currentTotalCost = car.totalCost || 0;

        // Calculate 0.3% interest
        const interestAmount = financingAmount * 0.003; // 0.3% = 0.003

        // Add interest to totalCost
        const newTotalCost = currentTotalCost + interestAmount;

        // Update the car
        await this.carModel.updateOne({ carID: car.carID }, { $set: { totalCost: newTotalCost } });

        // Update user's total balance with the interest amount
        try {
          await this.updateUserTotalBalance(car.username, interestAmount);
        } catch (error) {
          console.error(`Failed to update total balance for user ${car.username}:`, error);
          // Continue with other cars even if one fails
        }

        console.log(
          `Applied interest to car ${car.carID} (${car.username}): ${financingAmount} * 0.3% = ${interestAmount}. TotalCost: ${currentTotalCost} -> ${newTotalCost}`,
        );
      }

      console.log(
        `Daily financing interest calculation completed for ${carsWithFinancing.length} cars`,
      );
    } catch (error) {
      console.error('Error during daily financing interest calculation:', error);
    }
  }
}
