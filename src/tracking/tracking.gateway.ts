import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

interface SocketData {
  userId?: string;
  accountType?: string;
  role?: string;
}

@WebSocketGateway({
  cors: {
    origin: [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
    ],
    credentials: true,
  },
  namespace: 'tracking',
})
export class TrackingGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(TrackingGateway.name);

  // Track connections: socketId → { userId, accountType, rooms }
  private connections = new Map<string, SocketData>();

  constructor(
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  // ══════════════════════════════════════════════════
  // CONNECTION
  // ══════════════════════════════════════════════════
  async handleConnection(client: Socket) {
    try {
      // Try to authenticate (optional — public tracking allowed)
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (token) {
        try {
          const payload: any = await this.jwt.verifyAsync(token, {
            secret: this.config.get('JWT_ACCESS_SECRET'),
          });
          this.connections.set(client.id, {
            userId: payload.sub,
            accountType: payload.accountType,
            role: payload.role,
          });
          client.data.user = payload;
          this.logger.log(
            `✅ Socket connected: ${client.id} (user: ${payload.sub}, type: ${payload.accountType})`,
          );
        } catch (err) {
          // Invalid token — treat as public
          this.connections.set(client.id, {});
          this.logger.warn(`⚠️  Socket connected (public): ${client.id}`);
        }
      } else {
        this.connections.set(client.id, {});
        this.logger.log(`🔓 Socket connected (public): ${client.id}`);
      }
    } catch (err) {
      this.logger.error(`Socket connection error: ${err.message}`);
    }
  }

  handleDisconnect(client: Socket) {
    this.connections.delete(client.id);
    this.logger.log(`❌ Socket disconnected: ${client.id}`);
  }

  // ══════════════════════════════════════════════════
  // JOIN ORDER ROOM
  // ══════════════════════════════════════════════════
  @SubscribeMessage('order:subscribe')
  async handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: string; trackingToken?: string },
  ) {
    if (!data?.orderId) {
      return { success: false, error: 'orderId required' };
    }

    const room = `order:${data.orderId}`;
    await client.join(room);

    this.logger.log(`📌 Socket ${client.id} subscribed to ${room}`);

    return {
      success: true,
      room,
      message: `Subscribed to order ${data.orderId}`,
    };
  }

  @SubscribeMessage('order:unsubscribe')
  async handleUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: string },
  ) {
    if (!data?.orderId) {
      return { success: false, error: 'orderId required' };
    }
    const room = `order:${data.orderId}`;
    await client.leave(room);
    return { success: true };
  }

  // ══════════════════════════════════════════════════
  // BROADCAST METHODS (called by services)
  // ══════════════════════════════════════════════════

  /**
   * Broadcast courier GPS update to everyone watching the order.
   */
  broadcastLocationUpdate(
    orderId: string,
    data: {
      lat: number;
      lng: number;
      courierId: string;
      courierName?: string;
      timestamp: string;
      distanceToReceiver?: number;
      etaMinutes?: number;
      status: string;
    },
  ) {
    const room = `order:${orderId}`;
    this.server.to(room).emit('location:update', {
      orderId,
      ...data,
    });
    this.logger.debug(`📍 Location update for ${room}`);
  }

  /**
   * Broadcast status change (picked up, in transit, delivered, etc.)
   */
  broadcastStatusChange(
    orderId: string,
    data: {
      status: string;
      note?: string;
      location?: string;
      lat?: number;
      lng?: number;
      timestamp: string;
    },
  ) {
    const room = `order:${orderId}`;
    this.server.to(room).emit('status:change', {
      orderId,
      ...data,
    });
    this.logger.log(`🔄 Status change for ${room}: ${data.status}`);
  }

  /**
   * Broadcast proximity alert (approaching receiver)
   */
  broadcastProximityAlert(
    orderId: string,
    data: {
      level: 'NEARBY' | 'CLOSE' | 'ARRIVING' | 'AT_DOOR';
      distanceMeters: number;
      message: string;
    },
  ) {
    const room = `order:${orderId}`;
    this.server.to(room).emit('proximity:alert', {
      orderId,
      ...data,
    });
    this.logger.log(`🔔 Proximity alert for ${room}: ${data.level}`);
  }

  /**
   * Broadcast a new order event (timeline).
   */
  broadcastEvent(
    orderId: string,
    event: {
      id: string;
      status: string;
      note?: string;
      location?: string;
      createdAt: string;
      actorName?: string;
    },
  ) {
    const room = `order:${orderId}`;
    this.server.to(room).emit('order:event', {
      orderId,
      event,
    });
  }

  /**
   * Broadcast order cancelled / failed.
   */
  broadcastOrderEnd(
    orderId: string,
    data: { outcome: 'DELIVERED' | 'CANCELLED' | 'FAILED' | 'RETURNED'; message?: string },
  ) {
    const room = `order:${orderId}`;
    this.server.to(room).emit('order:end', {
      orderId,
      ...data,
    });
  }
}
