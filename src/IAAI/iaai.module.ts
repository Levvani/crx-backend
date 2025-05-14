import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { IaaIController } from "./iaai.controller";
import { IaaIService } from "./iaai.service";

@Module({
  imports: [HttpModule],
  controllers: [IaaIController],
  providers: [IaaIService],
  exports: [IaaIService],
})
export class IaaIModule {}
