import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import { Prisma } from '@prisma/client'
import type { Response } from 'express'
import { ZodError } from 'zod'

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name)

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()

    if (exception instanceof HttpException) {
      const status = exception.getStatus()
      const res = exception.getResponse()

      // NestJS wraps object payloads as { statusCode, message: <payload> }.
      // Normalise so the client always receives { code, message } with message as a string.
      if (typeof res === 'string') {
        response.status(status).json({ code: 'HTTP_ERROR', message: res })
        return
      }

      const payload = res as Record<string, unknown>
      // When thrown as new XxxException({ code, message }), NestJS nests it under `message`
      const inner =
        payload.message !== null &&
        typeof payload.message === 'object' &&
        !Array.isArray(payload.message)
          ? (payload.message as Record<string, unknown>)
          : null

      response.status(status).json({
        code: (inner?.code ?? payload.code ?? 'HTTP_ERROR') as string,
        message: (inner?.message ?? (typeof payload.message === 'string' ? payload.message : exception.message)) as string,
      })
      return
    }

    if (exception instanceof ZodError) {
      const first = exception.errors[0]
      const msg = first ? `${first.path.join('.') || 'field'}: ${first.message}` : 'Validation failed'
      this.logger.warn(`Validation error: ${msg}`)
      response.status(HttpStatus.BAD_REQUEST).json({
        code: 'VALIDATION_ERROR',
        message: msg,
        issues: exception.errors,
      })
      return
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        const target = (exception.meta?.target as string[])?.join(', ') || 'fields'
        this.logger.warn(`Unique constraint failed on ${target}`)
        response.status(HttpStatus.CONFLICT).json({
          code: 'CONFLICT',
          message: `A record with this ${target} already exists.`,
        })
        return
      }
      if (exception.code === 'P2025') {
        response.status(HttpStatus.NOT_FOUND).json({
          code: 'NOT_FOUND',
          message: 'Record not found.',
        })
        return
      }
    }

    // Razorpay SDK throws plain objects: { statusCode, error: { code, description, ... } }
    if (
      exception !== null &&
      typeof exception === 'object' &&
      !(exception instanceof Error) &&
      'statusCode' in (exception as object)
    ) {
      const rzpErr = exception as {
        statusCode?: number
        error?: { code?: string; description?: string; reason?: string }
      }
      const status = rzpErr.statusCode ?? HttpStatus.BAD_GATEWAY
      const desc =
        rzpErr.error?.description ??
        rzpErr.error?.reason ??
        'Razorpay request failed'
      const code = rzpErr.error?.code ?? 'RAZORPAY_ERROR'
      this.logger.error(`Razorpay error [${code}]: ${desc}`)
      response.status(status < 400 ? HttpStatus.BAD_GATEWAY : status).json({
        code,
        message: desc,
      })
      return
    }

    const err = exception instanceof Error ? exception : new Error(JSON.stringify(exception))
    this.logger.error(`Unhandled Exception: ${err.message}`, err.stack)
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      code: 'INTERNAL_SERVER_ERROR',
      message: err.message || 'Internal server error',
    })
  }
}
