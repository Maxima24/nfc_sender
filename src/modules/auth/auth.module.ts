import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaService } from '../prisma/prisma.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports:[ HttpModule.register({
            timeout: 5000,
            maxRedirects: 5,
        }) ],
  controllers: [AuthController],
  providers: [AuthService,PrismaService],
})
export class AuthModule {}
