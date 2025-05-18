// src/titles/titles.service.ts
import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Title, TitleDocument } from "./schemas/title.schema";
import { CreateTitleDto } from "./dto/create-title.dto";
import { UpdateTitleDto } from "./dto/update-title.dto";

@Injectable()
export class TitlesService {
  constructor(
    @InjectModel(Title.name) private titleModel: Model<TitleDocument>
  ) {}

  async create(createTitleDto: CreateTitleDto): Promise<TitleDocument> {
    // Find the highest titleID in the database
    const highestTitle = await this.titleModel
      .findOne()
      .sort({ titleID: -1 })
      .exec();

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

  async update(
    titleID: number,
    updateTitleDto: UpdateTitleDto
  ): Promise<TitleDocument> {
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
        { new: true }
      )
      .exec();

    return updatedTitle;
  }
}
