import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Damage, DamageDocument } from './schemas/damages.schema';
import { CreateDamageDto } from './dto/create-damage.dto';
import { UpdateDamageDto } from './dto/update-damage.dto';
import { UsersService } from '../users/users.service';
import { CarsService } from '../cars/cars.service';
import { StorageFactoryService } from '../config/storage-factory.service';

@Injectable()
export class DamagesService {
  constructor(
    @InjectModel(Damage.name) private damageModel: Model<DamageDocument>,
    private usersService: UsersService,
    private carsService: CarsService,
    private storageFactoryService: StorageFactoryService,
  ) {}

  async create(
    createDamageDto: CreateDamageDto,
    files?: Express.Multer.File[],
  ): Promise<DamageDocument> {
    let username = createDamageDto.username;
    let vinCode = createDamageDto.vinCode;

    // If carID is provided, get the username from the car object
    if (createDamageDto.carID) {
      try {
        const car = await this.carsService.findOne(createDamageDto.carID);
        username = car.username;
        // Get the vinCode from the car
        vinCode = car.vinCode;
      } catch (error) {
        if (error instanceof NotFoundException) {
          throw new BadRequestException(`Car with ID ${createDamageDto.carID} not found`);
        }
        throw error;
      }
    }

    // Validate that the username exists
    try {
      await this.usersService.findByUsername(username);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new BadRequestException(`Username ${username} does not exist`);
      }
      throw error;
    }

    // Find the highest damageID in the database
    const highestDamage = await this.damageModel.findOne().sort({ damageID: -1 }).exec();
    const nextDamageID = highestDamage ? highestDamage.damageID + 1 : 1;

    // Upload files to storage if provided
    let imageUrl: string | null = null;
    const imageUrls: string[] = [];

    if (files && files.length > 0) {
      try {
        const storageService = this.storageFactoryService.getStorageService();

        // Process each file and get URLs
        const uploadPromises = files.map((file) => storageService.uploadFile(file, 'damages'));
        const uploadedUrls = await Promise.all(uploadPromises);

        // Store all URLs
        imageUrls.push(...uploadedUrls);

        // Keep backward compatibility by setting the first image as imageUrl
        if (uploadedUrls.length > 0) {
          imageUrl = uploadedUrls[0];
        }
      } catch (error) {
        console.error('Error uploading files:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new BadRequestException(`Failed to upload images: ${errorMessage}`);
      }
    }

    // Create a new damage with the next damageID and the determined username
    const newDamage = new this.damageModel({
      ...createDamageDto,
      username, // Use the username from car or the one provided in DTO
      vinCode, // Include the vinCode from car or the one provided in DTO
      damageID: nextDamageID,
      imageUrl, // Add the first image URL for backward compatibility
      imageUrls, // Add all image URLs as an array
    });

    // Log the values before saving
    console.log('Creating damage with:', {
      imageUrl,
      imageUrls,
      filesCount: files?.length,
      storageProvider: this.storageFactoryService.getCurrentProvider(),
    });

    return newDamage.save();
  }

  async findAll(username?: string): Promise<DamageDocument[]> {
    // If username is provided, filter by username (for dealers)
    const query = username ? { username } : {};
    const damages = await this.damageModel.find(query).sort({ createdAt: -1 }).exec();

    // Enhance damages with vinCode from cars (if missing)
    const enhancedDamages = await Promise.all(
      damages.map(async (damage) => {
        // If damage already has vinCode, return as is
        if (damage.vinCode) {
          return damage;
        }

        try {
          // Get car information to retrieve vinCode
          const car = await this.carsService.findOne(damage.carID);

          // Set the vinCode
          damage.vinCode = car.vinCode;

          // Save the updated damage with vinCode
          await damage.save();
        } catch (error) {
          // If car not found or other error, continue without vinCode
          console.error(
            `Could not retrieve vinCode for damage ${damage.damageID}:`,
            (error as Error).message,
          );
        }

        return damage;
      }),
    );

    return enhancedDamages;
  }

  async findOne(damageID: number): Promise<DamageDocument> {
    const damage = await this.damageModel.findOne({ damageID }).exec();
    if (!damage) {
      throw new NotFoundException(`Damage with ID ${damageID} not found`);
    }

    // If damage doesn't have vinCode, get it from car
    if (!damage.vinCode) {
      try {
        const car = await this.carsService.findOne(damage.carID);
        damage.vinCode = car.vinCode;
        await damage.save();
      } catch (error) {
        // If car not found or other error, continue without vinCode
        console.error(`Could not retrieve vinCode for damage ${damageID}:`, error);
      }
    }

    return damage;
  }

  async update(damageID: number, updateDamageDto: UpdateDamageDto): Promise<DamageDocument> {
    // First, get the current damage to check previous status and details
    const currentDamage = await this.damageModel.findOne({ damageID }).exec();
    if (!currentDamage) {
      throw new NotFoundException(`Damage with ID ${damageID} not found`);
    }

    // Check if status is changing to 'approved' for the first time
    const isStatusChangingToApproved = 
      updateDamageDto.status === 'approved' && 
      currentDamage.status !== 'approved';

    // Check if we're updating an already approved damage with a different approvedAmount
    const isUpdatingApprovedAmount = 
      currentDamage.status === 'approved' && 
      updateDamageDto.status === 'approved' &&
      updateDamageDto.approvedAmount !== undefined &&
      updateDamageDto.approvedAmount !== currentDamage.approvedAmount;

    // Handle profit balance updates
    if (isStatusChangingToApproved) {
      // First time approval - add amount to profitBalance
      const amountToAdd = updateDamageDto.approvedAmount ?? currentDamage.amount;
      
      await this.usersService.updateProfitBalanceByUsername(currentDamage.username, amountToAdd);

      console.log(
        `Damage ${damageID} approved. Added ${amountToAdd} to ${currentDamage.username}'s profitBalance`
      );
    } else if (isUpdatingApprovedAmount) {
      // Already approved, but changing the approved amount
      const previousAmount = currentDamage.approvedAmount ?? currentDamage.amount;
      const newAmount = updateDamageDto.approvedAmount;
      const difference = newAmount - previousAmount;

      // Adjust profitBalance by the difference
      await this.usersService.updateProfitBalanceByUsername(currentDamage.username, difference);

      console.log(
        `Damage ${damageID} approved amount updated. Previous: ${previousAmount}, New: ${newAmount}, Difference: ${difference}. Updated ${currentDamage.username}'s profitBalance`
      );
    }

    // Prepare update data - only include fields that are actually provided
    const updateData: any = {
      updatedAt: new Date(),
    };

    // Only add fields that are provided (not undefined)
    if (updateDamageDto.status !== undefined) {
      updateData.status = updateDamageDto.status;
    }
    if (updateDamageDto.approverComment !== undefined) {
      updateData.approverComment = updateDamageDto.approverComment;
    }
    if (updateDamageDto.approvedAmount !== undefined) {
      updateData.approvedAmount = updateDamageDto.approvedAmount;
    }

    // Update the damage and return the updated document
    const updatedDamage = await this.damageModel
      .findOneAndUpdate(
        { damageID },
        { $set: updateData },
        { new: true }, // Return the updated document
      )
      .exec();

    if (!updatedDamage) {
      throw new NotFoundException(`Failed to update damage with ID ${damageID}`);
    }

    return updatedDamage;
  }
}
