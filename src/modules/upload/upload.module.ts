import { Module } from '@nestjs/common';
import { UploadService } from './upload.service';
import { UploadController } from './upload.controller';
import {memoryStorage} from "multer"
import {MulterModule} from "@nestjs/platform-express"
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from 'src/logger/logger.service';

@Module({
  imports:[MulterModule.register({storage:require('multer').memoryStorage()})],
  controllers: [UploadController],
  providers: [UploadService,PrismaService,LoggerService],
})
export class UploadModule {}
