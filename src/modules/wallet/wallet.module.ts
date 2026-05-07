import { Module } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { PrismaService } from '../prisma/prisma.service';
import { LedgerService } from './ledger.service';

@Module({
  controllers: [WalletController],
  providers: [WalletService, PrismaService, LedgerService],
  exports: [LedgerService],
})
export class WalletModule {}
