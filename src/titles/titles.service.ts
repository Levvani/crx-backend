// src/titles/titles.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Title, TitleDocument } from './schemas/title.schema';
import { CreateTitleDto } from './dto/create-title.dto';
import { UpdateTitleDto } from './dto/update-title.dto';

@Injectable()
export class TitlesService {
  constructor(@InjectModel(Title.name) private titleModel: Model<TitleDocument>) {}

  async create(
    createTitleDto: CreateTitleDto | CreateTitleDto[],
  ): Promise<TitleDocument | TitleDocument[]> {
    // Handle single DTO case
    if (!Array.isArray(createTitleDto)) {
      return this.createSingleTitle(createTitleDto);
    }

    // For multiple DTOs, use the more efficient bulk method
    return this.createBulk(createTitleDto);
  }

  /**
   * Efficiently creates multiple titles using MongoDB bulk operations
   * This is much faster than creating titles one by one
   */
  async createBulk(createTitleDtos: CreateTitleDto[]): Promise<TitleDocument[]> {
    if (createTitleDtos.length === 0) {
      return [];
    }

    try {
      // Find the highest titleID in the database once
      const highestTitle = await this.titleModel.findOne().sort({ titleID: -1 }).exec();

      let nextTitleID = highestTitle ? highestTitle.titleID + 1 : 1;
      const now = new Date();

      // Prepare all documents for bulk insertion
      const operations = createTitleDtos.map((dto) => ({
        insertOne: {
          document: {
            ...dto,
            titleID: nextTitleID++,
            createdAt: now,
            updatedAt: now,
          },
        },
      }));

      // Use bulkWrite for much better performance
      const result = await this.titleModel.bulkWrite(operations);
      console.log(`Bulk inserted ${result.insertedCount} titles`);

      // Fetch the created documents
      const startId = highestTitle ? highestTitle.titleID + 1 : 1;
      const endId = startId + createTitleDtos.length - 1;

      return this.titleModel
        .find({
          titleID: { $gte: startId, $lte: endId },
        })
        .sort({ titleID: 1 })
        .exec();
    } catch (error) {
      console.error('Bulk title creation failed:', error);
      // If bulk insert fails (e.g., due to duplicate keys), fall back to individual creation
      console.log('Falling back to individual title creation...');
      const createdTitles: TitleDocument[] = [];

      for (const dto of createTitleDtos) {
        try {
          const title = await this.createSingleTitle(dto);
          createdTitles.push(title);
        } catch (err) {
          console.error(`Failed to create title "${dto.name}"`, err);
          // Continue with the next title
        }
      }

      return createdTitles;
    }
  }

  // Helper method to create a single title
  private async createSingleTitle(createTitleDto: CreateTitleDto): Promise<TitleDocument> {
    // Find the highest titleID in the database
    const highestTitle = await this.titleModel.findOne().sort({ titleID: -1 }).exec();

    // Generate the next titleID
    const nextTitleID = highestTitle ? highestTitle.titleID + 1 : 1;

    // Create a new title with the next titleID
    const newTitle = new this.titleModel({
      ...createTitleDto,
      titleID: nextTitleID,
    });

    return newTitle.save();
  }

  async findAll(): Promise<TitleDocument[]> {
    return this.titleModel.find().sort({ titleID: 1 }).exec();
  }

  async findOne(titleID: number): Promise<TitleDocument> {
    const title = await this.titleModel.findOne({ titleID }).exec();

    if (!title) {
      throw new NotFoundException(`Title with ID ${titleID} not found`);
    }

    return title;
  }

  async findByName(name: string): Promise<TitleDocument | null> {
    return this.titleModel.findOne({ name }).exec();
  }

  async update(titleID: number, updateTitleDto: UpdateTitleDto): Promise<TitleDocument> {
    // First check if the title exists
    await this.findOne(titleID);

    // Update the title
    const updatedTitle = await this.titleModel
      .findOneAndUpdate(
        { titleID },
        {
          $set: {
            ...updateTitleDto,
            updatedAt: new Date(),
          },
        },
        { new: true },
      )
      .exec();

    return updatedTitle;
  }
}
