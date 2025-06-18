// src/titles/titles.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TitlesController } from './titles.controller';
import { TitlesService } from './titles.service';
import { Title, TitleSchema } from './schemas/title.schema';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [MongooseModule.forFeature([{ name: Title.name, schema: TitleSchema }]), AuthModule],
  controllers: [TitlesController],
  providers: [TitlesService],
  exports: [TitlesService],
})
export class TitlesModule {}
