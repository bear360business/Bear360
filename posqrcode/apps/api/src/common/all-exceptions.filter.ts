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
      response.status(status).json(typeof res === 'object' ? res : { message: res })
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

    const err = exception instanceof Error ? exception : new Error(String(exception))
    this.logger.error(`Unhandled Exception: ${err.message}`, err.stack)
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      code: 'INTERNAL_SERVER_ERROR',
      message: err.message || 'Internal server error',
    })
  }
}
