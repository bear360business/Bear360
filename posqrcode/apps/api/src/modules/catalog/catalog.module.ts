import { Module } from '@nestjs/common'
import { TenantsModule } from '../tenants/tenants.module'
import { EmployeesController } from './employees.controller'
import { InventoryController } from './inventory.controller'
import { MenuController } from './menu.controller'
import { CatalogService } from './catalog.service'
import { TablesController } from './tables.controller'

@Module({
  imports: [TenantsModule],
  controllers: [MenuController, TablesController, EmployeesController, InventoryController],
  providers: [CatalogService],
})
export class CatalogModule {}
