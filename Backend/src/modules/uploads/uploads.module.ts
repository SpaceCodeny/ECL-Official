import { Module } from "@nestjs/common";
import { MulterModule } from "@nestjs/platform-express";
import { UploadsController } from "./uploads.controller";
import { StorageService } from "./storage.service";

@Module({
  imports: [MulterModule.register({})],
  controllers: [UploadsController],
  providers: [StorageService],
  exports: [StorageService], // outros módulos podem injetar StorageService se precisar
})
export class UploadsModule {}
