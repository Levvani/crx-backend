import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CopartController } from './copart.controller';
import { CopartService } from './copart.service';

@Module({
  imports: [HttpModule],
  controllers: [CopartController],
  providers: [CopartService],
  exports: [CopartService],
})
export class CopartModule {}
