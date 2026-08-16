import { Global, Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { OrdersGateway } from './orders.gateway'

@Global()
@Module({
  imports: [AuthModule],
  providers: [OrdersGateway],
  exports: [OrdersGateway],
})
export class RealtimeModule {}

