import { Module } from '@nestjs/common'
import { TenantsModule } from '../tenants/tenants.module'
import { EntitlementsController } from './entitlements.controller'
import { EntitlementsService } from './entitlements.service'

@Module({
  imports: [TenantsModule],
  controllers: [EntitlementsController],
  providers: [EntitlementsService],
  exports: [EntitlementsService],
})
export class EntitlementsModule {}
