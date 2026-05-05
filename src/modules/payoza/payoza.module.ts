import { Module } from '@nestjs/common';
import { PayozaService } from './payoza.service';
import { PayozaController } from './payoza.controller';
import { PrismaService } from '../prisma/prisma.service';
import { HttpModule } from '@nestjs/axios';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports:[HttpModule,NotificationModule],
  controllers: [PayozaController],
  providers: [PayozaService,PrismaService],
})
export class PayozaModule {}
