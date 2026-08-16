import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { PrismaService } from '../../prisma/prisma.service'
import type { JwtPayload } from './jwt-payload'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_ACCESS_SECRET') ?? 'dev',
    })
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    // Staff tokens are not User-backed — trust embedded restaurantIds.
    if (payload.sub.startsWith('staff:') || payload.role === 'staff') {
      return payload
    }
    if (payload.role === 'super') {
      return payload
    }
    const memberships = await this.prisma.userRestaurant.findMany({
      where: { userId: payload.sub },
      select: { restaurantId: true },
    })
    return {
      ...payload,
      restaurantIds: memberships.map((m) => m.restaurantId),
    }
  }
}
