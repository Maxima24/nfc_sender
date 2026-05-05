import { Module } from '@nestjs/common';
import { SquadcoService } from './squadco.service';
import{HttpModule} from "@nestjs/axios"
import { SquadcoController } from './squadco.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  imports:[HttpModule],
  controllers: [SquadcoController],
  providers: [SquadcoService,PrismaService],
  exports:[SquadcoService]
})
export class SquadcoModule {}
