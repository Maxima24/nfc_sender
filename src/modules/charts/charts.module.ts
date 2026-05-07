import { Module } from '@nestjs/common';
import { ChartsController } from './charts.controller';
import { ChartsService } from './charts.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [ChartsController],
  providers: [ChartsService, PrismaService],
})
export class ChartsModule {}
