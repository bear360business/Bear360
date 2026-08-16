import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { AuthRole } from '@bear360/shared'
import { ROLES_KEY } from './roles.decorator'
import type { JwtPayload } from './jwt-payload'

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<AuthRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (!roles?.length) return true
    const req = context.switchToHttp().getRequest<{ user: JwtPayload }>()
    return roles.includes(req.user?.role)
  }
}
