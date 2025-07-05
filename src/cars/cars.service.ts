import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cron } from '@nestjs/schedule';
import { Car, CarDocument, CarStatus } from './schemas/car.schema';
import { CreateCarDto } from './dto/create-car.dto';
import { UpdateCarDto } from './dto/update-car.dto';
import { UsersService } from '../users/users.service';
import { SmsService } from '../sms/sms.service';
import { PricesService } from '../prices/prices.service';
import { StorageFactoryService } from '../config/storage-factory.service';

interface CarFilters {
  vinCode?: string;
  containerNumber?: string;
  username?: string | string[];
  status?: CarStatus;
  dateOfPurchase?: string;
  buyer?: string;
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
    private storageFactoryService: StorageFactoryService,
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
    // Check if username exists
    try {
      await this.usersService.findByUsername(createCarDto.username);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException(`User ${createCarDto.username} does not exist`);
      }
      throw error;
    }

    // Find the highest carID in the database
    const highestCar = await this.carModel.findOne().sort({ carID: -1 }).exec();
    const nextCarID = highestCar ? highestCar.carID + 1 : 1;

    // Upload photos to cloud storage if provided
    let photoUrls: string[] = [];
    if (photos && photos.length > 0) {
      try {
        const storageService = this.storageFactoryService.getStorageService();

        // Process each photo and get URLs
        const uploadPromises = photos.map((photo) => storageService.uploadFile(photo, 'cars'));
        photoUrls = await Promise.all(uploadPromises);
      } catch (error) {
        console.error('Error uploading photos:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new BadRequestException(`Failed to upload photos: ${errorMessage}`);
      }
    }

    // Calculate profit if transportationPrice and location are provided
    let calculatedProfit = 0;
    if (createCarDto.transportationPrice !== undefined && createCarDto.location) {
      const priceForLocation = await this.getPriceForLocation(createCarDto.location);
      if (priceForLocation && priceForLocation.basePrice !== undefined) {
        const effectiveTransportationPrice = createCarDto.doubleRate 
          ? createCarDto.transportationPrice * 2 
          : createCarDto.transportationPrice;
        const effectiveBasePrice = createCarDto.doubleRate 
          ? priceForLocation.basePrice * 2 
          : priceForLocation.basePrice;
        const bonusAmount = createCarDto.bonusAmount || 0;
        calculatedProfit = (effectiveTransportationPrice - effectiveBasePrice) - bonusAmount;
      }
    }

    // Apply 2x multiplier to transportationPrice if doubleRate field is true
    const finalTransportationPrice = createCarDto.doubleRate && createCarDto.transportationPrice 
      ? createCarDto.transportationPrice * 2 
      : createCarDto.transportationPrice || 0;

    // Create a new car with values from DTO (no automatic calculations)
    const newCar = new this.carModel({
      ...createCarDto,
      carID: nextCarID,
      status: createCarDto.containerNumber ? CarStatus.IN_TRANSIT : CarStatus.PURCHASED,
      photos: photoUrls, // Store cloud storage URLs instead of local paths
      // Use values from DTO or defaults
      transportationPrice: finalTransportationPrice,
      totalCost: createCarDto.totalCost || 0,
      toBePaid: (createCarDto.totalCost || 0) - (createCarDto.paid || 0),
      profit: calculatedProfit, // Use calculated profit instead of DTO value
      bonusReceiver: createCarDto.bonusReceiver,
      bonusAmount: createCarDto.bonusAmount,
    });

    const savedCar = await newCar.save();

    // Update user's total balance if totalCost exists
    if (savedCar.totalCost) {
      await this.updateUserTotalBalance(savedCar.username, savedCar.totalCost);
    }

    return savedCar;
  }

  async update(
    carID: number,
    updateCarDto: UpdateCarDto,
    photos?: Express.Multer.File[],
  ): Promise<CarDocument> {
    // Find the car by ID
    const car = await this.carModel.findOne({ carID }).exec();
    if (!car) {
      throw new NotFoundException(`Car with ID ${carID} not found`);
    }

    // Update the car properties
    const updateData = { ...updateCarDto } as UpdateCarDto;
    // Ensure bonusReceiver and bonusAmount are updatable
    if ('bonusReceiver' in updateCarDto) {
      updateData.bonusReceiver = updateCarDto.bonusReceiver;
    }
    if ('bonusAmount' in updateCarDto) {
      updateData.bonusAmount = updateCarDto.bonusAmount;
    }

    // Ensure carID cannot be updated even if it's somehow included in the DTO
    if ('carID' in updateData) {
      delete (updateData as { carID?: number }).carID;
    }

    // Upload new photos to cloud storage if provided
    if (photos && photos.length > 0) {
      try {
        const storageService = this.storageFactoryService.getStorageService();

        // Process each photo and get URLs
        const uploadPromises = photos.map((photo) => storageService.uploadFile(photo, 'cars'));
        const newPhotoUrls = await Promise.all(uploadPromises);

        // Add new photos to existing ones or replace them
        const existingPhotos = car.photos || [];
        updateData.photos = [...existingPhotos, ...newPhotoUrls];
      } catch (error) {
        console.error('Error uploading photos during update:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new BadRequestException(`Failed to upload photos: ${errorMessage}`);
      }
    }

    // Auto-update status to 'In Transit' when containerNumber is set or updated
    if (
      updateData.containerNumber !== undefined &&
      updateData.containerNumber !== null &&
      updateData.containerNumber !== ''
    ) {
      updateData.status = CarStatus.IN_TRANSIT;
    }

    // Calculate new totalCost if either transportationPrice or auctionPrice is being updated
    if (updateData.transportationPrice !== undefined || updateData.auctionPrice !== undefined || updateData.doubleRate !== undefined) {
      let newTransportationPrice = updateData.transportationPrice ?? car.transportationPrice;
      
      // Apply 2x multiplier if 2x field is being set to true or if it's already true and transportationPrice is being updated
      const is2xActive = updateData.doubleRate ?? car.doubleRate;
      if (is2xActive && updateData.transportationPrice !== undefined) {
        newTransportationPrice = updateData.transportationPrice * 2;
        updateData.transportationPrice = newTransportationPrice;
      } else if (updateData.doubleRate === true && car.transportationPrice) {
        // If 2x is being activated, multiply existing transportationPrice
        newTransportationPrice = car.transportationPrice * 2;
        updateData.transportationPrice = newTransportationPrice;
      } else if (updateData.doubleRate === false && car.doubleRate === true && car.transportationPrice) {
        // If 2x is being deactivated, divide by 2 to get original value
        newTransportationPrice = car.transportationPrice / 2;
        updateData.transportationPrice = newTransportationPrice;
      }

      const newAuctionPrice = updateData.auctionPrice ?? car.auctionPrice;
      updateData.totalCost = newTransportationPrice + newAuctionPrice;
      if (updateData.totalCost >= car.paid) {
        updateData.toBePaid = updateData.totalCost - car.paid;
      } else {
        updateData.toBePaid = 0;
      }

      // Calculate profit if transportationPrice is being updated or 2x field is changed
      if ((updateData.transportationPrice !== undefined || updateData.doubleRate !== undefined) && car.location) {
        const priceForLocation = await this.getPriceForLocation(car.location);
        if (priceForLocation && priceForLocation.basePrice !== undefined) {
          const effectiveBasePrice = is2xActive 
            ? priceForLocation.basePrice * 2 
            : priceForLocation.basePrice;
          const bonusAmount = updateData.bonusAmount ?? (car.bonusAmount || 0);
          updateData.profit = (newTransportationPrice - effectiveBasePrice) - bonusAmount;
        }
      }
    }

    // Calculate profit if only bonusAmount is being updated
    if (updateData.bonusAmount !== undefined && 
        updateData.transportationPrice === undefined && 
        updateData.doubleRate === undefined && 
        car.location) {
      const priceForLocation = await this.getPriceForLocation(car.location);
      if (priceForLocation && priceForLocation.basePrice !== undefined) {
        const effectiveTransportationPrice = car.doubleRate 
          ? car.transportationPrice * 2 
          : car.transportationPrice;
        const effectiveBasePrice = car.doubleRate 
          ? priceForLocation.basePrice * 2 
          : priceForLocation.basePrice;
        const bonusAmount = updateData.bonusAmount;
        updateData.profit = (effectiveTransportationPrice - effectiveBasePrice) - bonusAmount;
      }
    }

    // Track original toBePaid to detect changes
    const originalToBePaid = car.toBePaid || 0;

    // Check if status is being updated to 'Green'
    const isStatusChangingToGreen =
      updateData.status === CarStatus.GREEN && car.status !== CarStatus.GREEN;

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

    // Update user's total balance based on toBePaid changes (this covers all scenarios)
    const finalToBePaid = updatedCar.toBePaid || 0;
    const toBePaidDifference = finalToBePaid - originalToBePaid;
    
    if (toBePaidDifference !== 0) {
      await this.updateUserTotalBalance(updatedCar.username, toBePaidDifference);
      console.log(
        `Updated user ${updatedCar.username} totalBalance by ${toBePaidDifference} due to toBePaid change from ${originalToBePaid} to ${finalToBePaid}`,
      );
    }

    // Handle bonus payment when toBePaid becomes 0
    if (originalToBePaid > 0 && finalToBePaid === 0 && updatedCar.bonusReceiver && updatedCar.bonusAmount) {
      try {
        const bonusReceiverUser = await this.usersService.findByUsername(updatedCar.bonusReceiver);
        const bonusAmount = updatedCar.bonusAmount || 0;
        
        await this.usersService.update(bonusReceiverUser.userID, {
          profitBalance: (bonusReceiverUser.profitBalance || 0) + bonusAmount,
        });

        console.log(
          `Added bonus ${bonusAmount} to user ${updatedCar.bonusReceiver} for car ${carID} when toBePaid became 0`,
        );
      } catch (error) {
        console.error(
          `Failed to update bonus receiver ${updatedCar.bonusReceiver} profit balance for car ${carID}:`,
          error,
        );
        // Don't throw the error to avoid disrupting the car operation
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
      if (filters.username) {
        if (Array.isArray(filters.username)) {
          // Multiple usernames - use $in operator for exact matches
          query.username = { $in: filters.username };
        } else {
          // Single username - use regex for partial matching
          query.username = { $regex: new RegExp(filters.username, 'i') };
        }
      }
      if (filters.status) query.status = filters.status; // Use exact match for enum
      if (filters.dateOfPurchase) {
        query.dateOfPurchase = filters.dateOfPurchase;
      }
      if (filters.buyer) query.buyer = { $regex: new RegExp(filters.buyer, 'i') };
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
    // First, find the car to get its details before deletion
    const car = await this.carModel.findOne({ carID }).exec();
    if (!car) {
      throw new NotFoundException(`Car with ID ${carID} not found`);
    }

    // Check if the car has toBePaid > 0 and deduct from user's totalBalance
    const toBePaid = car.toBePaid || 0;
    if (toBePaid > 0) {
      try {
        const user = await this.usersService.findByUsername(car.username);
        const currentTotalBalance = user.totalBalance || 0;
        const newTotalBalance = currentTotalBalance - toBePaid;

        // Update user's total balance
        await this.usersService.update(user.userID, {
          totalBalance: newTotalBalance,
        });

        console.log(
          `Deleted car ${carID} with toBePaid ${toBePaid}. User ${car.username} totalBalance: ${currentTotalBalance} -> ${newTotalBalance}`,
        );
      } catch (error) {
        console.error(
          `Failed to update total balance for user ${car.username} during car deletion:`,
          error,
        );
        // Continue with deletion even if user balance update fails
      }
    }

    // Delete the car
    const deletedCar = await this.carModel.findOneAndDelete({ carID }).exec();

    if (!deletedCar) {
      throw new NotFoundException(`Car with ID ${carID} not found during deletion`);
    }

    return deletedCar;
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

      // Calculate the difference for user balance update
      const currentToBePaid = car.toBePaid || 0;
      const newToBePaid = car.totalCost || 0;
      const balanceChange = newToBePaid - currentToBePaid;

      const result = await this.carModel.updateOne(
        { carID },
        { $set: { toBePaid: newToBePaid } },
      );

      if (result.matchedCount === 0) {
        throw new NotFoundException(`Car with carID ${carID} not found`);
      }

      // Update user's total balance if there's a change
      if (balanceChange !== 0) {
        await this.updateUserTotalBalance(car.username, balanceChange);
        console.log(`Updated user ${car.username} totalBalance by ${balanceChange} due to toBePaid reset`);
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
      const oldToBePaid = car.toBePaid || 0;
      if (oldToBePaid > 0) {
        // Update user balance to reflect toBePaid going to 0
        await this.updateUserTotalBalance(car.username, -oldToBePaid);
        console.log(`Updated user ${car.username} totalBalance by -${oldToBePaid} due to toBePaid reset to 0`);
      }
      await this.carModel.updateOne({ carID }, { $set: { toBePaid: 0 } });
      return;
    }

    // Update toBePaid, but ensure it doesn't go below 0
    const finalToBePaid = Math.max(0, newToBePaid);
    const actualChange = finalToBePaid - currentToBePaid;

    await this.carModel.updateOne({ carID }, { $set: { toBePaid: finalToBePaid } });

    // Update user's total balance to reflect the change in debt
    if (actualChange !== 0) {
      await this.updateUserTotalBalance(car.username, actualChange);
      console.log(`Updated user ${car.username} totalBalance by ${actualChange} due to toBePaid change from ${currentToBePaid} to ${finalToBePaid}`);
    }
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

      // Handle bonus payment when toBePaid becomes 0
      if (car.bonusReceiver && car.bonusAmount) {
        try {
          const bonusReceiverUser = await this.usersService.findByUsername(car.bonusReceiver);
          const bonusAmount = car.bonusAmount || 0;
          
          await this.usersService.update(bonusReceiverUser.userID, {
            profitBalance: (bonusReceiverUser.profitBalance || 0) + bonusAmount,
          });

          console.log(
            `Added bonus ${bonusAmount} to user ${car.bonusReceiver} for car ${carID} when toBePaid became 0 via updatePaid`,
          );
        } catch (error) {
          console.error(
            `Failed to update bonus receiver ${car.bonusReceiver} profit balance for car ${carID}:`,
            error,
          );
          // Don't throw the error to avoid disrupting the car operation
        }
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

    // Handle bonus payment when toBePaid becomes 0
    if (currentToBePaid > 0 && newToBePaid === 0 && car.bonusReceiver && car.bonusAmount) {
      try {
        const bonusReceiverUser = await this.usersService.findByUsername(car.bonusReceiver);
        const bonusAmount = car.bonusAmount || 0;
        
        await this.usersService.update(bonusReceiverUser.userID, {
          profitBalance: (bonusReceiverUser.profitBalance || 0) + bonusAmount,
        });

        console.log(
          `Added bonus ${bonusAmount} to user ${car.bonusReceiver} for car ${carID} when toBePaid became 0 via transfer`,
        );
      } catch (error) {
        console.error(
          `Failed to update bonus receiver ${car.bonusReceiver} profit balance for car ${carID}:`,
          error,
        );
        // Don't throw the error to avoid disrupting the car operation
      }
    }

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
        const currentInterestSum = car.interestSum || 0;
        const currentToBePaid = car.toBePaid || 0;

        // Calculate 0.3% interest
        const interestAmount = financingAmount * 0.003; // 0.3% = 0.003

        // Add interest to interestSum
        const newInterestSum = currentInterestSum + interestAmount;

        // Add interest to toBePaid
        const newToBePaid = currentToBePaid + interestAmount;

        // Update the car with new interestSum and toBePaid
        await this.carModel.updateOne(
          { carID: car.carID }, 
          { 
            $set: { 
              interestSum: newInterestSum,
              toBePaid: newToBePaid 
            } 
          }
        );

        // Update user's total balance with the interest amount
        try {
          await this.updateUserTotalBalance(car.username, interestAmount);
        } catch (error) {
          console.error(`Failed to update total balance for user ${car.username}:`, error);
          // Continue with other cars even if one fails
        }

        console.log(
          `Applied interest to car ${car.carID} (${car.username}): ${financingAmount} * 0.3% = ${interestAmount}. InterestSum: ${currentInterestSum} -> ${newInterestSum}, ToBePaid: ${currentToBePaid} -> ${newToBePaid}`,
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
