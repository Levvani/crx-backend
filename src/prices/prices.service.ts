import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Price } from "./schemas/price.schema";
import { CreatePriceDto } from "./dto/create-price.dto";
import { UpdatePriceDto } from "./dto/update-price.dto";
import { AddDynamicKeyDto } from "./dto/add-dynamic-key.dto";

@Injectable()
export class PricesService {
  constructor(@InjectModel(Price.name) private priceModel: Model<Price>) {}

  async create(createPriceDto: CreatePriceDto): Promise<Price> {
    const createdPrice = new this.priceModel(createPriceDto);
    return createdPrice.save();
  }

  async findAll(): Promise<Price[]> {
    return this.priceModel.find().sort({ id: 1 }).exec();
  }

  async findOne(id: number): Promise<Price> {
    const price = await this.priceModel.findOne({ id }).exec();
    if (!price) {
      throw new NotFoundException(`Price with ID ${id} not found`);
    }
    return price;
  }

  async update(id: number, updatePriceDto: UpdatePriceDto): Promise<Price> {
    const updatedPrice = await this.priceModel
      .findOneAndUpdate({ id }, updatePriceDto, { new: true })
      .exec();

    if (!updatedPrice) {
      throw new NotFoundException(`Price with ID ${id} not found`);
    }

    return updatedPrice;
  }

  async addDynamicKey(addDynamicKeyDto: AddDynamicKeyDto): Promise<Price[]> {
    const { name, amount } = addDynamicKeyDto;

    // First, get all existing prices
    const prices = await this.priceModel.find().exec();

    // Update each price document individually
    for (const price of prices) {
      await this.priceModel.findByIdAndUpdate(
        price._id,
        { $set: { [name]: amount } },
        { new: true }
      );
    }

    // Return all updated documents
    return this.priceModel.find().sort({ id: 1 }).exec();
  }
}
