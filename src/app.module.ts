// src/app.module.ts
import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { UsersModule } from "./users/users.module";
import { AuthModule } from "./auth/auth.module";
import { CarsModule } from "./cars/cars.module";
import { PasswordResetModule } from "./password-reset/password-reset.module";
import { FileUploadModule } from "./file-upload/file-upload.module";
import { CopartModule } from "./copart/copart.module";

@Module({
  imports: [
    ConfigModule.forRoot(),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>("MONGODB_URI"),
      }),
      inject: [ConfigService],
    }),
    UsersModule,
    AuthModule,
    CarsModule,
    PasswordResetModule,
    FileUploadModule,
    CopartModule,
  ],
})
export class AppModule {}
