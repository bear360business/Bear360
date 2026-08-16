import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AuthModule } from './modules/auth/auth.module'
import { BillingModule } from './modules/billing/billing.module'
import { CatalogModule } from './modules/catalog/catalog.module'
import { EntitlementsModule } from './modules/entitlements/entitlements.module'
import { HealthModule } from './modules/health/health.module'
import { MailModule } from './modules/mail/mail.module'
import { OrdersModule } from './modules/orders/orders.module'
import { PlatformModule } from './modules/platform/platform.module'
import { RealtimeModule } from './modules/realtime/realtime.module'
import { TenantsModule } from './modules/tenants/tenants.module'
import { PrismaModule } from './prisma/prisma.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    MailModule,
    HealthModule,
    AuthModule,
    BillingModule,
    TenantsModule,
    EntitlementsModule,
    OrdersModule,
    CatalogModule,
    PlatformModule,
    RealtimeModule,
  ],
})
export class AppModule {}
