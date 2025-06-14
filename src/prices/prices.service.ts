import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Price, PriceDocument } from './schemas/price.schema';
import { DealerType, DealerTypeDocument } from './schemas/dealer-type.schema';
import { CreatePriceDto } from './dto/create-price.dto';
import { UpdatePriceDto } from './dto/update-price.dto';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { CreateDealerTypeDto } from './dto/create-dealer-type.dto';

@Injectable()
export class PricesService {
  constructor(
    @InjectModel(Price.name) private priceModel: Model<PriceDocument>,
    @InjectModel(DealerType.name)
    private dealerTypeModel: Model<DealerTypeDocument>,
  ) {}

  async create(createPriceDto: CreatePriceDto): Promise<Price> {
    const createdPrice = new this.priceModel(createPriceDto);
    return createdPrice.save();
  }

  async findAll(): Promise<Price[]> {
    return this.priceModel.find().sort({ id: 1 }).exec();
  }

  async findAllForDealer(level: string): Promise<Partial<Price>[]> {
    const prices = await this.priceModel.find().sort({ id: 1 }).exec();

    return prices.map((price) => {
      const priceObj = price.toObject();
      const levelAmount = priceObj[level] + priceObj.upsellAmount || priceObj.upsellAmount || 0;

      return {
        location: priceObj.location,
        price: levelAmount,
      };
    });
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

  async parseAndSaveFile(file: Express.Multer.File): Promise<Price[]> {
    const filePath = file.path;
    const fileExt = path.extname(file.originalname).toLowerCase();
    let rows: any[] = [];

    try {
      if (fileExt === '.xlsx') {
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        rows = XLSX.utils.sheet_to_json(worksheet);
      } else if (fileExt === '.csv') {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        rows = parse(fileContent, {
          columns: true,
          skip_empty_lines: true,
        });
      } else if (fileExt === '.numbers') {
        throw new BadRequestException('Numbers file format is not supported yet');
      }

      // Validate required columns
      const requiredColumns = ['location', 'upsellAmount', 'basePrice'];
      const firstRow = rows[0];
      const missingColumns = requiredColumns.filter((col) => !(col in firstRow));

      if (missingColumns.length > 0) {
        throw new BadRequestException(`Missing required columns: ${missingColumns.join(', ')}`);
      }

      // Find the highest id in the database
      const highestPrice = await this.priceModel.findOne().sort({ id: -1 }).exec();

      let nextId = highestPrice ? highestPrice.id + 1 : 1;
      const now = new Date();

      // Prepare bulk operations
      const operations = rows.map((row) => ({
        insertOne: {
          document: {
            id: nextId++,
            location: row.location,
            upsellAmount: Number(row.upsellAmount),
            basePrice: Number(row.basePrice),
            createdAt: now,
            updatedAt: now,
          },
        },
      }));

      // Use bulkWrite for better performance
      const result = await this.priceModel.bulkWrite(operations);
      console.log(`Bulk inserted ${result.insertedCount} prices`);

      // Fetch the created documents
      const startId = highestPrice ? highestPrice.id + 1 : 1;
      const endId = startId + rows.length - 1;

      const savedPrices = await this.priceModel
        .find({
          id: { $gte: startId, $lte: endId },
        })
        .sort({ id: 1 })
        .exec();

      // Clean up the uploaded file
      fs.unlinkSync(filePath);

      return savedPrices;
    } catch (error) {
      // Clean up the uploaded file in case of error
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      throw error;
    }
  }

  // Dealer Type methods
  async createDealerType(createDealerTypeDto: CreateDealerTypeDto): Promise<DealerType> {
    // First create the dealer type
    const createdDealerType = new this.dealerTypeModel(createDealerTypeDto);
    const savedDealerType = await createdDealerType.save();

    // Then update all existing price objects with the new dealer type
    const prices = await this.priceModel.find().exec();

    // Update each price document with the new dealer type field
    for (const price of prices) {
      await this.priceModel.findByIdAndUpdate(
        price._id,
        { $set: { [savedDealerType.name]: savedDealerType.amount } },
        { new: true },
      );
    }

    return savedDealerType;
  }

  async findAllDealerTypes(): Promise<DealerType[]> {
    return this.dealerTypeModel.find().exec();
  }

  async findDealerTypeById(id: string): Promise<DealerType> {
    return this.dealerTypeModel.findById(id).exec();
  }

  async updateDealerType(
    id: string,
    updateData: Partial<CreateDealerTypeDto>,
  ): Promise<DealerType> {
    const dealerType = await this.dealerTypeModel.findById(id);
    if (!dealerType) {
      throw new NotFoundException(`Dealer type with ID ${id} not found`);
    }

    // If name is being updated, we need to update all price objects
    if (updateData.name && updateData.name !== dealerType.name) {
      const prices = await this.priceModel.find().exec();

      // Update each price document
      for (const price of prices) {
        const priceObj = price.toObject();
        const oldValue = priceObj[dealerType.name];

        // Remove old field and add new field
        await this.priceModel.findByIdAndUpdate(
          price._id,
          {
            $unset: { [dealerType.name]: 1 },
            $set: { [updateData.name]: oldValue },
          },
          { new: true },
        );
      }
    }

    // If amount is being updated, update all price objects with the new amount
    if (updateData.amount !== undefined) {
      const prices = await this.priceModel.find().exec();

      for (const price of prices) {
        await this.priceModel.findByIdAndUpdate(
          price._id,
          { $set: { [dealerType.name]: updateData.amount } },
          { new: true },
        );
      }
    }

    return this.dealerTypeModel.findByIdAndUpdate(id, updateData, { new: true }).exec();
  }

  async deleteDealerType(id: string): Promise<DealerType> {
    const dealerType = await this.dealerTypeModel.findById(id);
    if (!dealerType) {
      throw new NotFoundException(`Dealer type with ID ${id} not found`);
    }

    // Remove the dealer type field from all price objects
    const prices = await this.priceModel.find().exec();

    for (const price of prices) {
      await this.priceModel.findByIdAndUpdate(
        price._id,
        { $unset: { [dealerType.name]: 1 } },
        { new: true },
      );
    }

    return this.dealerTypeModel.findByIdAndDelete(id).exec();
  }
}
