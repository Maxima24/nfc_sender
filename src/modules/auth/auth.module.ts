import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaService } from '../prisma/prisma.service';
import { SquadcoService } from '../squadco/squadco.service';
import { HttpModule } from '@nestjs/axios';
import { SquadcoModule } from '../squadco/squadco.module';

@Module({
  imports:[ HttpModule.register({
            timeout: 5000,
            maxRedirects: 5,
        }),SquadcoModule ],
  controllers: [AuthController],
  providers: [AuthService,PrismaService],
})
export class AuthModule {}
