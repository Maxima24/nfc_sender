// npm install firebase-admin

// firebase.service.ts
import * as admin from 'firebase-admin';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from 'src/logger/logger.service';

@Injectable()
export class FirebaseService implements OnModuleInit {
  onModuleInit() {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FCM_PROJECT_ID,
          clientEmail: process.env.FCM_CLIENT_EMAIL,
          privateKey: process.env.FCM_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
    }
  }

  constructor(private readonly db:PrismaService, private logger:LoggerService){}

  async sendToDevice(token: string, title: string, body: string, data?: Record<string, any>) {
    try {
      const message: admin.messaging.Message = {
        token: token,
        notification: { title, body },
        data: data ? Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])) : undefined,
        android: { priority: 'high' },
        apns: { headers: { 'apns-priority': '10' } },
      };

      const response = await admin.messaging().send(message);
      return { success: true, messageId: response };
    } catch (error) {
      console.error('FCM send error:', error);
      // If token is invalid, mark as inactive
      if ((error as any).code === 'messaging/invalid-registration-token') {
        await this.db.device.updateMany({ where: { token }, data: { isActive: false } });
      }
      throw error;
    }
  }

  async sendToTopic(topic: string, title: string, body: string, data?: Record<string, any>) {
    const message: admin.messaging.Message = {
      topic: topic,
      notification: { title, body },
      data: data ? Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])) : undefined,
    };
    return await admin.messaging().send(message);
  }

  async sendToMultipleDevices(tokens: string[], title: string, body: string, data?: Record<string, any>) {
    const message: admin.messaging.MulticastMessage = {
      tokens: tokens,
      notification: { title, body },
      data: data ? Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])) : undefined,
    };
    const response = await admin.messaging().sendEachForMulticast(message);

    // Mark any invalid tokens as inactive
    const invalidTokens = response.responses
      .map((resp, idx) =>
        !resp.success &&
        resp.error?.code === 'messaging/invalid-registration-token'
          ? tokens[idx]
          : null,
      )
      .filter((t): t is string => t !== null);

    if (invalidTokens.length > 0) {
      await this.db.device.updateMany({
        where: { token: { in: invalidTokens } },
        data: { isActive: false },
      });
    }
    return response;
  }
}