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
    file?: Express.Multer.File
  ): Promise<DamageDocument> {
    let username = createDamageDto.username;

    // If carID is provided, get the username from the car object
    if (createDamageDto.carID) {
      try {
        const car = await this.carsService.findOne(createDamageDto.carID);
        username = car.username;
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

    // Upload file to GCS if provided
    let imageUrl = null;
    if (file) {
      try {
        imageUrl = await this.storageService.uploadFile(file);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        throw new BadRequestException(
          `Failed to upload image: ${errorMessage}`
        );
      }
    }

    // Create a new damage with the next damageID and the determined username
    const newDamage = new this.damageModel({
      ...createDamageDto,
      username, // Use the username from car or the one provided in DTO
      damageID: nextDamageID,
      imageUrl, // Add the image URL from GCS
    });
    return newDamage.save();
  }

  async findAll(username?: string): Promise<DamageDocument[]> {
    // If username is provided, filter by username (for dealers)
    const query = username ? { username } : {};
    return this.damageModel.find(query).sort({ createdAt: -1 }).exec();
  }

  async findOne(damageID: number): Promise<DamageDocument> {
    const damage = await this.damageModel.findOne({ damageID }).exec();
    if (!damage) {
      throw new NotFoundException(`Damage with ID ${damageID} not found`);
    }
    return damage;
  }

  async update(
    damageID: number,
    updateDamageDto: UpdateDamageDto,
    file?: Express.Multer.File
  ): Promise<DamageDocument> {
    // Find the damage by ID
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const damage = await this.findOne(damageID);

    // Update image if file is provided
    let imageUrl = updateDamageDto.imageUrl;
    if (file) {
      try {
        imageUrl = await this.storageService.uploadFile(file);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        throw new BadRequestException(
          `Failed to upload image: ${errorMessage}`
        );
      }
    }

    // Update the damage properties
    const updateData = {
      ...updateDamageDto,
      imageUrl,
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
