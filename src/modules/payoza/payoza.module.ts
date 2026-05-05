import { Module } from '@nestjs/common';
import { PayozaService } from './payoza.service';
import { PayozaController } from './payoza.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [PayozaController],
  providers: [PayozaService,PrismaService],
})
export class PayozaModule {}
