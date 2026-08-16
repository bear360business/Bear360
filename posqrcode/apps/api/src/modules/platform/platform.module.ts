import { Module } from '@nestjs/common'
import { PlatformController } from './platform.controller'
import { PlatformService } from './platform.service'
import { StaffOpsController } from './staff-ops.controller'

@Module({
  controllers: [PlatformController, StaffOpsController],
  providers: [PlatformService],
  exports: [PlatformService],
})
export class PlatformModule {}
