import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { Server, Socket } from 'socket.io'
import {
  REALTIME_EVENTS,
  restaurantOrderRoom,
  restaurantOrdersRoom,
  type OrderDto,
} from '@bear360/shared'
import type { JwtPayload } from '../auth/jwt-payload'

@WebSocketGateway({
  cors: { origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173', credentials: true },
  namespace: '/realtime',
})
export class OrdersGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string | undefined) ??
        (client.handshake.headers.authorization?.replace(/^Bearer\s+/i, '') as string | undefined)
      if (!token) {
        // Guests may connect without JWT and use orders.subscribeGuest.
        client.data.user = null
        return
      }
      const payload = await this.jwt.verifyAsync<JwtPayload>(token, {
        secret: this.config.get<string>('JWT_ACCESS_SECRET') ?? 'dev',
      })
      client.data.user = payload
    } catch {
      client.data.user = null
    }
  }

  @SubscribeMessage('orders.subscribe')
  subscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { restaurantId: string },
  ) {
    const user = client.data.user as JwtPayload | null | undefined
    if (!user) return { ok: false }
    if (user.role !== 'super' && !user.restaurantIds.includes(body.restaurantId)) {
      return { ok: false, error: 'TENANT_FORBIDDEN' }
    }
    void client.join(restaurantOrdersRoom(body.restaurantId))
    return { ok: true, room: restaurantOrdersRoom(body.restaurantId) }
  }

  /** Public guest tracker — scoped to a single order id (no JWT). */
  @SubscribeMessage('orders.subscribeGuest')
  subscribeGuest(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { restaurantId: string; orderId: string },
  ) {
    const restaurantId = String(body?.restaurantId ?? '').trim()
    const orderId = String(body?.orderId ?? '').trim()
    if (!restaurantId || !orderId) return { ok: false, error: 'INVALID' }
    const room = restaurantOrderRoom(restaurantId, orderId)
    void client.join(room)
    return { ok: true, room }
  }

  emitOrderCreated(restaurantId: string, order: OrderDto) {
    this.server.to(restaurantOrdersRoom(restaurantId)).emit(REALTIME_EVENTS.ORDER_CREATED, order)
    this.server
      .to(restaurantOrderRoom(restaurantId, order.id))
      .emit(REALTIME_EVENTS.ORDER_CREATED, order)
  }

  emitOrderUpdated(restaurantId: string, order: OrderDto) {
    this.server.to(restaurantOrdersRoom(restaurantId)).emit(REALTIME_EVENTS.ORDER_UPDATED, order)
    this.server
      .to(restaurantOrderRoom(restaurantId, order.id))
      .emit(REALTIME_EVENTS.ORDER_UPDATED, order)
  }

  emitOrderStatus(restaurantId: string, order: OrderDto) {
    this.server.to(restaurantOrdersRoom(restaurantId)).emit(REALTIME_EVENTS.ORDER_STATUS, order)
    this.server
      .to(restaurantOrderRoom(restaurantId, order.id))
      .emit(REALTIME_EVENTS.ORDER_STATUS, order)
  }
}
