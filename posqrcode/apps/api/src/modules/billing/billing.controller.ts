import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import type { PlanId } from '@prisma/client'
import type { Request } from 'express'
import { CurrentUser } from '../../common/current-user.decorator'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import type { JwtPayload } from '../auth/jwt-payload'
import { BillingService } from './billing.service'

@ApiTags('billing')
@Controller('billing')
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get('status/:restaurantId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  status(@CurrentUser() user: JwtPayload, @Param('restaurantId') restaurantId: string) {
    return this.billing.getStatus(user, restaurantId)
  }

  @Post('subscribe')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  subscribe(
    @CurrentUser() user: JwtPayload,
    @Body() body: { restaurantId?: string; planId?: PlanId },
  ) {
    if (!body.restaurantId || !body.planId) {
      throw new BadRequestException({ code: 'VALIDATION', message: 'restaurantId and planId required' })
    }
    return this.billing.startSubscription(user, {
      restaurantId: body.restaurantId,
      planId: body.planId,
    })
  }

  @Post('confirm')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  confirm(
    @CurrentUser() user: JwtPayload,
    @Body()
    body: { restaurantId?: string; subscriptionId?: string; paymentId?: string },
  ) {
    if (!body.restaurantId || !body.subscriptionId) {
      throw new BadRequestException({
        code: 'VALIDATION',
        message: 'restaurantId and subscriptionId required',
      })
    }
    return this.billing.confirmCheckout(user, {
      restaurantId: body.restaurantId,
      subscriptionId: body.subscriptionId,
      paymentId: body.paymentId,
    })
  }

  @Post('pay/create')
  createPay(
    @Body()
    body: { restaurantId?: string; orderId?: string; amountPaise?: number },
  ) {
    if (!body.restaurantId || !body.orderId || body.amountPaise == null) {
      throw new BadRequestException({
        code: 'VALIDATION',
        message: 'restaurantId, orderId, amountPaise required',
      })
    }
    return this.billing.createPaymentOrder({
      restaurantId: body.restaurantId,
      orderId: body.orderId,
      amountPaise: body.amountPaise,
    })
  }

  @Post('pay/confirm')
  confirmPay(
    @Body()
    body: {
      restaurantId?: string
      orderId?: string
      razorpayOrderId?: string
      razorpayPaymentId?: string
      razorpaySignature?: string
      demo?: boolean
    },
  ) {
    if (!body.restaurantId || !body.orderId) {
      throw new BadRequestException({
        code: 'VALIDATION',
        message: 'restaurantId and orderId required',
      })
    }
    return this.billing.markOrderPaid({
      restaurantId: body.restaurantId,
      orderId: body.orderId,
      razorpayOrderId: body.razorpayOrderId,
      razorpayPaymentId: body.razorpayPaymentId,
      razorpaySignature: body.razorpaySignature,
      demo: body.demo,
    })
  }

  /** Razorpay webhook — set RAZORPAY_WEBHOOK_SECRET; enable subscription events. */
  @Post('webhooks/razorpay')
  webhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('x-razorpay-signature') signature: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    const raw =
      req.rawBody ??
      Buffer.from(typeof body === 'string' ? body : JSON.stringify(body))
    if (!this.billing.verifyWebhookSignature(raw, signature)) {
      throw new BadRequestException({ code: 'INVALID_SIGNATURE', message: 'Bad webhook signature' })
    }
    const event = String(body.event ?? '')
    return this.billing.handleWebhook(event, body)
  }
}
