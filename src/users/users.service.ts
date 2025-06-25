// src/users/users.service.ts
import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument, UserRole } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

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
    // Check if user already exists
    const existingUser = await this.userModel.findOne({
      $or: [{ username: createUserDto.username }, { email: createUserDto.email }],
    });

    if (existingUser) {
      throw new ConflictException('Username or email already exists');
    }

    // Hash the password
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(createUserDto.password, salt);

    // Find the highest userID in the database
    const highestUser = await this.userModel.findOne().sort({ userID: -1 }).exec();

    // Ensure we have a valid numeric userID
    let nextUserID = 1; // Default to 1 if no users exist
    if (highestUser && typeof highestUser.userID === 'number' && !isNaN(highestUser.userID)) {
      nextUserID = highestUser.userID + 1;
    }

    // If userID was provided in the DTO and it's valid, use it
    if (createUserDto.userID !== undefined) {
      if (typeof createUserDto.userID !== 'number' || isNaN(createUserDto.userID)) {
        throw new BadRequestException('userID must be a valid number');
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
      level: createUserDto.level || 'A',
      totalBalance: createUserDto.totalBalance || 0,
      profitBalance: createUserDto.profitBalance || 0,
      phoneNumber: createUserDto.phoneNumber || null,
    });

    return await newUser.save();
  }

  async findByUsername(username: string): Promise<UserDocument> {
    const user = await this.userModel.findOne({ username }).exec();
    if (!user) {
      throw new NotFoundException(`User with username ${username} not found`);
    }
    return user;
  }

  async findById(id: number): Promise<UserDocument> {
    const user = await this.userModel.findOne({ userID: id }).exec();

    if (!user) {
      throw new NotFoundException(`User with userID ${id} not found`);
    }

    return user;
  }

  async findAll(paginationOptions: PaginationOptions = { page: 1, limit: 25 }): Promise<{
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
      filter.role = role;
    }

    if (level !== undefined && level !== null && level !== '') {
      filter.level = level;
    }

    if (search !== undefined && search !== null && search !== '') {
      filter.$or = [
        { username: { $regex: search, $options: 'i' } },
        { firstname: { $regex: search, $options: 'i' } },
        { lastname: { $regex: search, $options: 'i' } },
      ];
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

  async updateRole(id: number, role: UserRole): Promise<UserDocument> {
    if (isNaN(id)) {
      throw new BadRequestException(`Invalid userID format: ${id}`);
    }

    const user = await this.userModel
      .findOneAndUpdate({ userID: id }, { role }, { new: true })
      .exec();

    if (!user) {
      throw new NotFoundException(`User with userID ${id} not found`);
    }

    return user;
  }

  async updatePassword(id: number, hashedPassword: string): Promise<UserDocument> {
    if (isNaN(id)) {
      throw new BadRequestException(`Invalid userID format: ${id}`);
    }

    const user = await this.userModel
      .findOneAndUpdate({ userID: id }, { password: hashedPassword }, { new: true })
      .exec();

    if (!user) {
      throw new NotFoundException(`User with userID ${id} not found`);
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

  async findDealers(paginationOptions: PaginationOptions = { page: 1, limit: 25 }): Promise<{
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

    if (level !== undefined && level !== null && level !== '') {
      filter.level = level;
    }

    if (search !== undefined && search !== null && search !== '') {
      filter.$or = [
        { username: { $regex: search, $options: 'i' } },
        { firstname: { $regex: search, $options: 'i' } },
        { lastname: { $regex: search, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.userModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
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

  async addRefreshToken(userId: number, refreshToken: string): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    const user = await this.userModel.findOne({ userID: userId });

    // Remove expired tokens first
    await this.removeExpiredTokens(userId);

    // Check if max tokens reached (although we have schema validation, we want to handle it gracefully)
    if (user.refreshTokens.length >= 5) {
      // Remove the oldest token
      await this.userModel.updateOne({ userID: userId }, { $pop: { refreshTokens: -1 } });
    }

    // Add new token
    await this.userModel.updateOne(
      { userID: userId },
      {
        $push: {
          refreshTokens: {
            token: refreshToken,
            expiresAt: expiresAt,
          },
        },
      },
    );
  }

  async removeRefreshToken(userID: number, refreshToken: string): Promise<void> {
    await this.userModel.updateOne(
      { userID },
      {
        $pull: {
          refreshTokens: {
            token: refreshToken,
          },
        },
      },
    );
  }

  async removeExpiredTokens(userID: number): Promise<void> {
    const now = new Date();
    await this.userModel.updateOne(
      { userID },
      {
        $pull: {
          refreshTokens: {
            expiresAt: { $lt: now },
          },
        },
      },
    );
  }

  async removeAllRefreshTokens(userID: number): Promise<void> {
    await this.userModel.updateOne({ userID }, { $set: { refreshTokens: [] } });
  }

  async cleanupExpiredTokens(): Promise<void> {
    const now = new Date();
    await this.userModel.updateMany(
      {},
      {
        $pull: {
          refreshTokens: {
            expiresAt: { $lt: now },
          },
        },
      },
    );
  }

  async update(userID: number, updateUserDto: UpdateUserDto): Promise<UserDocument> {
    if (isNaN(userID)) {
      throw new BadRequestException(`Invalid userID format: ${userID}`);
    }

    // Check if user exists
    const existingUser = await this.userModel.findOne({ userID: userID }).exec();
    if (!existingUser) {
      throw new NotFoundException(`User with userID ${userID} not found`);
    }

    // Create update object
    const updateData: Partial<User> = { ...updateUserDto };

    // If password is provided, hash it
    if (updateData.password) {
      const salt = await bcrypt.genSalt();
      updateData.password = await bcrypt.hash(updateData.password, salt);
    }

    // Ensure username and role cannot be updated
    if ('username' in updateData) {
      delete updateData.username;
    }

    if ('role' in updateData) {
      delete updateData.role;
    }

    // Check if email is being updated and ensure it's unique
    if (updateData.email) {
      const query = {
        userID: { $ne: userID },
        email: updateData.email,
      };

      const duplicateUser = await this.userModel.findOne(query).exec();
      if (duplicateUser) {
        throw new ConflictException(`Email '${updateData.email}' is already in use`);
      }
    }

    // Update the user
    const updatedUser = await this.userModel
      .findOneAndUpdate({ userID: userID }, { $set: updateData }, { new: true })
      .exec();

    return updatedUser;
  }

  async updateTotalBalance(userID: number, toBePaid: number): Promise<void> {
    if (isNaN(userID)) {
      throw new BadRequestException(`Invalid userID format: ${userID}`);
    }

    // First, get the current user to check the resulting balance
    const user = await this.userModel.findOne({ userID }).exec();
    if (!user) {
      throw new NotFoundException(`User with userID ${userID} not found`);
    }

    const currentBalance = user.totalBalance || 0;
    const newBalance = currentBalance + toBePaid;

    // If the new balance would be negative, set it to 0 instead
    const finalBalance = newBalance < 0 ? 0 : newBalance;

    await this.userModel.updateOne({ userID }, { $set: { totalBalance: finalBalance } });
  }
}
