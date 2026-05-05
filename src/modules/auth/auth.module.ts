import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaService } from '../prisma/prisma.service';
import { SquadcoService } from '../squadco/squadco.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService,PrismaService,SquadcoService],
})
export class AuthModule {}
