import { Module } from '@nestjs/common';
import { PayozaService } from './payoza.service';
import { PayozaController } from './payoza.controller';
import { PrismaService } from '../prisma/prisma.service';
import { HttpModule } from '@nestjs/axios';
import { NotificationModule } from '../notification/notification.module';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [HttpModule, NotificationModule, WalletModule],
  controllers: [PayozaController],
  providers: [PayozaService, PrismaService],
})
export class PayozaModule {}
