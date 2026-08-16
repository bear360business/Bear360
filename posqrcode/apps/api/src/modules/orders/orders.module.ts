import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { TenantsModule } from '../tenants/tenants.module'
import { OrdersController } from './orders.controller'
import { PublicOrdersController } from './public-orders.controller'
import { OrdersService } from './orders.service'

@Module({
  imports: [TenantsModule, AuthModule],
  controllers: [OrdersController, PublicOrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
