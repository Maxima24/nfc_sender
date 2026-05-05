import { Module } from '@nestjs/common';
import { NotificationsService } from './notification.service';
import { NotificationsController  } from './notification.controller';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from 'src/logger/logger.service';
import { NotificationsGateway } from './notification.gateway';

@Module({
  controllers: [NotificationsController ],
  providers: [NotificationsService,PrismaService,LoggerService,NotificationsGateway],
})
export class NotificationModule {}
