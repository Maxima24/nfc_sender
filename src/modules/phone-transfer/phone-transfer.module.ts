import { Module } from '@nestjs/common';
import { PhoneTransferService } from './phone-transfer.service';
import { PhoneTransferController } from './phone-transfer.controller';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from 'src/logger/logger.service';

@Module({
  controllers: [PhoneTransferController],
  providers: [PhoneTransferService,PrismaService,LoggerService],
})
export class PhoneTransferModule {}
