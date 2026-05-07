import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsGateway } from './notification.gateway';
import { Notification, NotificationType, Prisma } from '@prisma/client';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

interface CreateAndPushInput {
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  metaData?: Prisma.InputJsonValue;
}

@Injectable()
export class NotificationsService {
  constructor(
    private db: PrismaService,
    private notificationsGateway: NotificationsGateway,
  ) {}

  async createAndPush(input: CreateAndPushInput): Promise<Notification> {
    const notification = await this.db.notification.create({
      data: {
        userId: input.userId,
        title: input.title,
        body: input.body,
        type: input.type,
        ...(input.metaData !== undefined && { metaData: input.metaData }),
      },
    });

    this.notificationsGateway.pushToUser(input.userId, notification);

    return notification;
  }

  async getUserNotifications(
    userId: string,
    page = 1,
    limit = DEFAULT_LIMIT,
  ) {
    const safePage = page > 0 ? page : 1;
    const safeLimit = Math.min(Math.max(limit, 1), MAX_LIMIT);

    const where: Prisma.NotificationWhereInput = { userId };

    const [notifications, total, unreadCount] = await Promise.all([
      this.db.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
      }),
      this.db.notification.count({ where }),
      this.db.notification.count({ where: { userId, isRead: false } }),
    ]);

    return {
      data: {
        notifications,
        meta: {
          total,
          page: safePage,
          limit: safeLimit,
          unreadCount,
        },
      },
    };
  }

  async getUnreadCount(userId: string) {
    const count = await this.db.notification.count({
      where: { userId, isRead: false },
    });
    return { count };
  }

  async markAsRead(notificationId: string, userId: string) {
    const notification = await this.db.notification.findUnique({
      where: { id: notificationId },
    });
    if (!notification) {
      throw new NotFoundException(`Notification ${notificationId} not found`);
    }
    if (notification.userId !== userId) {
      throw new ForbiddenException('Cannot modify another user\'s notification');
    }
    if (notification.isRead) return notification;

    return this.db.notification.update({
      where: { id: notificationId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string) {
    const result = await this.db.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { count: result.count };
  }

  async deleteNotification(notificationId: string, userId: string) {
    const notification = await this.db.notification.findUnique({
      where: { id: notificationId },
      select: { userId: true },
    });
    if (!notification) {
      throw new NotFoundException(`Notification ${notificationId} not found`);
    }
    if (notification.userId !== userId) {
      throw new ForbiddenException('Cannot delete another user\'s notification');
    }

    await this.db.notification.delete({ where: { id: notificationId } });
  }
}
