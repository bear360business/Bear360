# OrdersModule

Venue-scoped orders + public guest place/track.

- `GET|POST /api/v1/restaurants/:restaurantId/orders`
- `POST /api/v1/restaurants/:restaurantId/orders/:id/status`
- `POST /api/v1/public/r/:restaurantId/orders`

Emits Socket.IO events via `OrdersGateway` after writes.
