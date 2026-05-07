import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/notifications',
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private connectedUsers = new Map<string, Set<string>>();

  handleConnection(client: Socket) {
    const userId = this.authenticate(client);
    if (!userId) {
      client.disconnect();
      return;
    }

    (client.data as { userId?: string }).userId = userId;

    const sockets = this.connectedUsers.get(userId) ?? new Set<string>();
    sockets.add(client.id);
    this.connectedUsers.set(userId, sockets);

    client.join(`user:${userId}`);
  }

  handleDisconnect(client: Socket) {
    const userId = (client.data as { userId?: string }).userId;
    if (!userId) return;

    const sockets = this.connectedUsers.get(userId);
    if (!sockets) return;

    sockets.delete(client.id);
    if (sockets.size === 0) {
      this.connectedUsers.delete(userId);
    }
  }

  pushToUser(userId: string, notification: unknown) {
    if (!this.connectedUsers.has(userId)) return;
    this.server.to(`user:${userId}`).emit('notification', notification);
  }

  @SubscribeMessage('mark_read')
  handleMarkRead(client: Socket, payload: { notificationId: string }) {
    const userId = (client.data as { userId?: string }).userId;
    if (!userId) return;
    client.to(`user:${userId}`).emit('notification_read', {
      notificationId: payload.notificationId,
    });
  }

  private authenticate(client: Socket): string | null {
    const rawToken =
      (client.handshake.query?.token as string | undefined) ??
      (client.handshake.auth?.token as string | undefined) ??
      this.extractBearerHeader(client);
    if (!rawToken) return null;

    try {
      const decoded = this.jwtService.verify<{ id?: string; sub?: string }>(
        rawToken,
        { secret: this.configService.get<string>('JWT_SECRET') },
      );
      return decoded.id ?? decoded.sub ?? null;
    } catch {
      return null;
    }
  }

  private extractBearerHeader(client: Socket): string | undefined {
    const header = client.handshake.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) return undefined;
    return header.slice('Bearer '.length);
  }
}
