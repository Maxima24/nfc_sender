import { Module } from '@nestjs/common';
import { TransferService } from './transfer.service';
import { TransferController } from './transfer.controller';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationModule } from '../notification/notification.module';

import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [NotificationModule, WalletModule],
  controllers: [TransferController],
  providers: [TransferService, PrismaService],
})
export class TransferModule {}
