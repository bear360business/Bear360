import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import * as argon2 from 'argon2'
import { createHash, randomBytes, randomInt } from 'node:crypto'
import type {
  AuthSessionResponse,
  LoginPasswordInput,
  LoginStaffPinInput,
  RegisterInput,
  RequestOtpInput,
  ResetPasswordInput,
  VerifyOtpInput,
} from '@bear360/shared'
import { PrismaService } from '../../prisma/prisma.service'
import { MailService } from '../mail/mail.service'
import type { JwtPayload } from './jwt-payload'

/** Demo OTP when SMTP is not configured (local/dev). */
const DEMO_OTP = '1234'

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
  ) {}

  async loginPassword(input: LoginPasswordInput): Promise<AuthSessionResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email.trim().toLowerCase() },
      include: { memberships: true },
    })
    if (!user) throw new UnauthorizedException({ code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' })

    const ok = await argon2.verify(user.passwordHash, input.password)
    if (!ok) throw new UnauthorizedException({ code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' })

    if (input.expectedRole && user.role !== input.expectedRole) {
      throw new ForbiddenException({
        code: 'ROLE_MISMATCH',
        message: `Expected ${input.expectedRole} login`,
      })
    }

    let restaurantIds = user.memberships.map((m) => m.restaurantId)
    if (restaurantIds.length === 0 && (user.role === 'restaurant' || user.role === 'kitchen')) {
      const all = await this.prisma.restaurant.findMany({ select: { id: true } })
      restaurantIds = all.map((r) => r.id)
    }
    return this.issueSession({
      sub: user.id,
      role: user.role,
      restaurantIds,
      email: user.email,
    })
  }

  async loginStaffPin(input: LoginStaffPinInput): Promise<AuthSessionResponse> {
    const phone = input.phone.replace(/\D/g, '')
    const employee = await this.prisma.employee.findFirst({
      where: {
        restaurantId: input.restaurantId,
        active: true,
        phone: { contains: phone.slice(-10) },
      },
    })
    if (!employee) {
      throw new UnauthorizedException({ code: 'INVALID_PIN', message: 'Invalid phone or PIN' })
    }
    const ok = await argon2.verify(employee.pinHash, input.pin)
    if (!ok) throw new UnauthorizedException({ code: 'INVALID_PIN', message: 'Invalid phone or PIN' })

    const perms = (employee.posPermissions ?? {}) as Partial<{
      posTerminal: boolean
      orders: boolean
      menu: boolean
      expenses: boolean
    }>

    return this.issueSession({
      sub: `staff:${employee.id}`,
      role: 'staff',
      restaurantIds: [employee.restaurantId],
      employeeId: employee.id,
      staffName: employee.name,
      email: null,
      posPermissions: {
        posTerminal: Boolean(perms.posTerminal),
        orders: Boolean(perms.orders),
        menu: Boolean(perms.menu),
        expenses: Boolean(perms.expenses),
      },
    })
  }

  async refresh(refreshToken: string): Promise<AuthSessionResponse> {
    const accessSecret = this.config.get<string>('JWT_ACCESS_SECRET') ?? 'dev'

    // 1. Staff session refresh support via staff JWT verification
    try {
      const decoded = this.jwt.verify<JwtPayload>(refreshToken, {
        secret: accessSecret,
        ignoreExpiration: true,
      })
      if (decoded && (decoded.role === 'staff' || decoded.sub.startsWith('staff:'))) {
        const empId = decoded.employeeId ?? decoded.sub.replace(/^staff:/, '')
        const emp = await this.prisma.employee.findUnique({ where: { id: empId } })
        if (!emp || emp.status === 'inactive' || emp.active === false) {
          throw new UnauthorizedException({ code: 'STAFF_INACTIVE', message: 'Staff member is inactive' })
        }
        const perms = (emp.posPermissions ?? {}) as Record<string, boolean>
        return this.issueSession({
          sub: `staff:${emp.id}`,
          role: 'staff',
          restaurantIds: [emp.restaurantId],
          employeeId: emp.id,
          staffName: emp.name,
          email: null,
          posPermissions: {
            posTerminal: Boolean(perms.posTerminal),
            orders: Boolean(perms.orders),
            menu: Boolean(perms.menu),
            expenses: Boolean(perms.expenses),
          },
        })
      }
    } catch {
      // Not a valid staff token, proceed to user refresh token check
    }

    // 2. User refresh token check
    const tokenHash = hashToken(refreshToken)
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: { include: { memberships: true } } },
    })
    if (!stored) {
      throw new UnauthorizedException({ code: 'INVALID_REFRESH', message: 'Refresh token invalid' })
    }
    if (stored.expiresAt < new Date()) {
      throw new UnauthorizedException({ code: 'EXPIRED_REFRESH', message: 'Refresh token expired' })
    }

    const user = stored.user
    let restaurantIds = user.memberships.map((m) => m.restaurantId)
    if (restaurantIds.length === 0 && (user.role === 'restaurant' || user.role === 'kitchen')) {
      const all = await this.prisma.restaurant.findMany({ select: { id: true } })
      restaurantIds = all.map((r) => r.id)
    }

    // 3. Grace period check: allow concurrent requests arriving within 30s of token rotation
    if (stored.revokedAt) {
      const gracePeriodMs = 30 * 1000
      if (Date.now() - stored.revokedAt.getTime() > gracePeriodMs) {
        throw new UnauthorizedException({ code: 'REVOKED_REFRESH', message: 'Refresh token revoked' })
      }
      return this.issueSession({
        sub: user.id,
        role: user.role,
        restaurantIds,
        email: user.email,
      })
    }

    // 4. Mark token as revoked and issue fresh session
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    })

    return this.issueSession({
      sub: user.id,
      role: user.role,
      restaurantIds,
      email: user.email,
    })
  }

  async logout(refreshToken: string): Promise<{ ok: true }> {
    const tokenHash = hashToken(refreshToken)
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    })
    return { ok: true }
  }

  async requestOtp(input: RequestOtpInput) {
    const email = input.email.trim().toLowerCase()
    if (input.purpose === 'signup') {
      const existing = await this.prisma.user.findUnique({ where: { email } })
      if (existing) {
        throw new ConflictException({ code: 'EMAIL_TAKEN', message: 'Email already registered' })
      }
    } else {
      const existing = await this.prisma.user.findUnique({ where: { email } })
      if (!existing) {
        // Avoid account enumeration — still return ok.
        return this.mail.isConfigured()
          ? { ok: true as const }
          : { ok: true as const, demoCode: DEMO_OTP }
      }
    }

    const useSmtp = this.mail.isConfigured()
    const code = useSmtp ? String(randomInt(1000, 10000)) : DEMO_OTP
    const codeHash = await argon2.hash(code)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)
    try {
      await this.prisma.otpChallenge.create({
        data: { email, purpose: input.purpose, codeHash, expiresAt },
      })
    } catch {
      await this.prisma.ensureSchema()
      await this.prisma.otpChallenge.create({
        data: { email, purpose: input.purpose, codeHash, expiresAt },
      })
    }

    if (useSmtp) {
      try {
        await this.mail.sendOtpEmail(email, code, input.purpose)
      } catch (err) {
        this.logger.error(`Failed to send OTP to ${email}`, err instanceof Error ? err.stack : err)
        throw new ServiceUnavailableException({
          code: 'MAIL_FAILED',
          message: 'Could not send verification email. Try again shortly.',
        })
      }
      return { ok: true as const }
    }

    return { ok: true as const, demoCode: DEMO_OTP }
  }

  async verifyOtp(input: VerifyOtpInput) {
    const email = input.email.trim().toLowerCase()
    const challenge = await this.prisma.otpChallenge.findFirst({
      where: {
        email,
        purpose: input.purpose,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    })
    if (!challenge) {
      throw new UnauthorizedException({ code: 'OTP_INVALID', message: 'OTP expired or invalid' })
    }
    const ok = await argon2.verify(challenge.codeHash, input.code)
    if (!ok) {
      throw new UnauthorizedException({ code: 'OTP_INVALID', message: 'Incorrect OTP' })
    }
    const verificationToken = randomBytes(32).toString('hex')
    await this.prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: { verifiedTokenHash: hashToken(verificationToken) },
    })
    return { ok: true as const, verificationToken }
  }

  async register(input: RegisterInput): Promise<AuthSessionResponse> {
    const email = input.email.trim().toLowerCase()
    await this.consumeVerification(email, 'signup', input.verificationToken)

    const existing = await this.prisma.user.findUnique({ where: { email } })
    if (existing) {
      throw new ConflictException({ code: 'EMAIL_TAKEN', message: 'Email already registered' })
    }

    const passwordHash = await argon2.hash(input.password)
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        role: 'restaurant',
      },
    })

    return this.issueSession({
      sub: user.id,
      role: user.role,
      restaurantIds: [],
      email: user.email,
    })
  }

  async resetPassword(input: ResetPasswordInput): Promise<{ ok: true }> {
    const email = input.email.trim().toLowerCase()
    await this.consumeVerification(email, 'forgot', input.verificationToken)
    const user = await this.prisma.user.findUnique({ where: { email } })
    if (!user) {
      throw new BadRequestException({ code: 'NOT_FOUND', message: 'Account not found' })
    }
    const passwordHash = await argon2.hash(input.password)
    await this.prisma.user.update({ where: { id: user.id }, data: { passwordHash } })
    await this.prisma.refreshToken.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    })
    return { ok: true }
  }

  private async consumeVerification(
    email: string,
    purpose: 'signup' | 'forgot',
    verificationToken: string,
  ) {
    const tokenHash = hashToken(verificationToken)
    const challenge = await this.prisma.otpChallenge.findFirst({
      where: {
        email,
        purpose,
        verifiedTokenHash: tokenHash,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    })
    if (!challenge) {
      throw new UnauthorizedException({
        code: 'VERIFY_REQUIRED',
        message: 'Verify OTP again before continuing',
      })
    }
    await this.prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: { consumedAt: new Date() },
    })
  }

  private async issueSession(
    payload: JwtPayload & {
      posPermissions?: {
        posTerminal: boolean
        orders: boolean
        menu: boolean
        expenses: boolean
      }
    },
  ): Promise<AuthSessionResponse> {
    const isStaff = payload.sub.startsWith('staff:') || payload.role === 'staff'
    const accessTtl = isStaff ? '24h' : (this.config.get<string>('JWT_ACCESS_TTL') ?? '4h')
    const refreshTtl = this.config.get<string>('JWT_REFRESH_TTL') ?? '30d'
    const accessSecret = this.config.get<string>('JWT_ACCESS_SECRET') ?? 'dev'

    const jwtBody: JwtPayload = {
      sub: payload.sub,
      role: payload.role,
      restaurantIds: payload.restaurantIds,
      employeeId: payload.employeeId,
      staffName: payload.staffName,
      email: payload.email,
    }

    const accessToken = await this.jwt.signAsync(jwtBody, {
      secret: accessSecret,
      expiresIn: accessTtl,
    })

    const refreshToken = randomBytes(48).toString('hex')
    const expiresAt = new Date(Date.now() + parseDurationMs(refreshTtl))

    // Staff sessions are not backed by User rows — skip refresh persistence.
    if (!payload.sub.startsWith('staff:')) {
      await this.prisma.refreshToken.create({
        data: {
          userId: payload.sub,
          tokenHash: hashToken(refreshToken),
          expiresAt,
        },
      })
    }

    return {
      user: {
        id: payload.sub,
        email: payload.email ?? null,
        role: payload.role,
        restaurantIds: payload.restaurantIds,
        employeeId: payload.employeeId,
        staffName: payload.staffName,
        posPermissions: payload.posPermissions,
      },
      tokens: {
        accessToken,
        refreshToken: payload.sub.startsWith('staff:') ? accessToken : refreshToken,
        expiresIn: Math.floor(parseDurationMs(accessTtl) / 1000),
      },
    }
  }
}

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

function parseDurationMs(input: string): number {
  const m = /^(\d+)([smhd])$/.exec(input)
  if (!m) return 15 * 60 * 1000
  const n = Number(m[1])
  const unit = m[2]
  if (unit === 's') return n * 1000
  if (unit === 'm') return n * 60 * 1000
  if (unit === 'h') return n * 60 * 60 * 1000
  return n * 24 * 60 * 60 * 1000
}
