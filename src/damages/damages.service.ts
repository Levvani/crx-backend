import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Damage, DamageDocument } from "./schemas/damages.schema";
import { CreateDamageDto } from "./dto/create-damage.dto";
import { UpdateDamageDto } from "./dto/update-damage.dto";

@Injectable()
export class DamagesService {
  constructor(
    @InjectModel(Damage.name) private damageModel: Model<DamageDocument>,
  ) {}

  async create(createDamageDto: CreateDamageDto): Promise<DamageDocument> {
    // Find the highest damageID in the database
    const highestDamage = await this.damageModel
      .findOne()
      .sort({ damageID: -1 })
      .exec();
    const nextDamageID = highestDamage ? highestDamage.damageID + 1 : 1;

    // Create a new damage with the next damageID
    const newDamage = new this.damageModel({
      ...createDamageDto,
      damageID: nextDamageID,
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
  ): Promise<DamageDocument> {
    // Find the damage by ID
    const damage = await this.findOne(damageID);

    // Update the damage properties
    const updateData = {
      ...updateDamageDto,
      updatedAt: new Date(),
    };

    // Update the damage and return the updated document
    return this.damageModel
      .findOneAndUpdate(
        { damageID },
        { $set: updateData },
        { new: true }, // Return the updated document
      )
      .exec();
  }
}
