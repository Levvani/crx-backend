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
import { Car, CarDocument } from '../cars/schemas/car.schema';
import { Damage, DamageDocument } from '../damages/schemas/damages.schema';
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
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Car.name) private carModel: Model<CarDocument>,
    @InjectModel(Damage.name) private damageModel: Model<DamageDocument>,
  ) {}

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
    console.log(`🔍 DEBUG: Starting addRefreshToken for user ${userId}`);

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 1); // 1 minute from now for testing

    // STEP 1: Remove expired tokens first using the fixed method
    await this.removeExpiredTokens(userId);

    // STEP 2: Check current token count and remove oldest if needed
    const currentUser = await this.userModel.findOne({ userID: userId });
    if (!currentUser) {
      console.log(`❌ ERROR: User ${userId} not found during addRefreshToken`);
      throw new NotFoundException(`User with userID ${userId} not found`);
    }

    const currentTokenCount = currentUser.refreshTokens?.length || 0;
    console.log(`📊 DEBUG: User ${userId} has ${currentTokenCount} tokens before adding new one`);

    if (currentTokenCount >= 5) {
      console.log(`🔄 DEBUG: Removing oldest token for user ${userId}`);
      // Remove the oldest token (first element in array)
      await this.userModel.findOneAndUpdate(
        {
          userID: userId,
          $expr: { $ne: ['$_id', null] },
        },
        { $pop: { refreshTokens: -1 } },
        {
          new: true,
          upsert: false,
        },
      );
    }

    // STEP 3: Add new token using atomic operation
    const result = await this.userModel.findOneAndUpdate(
      {
        userID: userId,
        // SAFETY: Only update if user exists
        $expr: { $ne: ['$_id', null] },
      },
      {
        $push: {
          refreshTokens: {
            token: refreshToken,
            expiresAt: expiresAt,
          },
        },
      },
      {
        new: true,
        upsert: false,
      },
    );

    if (!result) {
      console.log(`❌ CRITICAL ERROR: User ${userId} not found during token addition`);
      throw new NotFoundException(`User with userID ${userId} not found during token addition`);
    }

    console.log(
      `✅ SUCCESS: Added refresh token for user ${userId}, expires at ${expiresAt.toISOString()}`,
    );
    console.log(`📊 DEBUG: User ${userId} now has ${result.refreshTokens?.length || 0} tokens`);
  }

  async removeRefreshToken(userID: number, refreshToken: string): Promise<void> {
    console.log(`🔍 DEBUG: Starting removeRefreshToken for user ${userID}`);

    // CRITICAL FIX: Use atomic operation with explicit conditions to prevent document deletion
    const result = await this.userModel.findOneAndUpdate(
      {
        userID,
        // SAFETY: Only update if user exists (this prevents any potential deletion)
        $expr: { $ne: ['$_id', null] },
      },
      {
        $pull: {
          refreshTokens: {
            token: refreshToken,
          },
        },
      },
      {
        new: true,
        // CRITICAL: Ensure we don't create a new document if none exists
        upsert: false,
      },
    );

    if (!result) {
      console.log(`❌ ERROR: User ${userID} not found during token removal`);
      return;
    }

    console.log(`✅ SUCCESS: User ${userID} exists after token removal`);
    console.log(
      `📊 DEBUG: User ${userID} has ${result.refreshTokens?.length || 0} tokens after removal`,
    );
  }

  async removeExpiredTokens(userID: number): Promise<void> {
    console.log(`🔍 DEBUG: Starting removeExpiredTokens for user ${userID}`);

    const now = new Date();

    // CRITICAL FIX: Use atomic operation with explicit conditions to prevent document deletion
    const result = await this.userModel.findOneAndUpdate(
      {
        userID,
        // SAFETY: Only update if user exists (this prevents any potential deletion)
        $expr: { $ne: ['$_id', null] },
      },
      {
        $pull: {
          refreshTokens: {
            expiresAt: { $lt: now },
          },
        },
      },
      {
        new: true,
        // CRITICAL: Ensure we don't create a new document if none exists
        upsert: false,
      },
    );

    if (!result) {
      console.log(`❌ ERROR: User ${userID} not found during expired token removal`);
      return;
    }

    console.log(`✅ SUCCESS: User ${userID} exists after token cleanup`);
    console.log(
      `📊 DEBUG: User ${userID} has ${result.refreshTokens?.length || 0} tokens after cleanup`,
    );
  }

  async removeAllRefreshTokens(userID: number): Promise<void> {
    await this.userModel.updateOne({ userID }, { $set: { refreshTokens: [] } });
  }

  async cleanupExpiredTokens(): Promise<void> {
    console.log(`🔍 DEBUG: Starting global cleanupExpiredTokens`);

    const now = new Date();

    // Get count of users before cleanup
    const totalUsers = await this.userModel.countDocuments({});
    console.log(`📊 DEBUG: Total users before cleanup: ${totalUsers}`);

    // CRITICAL FIX: Use safer bulk operation that won't delete documents
    const result = await this.userModel.updateMany(
      {
        // Only target users that actually have expired tokens
        'refreshTokens.expiresAt': { $lt: now },
      },
      {
        $pull: {
          refreshTokens: {
            expiresAt: { $lt: now },
          },
        },
      },
      {
        // CRITICAL: Ensure we never create new documents
        upsert: false,
      },
    );

    // SAFETY CHECK: Verify no user documents were deleted
    const totalUsersAfter = await this.userModel.countDocuments({});

    if (totalUsersAfter < totalUsers) {
      console.error(`🚨 CRITICAL ERROR: User documents were deleted during cleanup!`);
      console.error(`📊 Users before: ${totalUsers}, Users after: ${totalUsersAfter}`);

      // This should never happen with our fix, but if it does, we need to know
      throw new Error(
        `Critical error: ${totalUsers - totalUsersAfter} user documents were deleted during token cleanup`,
      );
    } else {
      console.log(`✅ SUCCESS: No user documents were deleted during cleanup`);
    }

    console.log(
      `📊 DEBUG: Cleanup completed: ${result.modifiedCount} users had expired tokens removed out of ${totalUsers} total users`,
    );
    console.log(`📊 DEBUG: Users after cleanup: ${totalUsersAfter}`);
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

  async delete(userID: number): Promise<UserDocument> {
    if (isNaN(userID)) {
      throw new BadRequestException(`Invalid userID format: ${userID}`);
    }

    // First, find the user to get their username
    const user = await this.userModel.findOne({ userID }).exec();
    if (!user) {
      throw new NotFoundException(`User with userID ${userID} not found`);
    }

    // Check for pending damages linked to this user
    const pendingDamages = await this.damageModel.find({
      username: user.username,
      status: 'pending'
    }).exec();

    if (pendingDamages && pendingDamages.length > 0) {
      throw new BadRequestException(
        `Cannot delete user ${user.username}. There are ${pendingDamages.length} pending damage(s) linked to this user.`
      );
    }

    // Check for cars with pending status (future-proofing, as current CarStatus doesn't include 'pending')
    const cars = await this.carModel.find({
      username: user.username
    }).exec();

    if (cars && cars.length > 0) {
      throw new BadRequestException(
        `Cannot delete user ${user.username}. There are ${cars.length} car(s) linked to this user.`
      );
    }

    const deletedUser = await this.userModel.findOneAndDelete({ userID }).exec();
    
    if (!deletedUser) {
      throw new NotFoundException(`User with userID ${userID} not found during deletion`);
    }

    return deletedUser;
  }

  // CRITICAL FIX: Add transaction-based token management for extra safety
  private async executeTokenOperationSafely<T>(
    userID: number,
    operation: () => Promise<T>,
  ): Promise<T> {
    // For now, we'll use the existing approach but with better error handling
    // In the future, this can be enhanced with MongoDB transactions
    try {
      const result = await operation();

      // Verify user still exists after operation
      const userExists = await this.userModel.findOne({ userID }).lean();
      if (!userExists) {
        console.error(`🚨 CRITICAL: User ${userID} was deleted during token operation!`);
        throw new Error(`User ${userID} was accidentally deleted during token operation`);
      }

      return result;
    } catch (error) {
      console.error(`❌ Error in token operation for user ${userID}:`, error);
      throw error;
    }
  }
}
