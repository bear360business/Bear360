import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    try {
      await this.$connect()
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Database connection error on init (will retry on queries):', err)
    }
  }

  async onModuleDestroy() {
    await this.$disconnect()
  }
}
