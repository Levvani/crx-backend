import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Price, PriceDocument } from './schemas/price.schema';
import { DealerType, DealerTypeDocument } from './schemas/dealer-type.schema';
import { CreatePriceDto } from './dto/create-price.dto';
import { UpdatePriceDto } from './dto/update-price.dto';
import { AddDynamicKeyDto } from './dto/add-dynamic-key.dto';
import * as XLSX from 'xlsx';
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
    // Get all existing dealer types to add their fields to the new price object
    const existingDealerTypes = await this.dealerTypeModel.find().exec();
    const dealerTypeFields: Record<string, number> = {};
    const upsellAmount = createPriceDto.upsellAmount || 0;

    existingDealerTypes.forEach((dealerType) => {
      dealerTypeFields[dealerType.name] = dealerType.amount + upsellAmount;
    });

    // Create price object with existing dealer type fields
    const priceData = {
      ...createPriceDto,
      ...dealerTypeFields, // Add correctly calculated dealer type fields
    };

    const createdPrice = new this.priceModel(priceData);
    return createdPrice.save();
  }

  async findAll(): Promise<Price[]> {
    return this.priceModel.find().sort({ id: 1 }).exec();
  }

  async findAllForDealer(level: string): Promise<Partial<Price>[]> {
    const prices = await this.priceModel.find().sort({ id: 1 }).exec();

    return prices.map((price) => {
      const priceObj = price.toObject();
      const levelPrice = Number(priceObj[level]) || 0;
      const upsellAmount = Number(priceObj.upsellAmount) || 0;
      const levelAmount = levelPrice;

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
    // If upsellAmount is being updated, we need to recalculate dealer type fields
    if ('upsellAmount' in updatePriceDto) {
      const dealerTypes = await this.dealerTypeModel.find().exec();
      const newUpsellAmount = updatePriceDto.upsellAmount;
      
      // Recalculate all dealer type fields with the new upsellAmount
      dealerTypes.forEach((dealerType) => {
        updatePriceDto[dealerType.name] = dealerType.amount + newUpsellAmount;
      });
    }

    const updatedPrice = await this.priceModel
      .findOneAndUpdate({ id }, updatePriceDto, { new: true })
      .exec();

    if (!updatedPrice) {
      throw new NotFoundException(`Price with ID ${id} not found`);
    }

    return updatedPrice;
  }

  async addDynamicKey(
    addDynamicKeyDto: AddDynamicKeyDto,
  ): Promise<{ message: string; affectedCount: number }> {
    const { name, amount } = addDynamicKeyDto;

    // Check if a dealer type with this name already exists
    const existingDealerType = await this.dealerTypeModel.findOne({ name }).exec();
    if (existingDealerType) {
      throw new BadRequestException(`Dealer type with name '${name}' already exists`);
    }

    // Create the new dealer type
    const newDealerType = new this.dealerTypeModel({ name, amount });
    await newDealerType.save();

    // Update all existing price documents with calculated values using aggregation pipeline
    const updateResult = await this.priceModel
      .updateMany({}, [
        {
          $set: {
            [name]: { $add: [amount, { $ifNull: ['$upsellAmount', 0] }] },
          },
        },
      ])
      .exec();

    return {
      message: `Successfully added dealer type '${name}' with calculated values (amount + upsellAmount) to all base prices`,
      affectedCount: updateResult.modifiedCount,
    };
  }

  async parseAndSaveFile(file: Express.Multer.File): Promise<Price[]> {
    if (!file || !file.buffer) {
      throw new BadRequestException('Invalid file or file buffer is missing');
    }

    const fileExt = path.extname(file.originalname).toLowerCase();
    let rows: any[] = [];

    try {
      if (fileExt === '.xlsx') {
        // Parse Excel file from buffer
        const workbook = XLSX.read(file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
          throw new BadRequestException('Excel file has no sheets');
        }
        const worksheet = workbook.Sheets[sheetName];
        rows = XLSX.utils.sheet_to_json(worksheet);
      } else if (fileExt === '.csv') {
        // Parse CSV file from buffer
        const fileContent = file.buffer.toString('utf-8');
        rows = parse(fileContent, {
          columns: true,
          skip_empty_lines: true,
        }) as Record<string, unknown>[];
      } else if (fileExt === '.numbers') {
        throw new BadRequestException('Numbers file format is not supported yet');
      }

      // Validate required columns
      const requiredColumns = ['location', 'upsellAmount', 'basePrice'];
      const firstRow = rows[0] as Record<string, any>;
      if (!firstRow) {
        throw new BadRequestException('File is empty or has no data rows');
      }
      
      const missingColumns = requiredColumns.filter((col) => !(col in firstRow));
      if (missingColumns.length > 0) {
        throw new BadRequestException(`Missing required columns: ${missingColumns.join(', ')}`);
      }

      // Get existing locations and highest id
      const existingPrices = await this.priceModel.find({}, { location: 1, id: 1 }).exec();
      const existingLocations = new Set(existingPrices.map(p => p.location));
      const highestPrice = await this.priceModel.findOne().sort({ id: -1 }).exec();

      // Get all existing dealer types to add their fields to price objects
      const existingDealerTypes = await this.dealerTypeModel.find().exec();

      let nextId: number = highestPrice ? (highestPrice.id as number) + 1 : 1;
      const now = new Date();

      // Prepare bulk operations with upsert logic
      const operations = rows.map((row: any, index: number) => {
        const r = row as {
          location: string;
          upsellAmount: number | string;
          basePrice: number | string;
        };
        
        // Validate and convert numeric fields
        const upsellAmount = this.parseNumberField(r.upsellAmount, `upsellAmount at row ${index + 2}`);
        const basePrice = this.parseNumberField(r.basePrice, `basePrice at row ${index + 2}`);
        
        // Validate required fields
        if (!r.location || r.location.toString().trim() === '') {
          throw new BadRequestException(`Location is required at row ${index + 2}`);
        }
        
        const location = r.location.toString().trim();
        
        // Calculate dealer type fields correctly: amount + upsellAmount
        const dealerTypeFields: Record<string, number> = {};
        existingDealerTypes.forEach((dealerType) => {
          dealerTypeFields[dealerType.name] = dealerType.amount + upsellAmount;
        });

        const isExistingLocation = existingLocations.has(location);
        
        if (isExistingLocation) {
          // Update existing location: keep id and createdAt, update other fields
          return {
            updateOne: {
              filter: { location },
              update: {
                $set: {
                  upsellAmount,
                  basePrice,
                  ...dealerTypeFields, // Recalculated dealer type fields
                  updatedAt: now,
                },
              },
            },
          };
        } else {
          // Insert new location with new id
          return {
            updateOne: {
              filter: { location },
              update: {
                $setOnInsert: {
                  id: nextId++,
                  location,
                  createdAt: now,
                },
                $set: {
                  upsellAmount,
                  basePrice,
                  ...dealerTypeFields, // Calculated dealer type fields
                  updatedAt: now,
                },
              },
              upsert: true,
            },
          };
        }
      });

      // Use bulkWrite for better performance
      const result = await this.priceModel.bulkWrite(operations);
      console.log(`Bulk operations completed: ${result.upsertedCount} inserted, ${result.modifiedCount} updated`);

      // Fetch all affected documents by location
      const locations = rows.map((row: any) => row.location);
      const savedPrices = await this.priceModel
        .find({ location: { $in: locations } })
        .sort({ id: 1 })
        .exec();

      return savedPrices;
    } catch (error) {
      console.error('Error processing price file:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(`Failed to process file: ${errorMessage}`);
    }
  }

  // Dealer Type methods

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
        const priceObj = price.toObject() as Record<string, any>;
        const oldValue: number = priceObj[dealerType.name] as number;

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

  /**
   * Helper method to safely parse number fields from file data
   * @param value - The value to parse (can be string, number, null, undefined)
   * @param fieldName - Field name for error messages
   * @returns Valid number
   * @throws BadRequestException if value is not a valid number
   */
  private parseNumberField(value: any, fieldName: string): number {
    // Handle null, undefined, or empty string
    if (value === null || value === undefined || value === '') {
      throw new BadRequestException(`${fieldName} is required and cannot be empty`);
    }

    // Convert to number
    const numValue = Number(value);

    // Check if conversion resulted in NaN
    if (isNaN(numValue)) {
      throw new BadRequestException(`${fieldName} must be a valid number, got: "${value}"`);
    }

    // Check for negative numbers if business logic requires positive values
    if (numValue < 0) {
      throw new BadRequestException(`${fieldName} cannot be negative, got: ${numValue}`);
    }

    return numValue;
  }
}
