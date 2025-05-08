// src/users/users.service.ts
import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import * as bcrypt from "bcrypt";
import { User, UserDocument, UserRole } from "./schemas/user.schema";
import { CreateUserDto } from "./dto/create-user.dto";

interface PaginationOptions {
  page: number;
  limit: number;
  role?: UserRole;
  level?: string;
  search?: string;
}

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async create(createUserDto: CreateUserDto): Promise<UserDocument> {
    try {
      // Check if user already exists
      const existingUser = await this.userModel.findOne({
        $or: [
          { username: createUserDto.username },
          { email: createUserDto.email },
        ],
      });

      if (existingUser) {
        throw new ConflictException("Username or email already exists");
      }

      // Hash the password
      const salt = await bcrypt.genSalt();
      const hashedPassword = await bcrypt.hash(createUserDto.password, salt);

      // Find the highest userID in the database
      const highestUser = await this.userModel
        .findOne()
        .sort({ userID: -1 })
        .exec();

      // Ensure we have a valid numeric userID
      let nextUserID = 1; // Default to 1 if no users exist
      if (
        highestUser &&
        typeof highestUser.userID === "number" &&
        !isNaN(highestUser.userID)
      ) {
        nextUserID = highestUser.userID + 1;
      }

      // If userID was provided in the DTO and it's valid, use it
      if (createUserDto.userID !== undefined) {
        if (
          typeof createUserDto.userID !== "number" ||
          isNaN(createUserDto.userID)
        ) {
          throw new BadRequestException("userID must be a valid number");
        }
        nextUserID = createUserDto.userID;
      }

      // Create new user with explicit properties rather than spreading
      const newUser = new this.userModel({
        userID: nextUserID,
        username: createUserDto.username,
        firstname: createUserDto.firstname,
        lastname: createUserDto.lastname,
        password: hashedPassword,
        email: createUserDto.email,
        role: createUserDto.role || UserRole.DEALER,
        level: createUserDto.level || "A",
        totalBalance: createUserDto.totalBalance || 0,
        profitBalance: createUserDto.profitBalance || 0,
        phoneNumber: createUserDto.phoneNumber || null,
      });

      console.log("Attempting to save user:", {
        ...newUser.toObject(),
        password: "[REDACTED]",
      });

      return await newUser.save();
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  }

  async findByUsername(username: string): Promise<UserDocument> {
    const user = await this.userModel.findOne({ username }).exec();
    if (!user) {
      throw new NotFoundException(`User with username ${username} not found`);
    }
    return user;
  }

  async findById(id: string): Promise<UserDocument> {
    // Convert string id to number for userID lookup
    const numericId = parseInt(id, 10);

    // Check if conversion was successful
    if (isNaN(numericId)) {
      throw new BadRequestException(`Invalid userID format: ${id}`);
    }

    // Find by userID instead of MongoDB _id
    const user = await this.userModel.findOne({ userID: numericId }).exec();

    if (!user) {
      throw new NotFoundException(`User with userID ${numericId} not found`);
    }

    return user;
  }

  async findAll(
    paginationOptions: PaginationOptions = { page: 1, limit: 25 },
  ): Promise<{
    users: UserDocument[];
    total: number;
    totalPages: number;
    page: number;
    limit: number;
  }> {
    const { page, limit, role, level, search } = paginationOptions;
    const skip = (page - 1) * limit;

    // Build filter object based on provided parameters
    const filter: Record<string, any> = {};

    if (role !== undefined && role !== null) {
      console.log(`Adding role filter: ${role}`);
      filter.role = role;
    }

    if (level !== undefined && level !== null && level !== "") {
      console.log(`Adding level filter: ${level}`);
      filter.level = level;
    }

    if (search !== undefined && search !== null && search !== "") {
      console.log(`Adding search filter for: ${search}`);
      filter.$or = [
        { username: { $regex: search, $options: "i" } },
        { firstname: { $regex: search, $options: "i" } },
        { lastname: { $regex: search, $options: "i" } },
      ];
    }

    console.log("MongoDB filter:", JSON.stringify(filter));

    // Check if filter is empty
    if (Object.keys(filter).length === 0) {
      console.log("Warning: Filter is empty - will return all results");
    }

    const [users, total] = await Promise.all([
      this.userModel
        .find(filter)
        .sort({ createdAt: -1 }) // Sort by createdAt in descending order (newest first)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.userModel.countDocuments(filter).exec(),
    ]);

    return {
      users,
      total,
      totalPages: Math.ceil(total / limit),
      page,
      limit,
    };
  }

  async updateRole(id: string, role: UserRole): Promise<UserDocument> {
    const numericId = parseInt(id, 10);

    if (isNaN(numericId)) {
      throw new BadRequestException(`Invalid userID format: ${id}`);
    }

    const user = await this.userModel
      .findOneAndUpdate({ userID: numericId }, { role }, { new: true })
      .exec();

    if (!user) {
      throw new NotFoundException(`User with userID ${numericId} not found`);
    }

    return user;
  }

  async updatePassword(
    id: string,
    hashedPassword: string,
  ): Promise<UserDocument> {
    const numericId = parseInt(id, 10);

    if (isNaN(numericId)) {
      throw new BadRequestException(`Invalid userID format: ${id}`);
    }

    const user = await this.userModel
      .findOneAndUpdate(
        { userID: numericId },
        { password: hashedPassword },
        { new: true },
      )
      .exec();

    if (!user) {
      throw new NotFoundException(`User with userID ${numericId} not found`);
    }

    return user;
  }

  async findByEmail(email: string): Promise<UserDocument> {
    const user = await this.userModel.findOne({ email }).exec();
    if (!user) {
      throw new NotFoundException(`User with email ${email} not found`);
    }
    return user;
  }

  async findDealers(
    paginationOptions: PaginationOptions = { page: 1, limit: 25 },
  ): Promise<{
    users: UserDocument[];
    total: number;
    totalPages: number;
    page: number;
    limit: number;
  }> {
    const { page, limit, level, search } = paginationOptions;
    const skip = (page - 1) * limit;

    // Build filter object with fixed dealer role
    const filter: Record<string, any> = { role: UserRole.DEALER };

    if (level !== undefined && level !== null && level !== "") {
      console.log(`Adding level filter: ${level}`);
      filter.level = level;
    }

    if (search !== undefined && search !== null && search !== "") {
      console.log(`Adding search filter for: ${search}`);
      filter.$or = [
        { username: { $regex: search, $options: "i" } },
        { firstname: { $regex: search, $options: "i" } },
        { lastname: { $regex: search, $options: "i" } },
      ];
    }

    console.log("MongoDB filter for dealers:", JSON.stringify(filter));

    const [users, total] = await Promise.all([
      this.userModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.userModel.countDocuments(filter).exec(),
    ]);

    return {
      users,
      total,
      totalPages: Math.ceil(total / limit),
      page,
      limit,
    };
  }
}
