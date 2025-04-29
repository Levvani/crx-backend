"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const bcrypt = require("bcrypt");
const user_schema_1 = require("./schemas/user.schema");
let UsersService = class UsersService {
    constructor(userModel) {
        this.userModel = userModel;
    }
    async create(createUserDto) {
        try {
            const existingUser = await this.userModel.findOne({
                $or: [
                    { username: createUserDto.username },
                    { email: createUserDto.email },
                ],
            });
            if (existingUser) {
                throw new common_1.ConflictException('Username or email already exists');
            }
            const salt = await bcrypt.genSalt();
            const hashedPassword = await bcrypt.hash(createUserDto.password, salt);
            const highestUser = await this.userModel
                .findOne()
                .sort({ userID: -1 })
                .exec();
            let nextUserID = 1;
            if (highestUser &&
                typeof highestUser.userID === 'number' &&
                !isNaN(highestUser.userID)) {
                nextUserID = highestUser.userID + 1;
            }
            if (createUserDto.userID !== undefined) {
                if (typeof createUserDto.userID !== 'number' ||
                    isNaN(createUserDto.userID)) {
                    throw new common_1.BadRequestException('userID must be a valid number');
                }
                nextUserID = createUserDto.userID;
            }
            const newUser = new this.userModel({
                userID: nextUserID,
                username: createUserDto.username,
                firstname: createUserDto.firstname,
                lastname: createUserDto.lastname,
                password: hashedPassword,
                email: createUserDto.email,
                role: createUserDto.role || user_schema_1.UserRole.DEALER,
                level: createUserDto.level || 'A',
                totalBalance: createUserDto.totalBalance || 0,
                profitBalance: createUserDto.profitBalance || 0,
                phoneNumber: createUserDto.phoneNumber || null,
            });
            console.log('Attempting to save user:', Object.assign(Object.assign({}, newUser.toObject()), { password: '[REDACTED]' }));
            return await newUser.save();
        }
        catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    }
    async findByUsername(username) {
        const user = await this.userModel.findOne({ username }).exec();
        if (!user) {
            throw new common_1.NotFoundException(`User with username ${username} not found`);
        }
        return user;
    }
    async findById(id) {
        const user = await this.userModel.findById(id).exec();
        if (!user) {
            throw new common_1.NotFoundException(`User with id ${id} not found`);
        }
        return user;
    }
    async findAll(paginationOptions = { page: 1, limit: 25 }) {
        const { page, limit, role, level, search } = paginationOptions;
        const skip = (page - 1) * limit;
        const filter = {};
        if (role !== undefined && role !== null) {
            console.log(`Adding role filter: ${role}`);
            filter.role = role;
        }
        if (level !== undefined && level !== null && level !== '') {
            console.log(`Adding level filter: ${level}`);
            filter.level = level;
        }
        if (search !== undefined && search !== null && search !== '') {
            console.log(`Adding search filter for: ${search}`);
            filter.$or = [
                { username: { $regex: search, $options: 'i' } },
                { firstname: { $regex: search, $options: 'i' } },
                { lastname: { $regex: search, $options: 'i' } },
            ];
        }
        console.log('MongoDB filter:', JSON.stringify(filter));
        if (Object.keys(filter).length === 0) {
            console.log('Warning: Filter is empty - will return all results');
        }
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
    async updateRole(id, role) {
        const user = await this.userModel
            .findByIdAndUpdate(id, { role }, { new: true })
            .exec();
        if (!user) {
            throw new common_1.NotFoundException(`User with id ${id} not found`);
        }
        return user;
    }
    async findByEmail(email) {
        const user = await this.userModel.findOne({ email }).exec();
        if (!user) {
            throw new common_1.NotFoundException(`User with email ${email} not found`);
        }
        return user;
    }
    async updatePassword(id, hashedPassword) {
        const user = await this.userModel
            .findByIdAndUpdate(id, { password: hashedPassword }, { new: true })
            .exec();
        if (!user) {
            throw new common_1.NotFoundException(`User with id ${id} not found`);
        }
        return user;
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], UsersService);
//# sourceMappingURL=users.service.js.map