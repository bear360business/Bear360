# Realtime (orders)

## Transport

- Socket.IO namespace: `/realtime`
- Auth: `handshake.auth.token` = access JWT (or `Authorization: Bearer`)
- Redis adapter planned for multi-instance (compose already includes Redis)

## Rooms

| Room | Who joins |
|------|-----------|
| `restaurant:{restaurantId}:orders` | Admin, kitchen, staff with POS/orders, optional guest tracking |

Client emits `orders.subscribe` with `{ restaurantId }`. Server checks tenant membership.

## Events (`@bear360/shared`)

| Event | Payload |
|-------|---------|
| `order.created` | `OrderDto` |
| `order.updated` | `OrderDto` |
| `order.status` | `OrderDto` |

## Guarantees

- Status transitions are validated server-side (`canTransitionOrder`) before emit
- Emit happens after successful DB write
- Clients should reconcile with REST list on reconnect
