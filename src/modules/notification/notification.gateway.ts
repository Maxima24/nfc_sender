// notifications.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
// import { WsJwtGuard } from '../auth/ws-jwt.guard';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'notifications',
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;
  constructor(private readonly jwtService: JwtService) {}

  private userSockets = new Map<string, string[]>(); // userId -> socketIds[]

  async handleConnection(client: Socket) {
    // Authenticate via JWT token from handshake
    const userId = this.getUserIdFromSocket(client);
    if (!userId) {
      client.disconnect();
      return;
    }

    // Store socket connection
    const userSockets = this.userSockets.get(userId) || [];
    userSockets.push(client.id);
    this.userSockets.set(userId, userSockets);

    // Join user-specific room for efficient broadcasting
    client.join(`user:${userId}`);

    console.log(`User ${userId} connected with socket ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    // Remove socket from tracking
    for (const [userId, sockets] of this.userSockets.entries()) {
      const index = sockets.indexOf(client.id);
      if (index !== -1) {
        sockets.splice(index, 1);
        if (sockets.length === 0) {
          this.userSockets.delete(userId);
        } else {
          this.userSockets.set(userId, sockets);
        }
        break;
      }
    }
  }

  // Send notification to specific user
  sendNotificationToUser(userId: string, notification: any) {
    this.server.to(`user:${userId}`).emit('new_notification', notification);
  }

  // Send to multiple users
  sendBulkNotification(userIds: string[], notification: any) {
    userIds.forEach((userId) => {
      this.server.to(`user:${userId}`).emit('new_notification', notification);
    });
  }

  // Mark notification as read (sync across devices)
  @SubscribeMessage('mark_read')
  async handleMarkRead(client: Socket, payload: { notificationId: string }) {
    const userId = this.getUserIdFromSocket(client);
    // Update database
    // Broadcast to user's other devices
    client.to(`user:${userId}`).emit('notification_read', {
      notificationId: payload.notificationId,
    });
  }

  private getUserIdFromSocket(client: Socket): string | null {
    try {
      const token = client.handshake.auth.token;
      // Verify JWT and extract userId
      const decoded = this.jwtService.verify(token);
      return decoded.sub;
    } catch (error) {
      return null;
    }
  }
}
