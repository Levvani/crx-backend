import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Damage, DamageDocument } from "./schemas/damages.schema";
import { CreateDamageDto } from "./dto/create-damage.dto";
import { UpdateDamageDto } from "./dto/update-damage.dto";
import { UsersService } from "../users/users.service";
import { CarsService } from "../cars/cars.service";
import { StorageService } from "../config/storage.service";

@Injectable()
export class DamagesService {
  constructor(
    @InjectModel(Damage.name) private damageModel: Model<DamageDocument>,
    private usersService: UsersService,
    private carsService: CarsService,
    private storageService: StorageService
  ) {}

  async create(
    createDamageDto: CreateDamageDto,
    files?: Express.Multer.File[]
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
          throw new BadRequestException(
            `Car with ID ${createDamageDto.carID} not found`
          );
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
    const highestDamage = await this.damageModel
      .findOne()
      .sort({ damageID: -1 })
      .exec();
    const nextDamageID = highestDamage ? highestDamage.damageID + 1 : 1;

    // Upload files to GCS if provided
    let imageUrl = null;
    const imageUrls: string[] = [];

    if (files && files.length > 0) {
      try {
        // Process each file and get URLs
        const uploadPromises = files.map((file) =>
          this.storageService.uploadFile(file)
        );
        const uploadedUrls = await Promise.all(uploadPromises);

        // Store all URLs
        imageUrls.push(...uploadedUrls);

        // Keep backward compatibility by setting the first image as imageUrl
        if (uploadedUrls.length > 0) {
          imageUrl = uploadedUrls[0];
        }
      } catch (error) {
        console.error("Error uploading files:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        throw new BadRequestException(
          `Failed to upload images: ${errorMessage}`
        );
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
    console.log("Creating damage with:", {
      imageUrl,
      imageUrls,
      filesCount: files?.length,
    });

    return newDamage.save();
  }

  async findAll(username?: string): Promise<DamageDocument[]> {
    // If username is provided, filter by username (for dealers)
    const query = username ? { username } : {};
    const damages = await this.damageModel
      .find(query)
      .sort({ createdAt: -1 })
      .exec();

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
            error.message
          );
        }

        return damage;
      })
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
        console.error(
          `Could not retrieve vinCode for damage ${damageID}:`,
          error
        );
      }
    }

    return damage;
  }

  async update(
    damageID: number,
    updateDamageDto: UpdateDamageDto
  ): Promise<DamageDocument> {
    // Find the damage by ID
    const damage = await this.findOne(damageID);

    // Restrict updates to only status and approverComment
    const updateData = {
      status: updateDamageDto.status,
      approverComment: updateDamageDto.approverComment,
      updatedAt: new Date(),
    };

    // Update the damage and return the updated document
    return this.damageModel
      .findOneAndUpdate(
        { damageID },
        { $set: updateData },
        { new: true } // Return the updated document
      )
      .exec();
  }
}
