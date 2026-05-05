// notifications.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsGateway } from './notification.gateway';
import { NotificationType, Prisma } from '@prisma/client';
import { ICreateNotificationDto } from './dto/create-notification.dto';

@Injectable()
export class NotificationsService {
  constructor(
    private db: PrismaService,
    private notificationsGateway: NotificationsGateway,
  ) {}

  async createNotification(userId:string,{
    type,
    title,
    message,
    metadata,
  }: ICreateNotificationDto) {
    // Save to database
    const notification = await this.db.notification.create({
      data: {
        userId,
        type,
        title,
        body: message,
        ...(metadata && {metaData:metadata as any}),
        isRead: false,
        createdAt: new Date(),
      },
    });

    // Send real-time via WebSocket
    this.notificationsGateway.sendNotificationToUser(userId, {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.body,
      metadata: notification.metaData,
      read: notification.isRead,
      createdAt: notification.createdAt,
    });

    return notification;
  }

  async getUserNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20,
    type?: string,
    unreadOnly?: boolean,
  ) {
    const where: any = { userId };

    if (type) where.type = type;
    if (unreadOnly) where.read = false;

    const [notifications, total] = await Promise.all([
      this.db.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.db.notification.count({ where }),
    ]);

    return {
      data: notifications,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUnreadCount(userId: string) {
    return this.db.notification.count({
      where: { userId, isRead: false },
    });
  }

  async markAsRead(notificationId: string, userId: string) {
    const notification = await this.db.notification.update({
      where: { id: notificationId, userId },
      data: { isRead: true, readAt: new Date() },
    });

    // Broadcast update to all user devices
    this.notificationsGateway.sendNotificationToUser(userId, {
      action: 'notification_read',
      notificationId: notification.id,
    });

    return notification;
  }

  async markAllAsRead(userId: string) {
    await this.db.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    // Broadcast to user
    this.notificationsGateway.sendNotificationToUser(userId, {
      action: 'all_notifications_read',
    });

    return { success: true };
  }

  async deleteNotification(notificationId: string, userId: string) {
    await this.db.notification.delete({
      where: { id: notificationId, userId },
    });
    return { success: true };
  }

  //   async getSettings(userId: string) {
  //     // Get or create user notification settings
  //     let settings = await this.db.notificationSettings.findUnique({
  //       where: { userId },
  //     });

  //     if (!settings) {
  //       settings = await this.db.notificationSettings.create({
  //         data: {
  //           userId,
  //           emailNotifications: true,
  //           pushNotifications: true,
  //           paymentAlerts: true,
  //           securityAlerts: true,
  //           promotionalEmails: false,
  //         },
  //       });
  //     }

  //     return settings;
  //   }
}
