import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import * as argon2 from 'argon2'
import type {
  DiningTableInput,
  EmployeeUpsertInput,
  IngredientUpsertInput,
  MenuCategoryInput,
  MenuItemUpsertInput,
  PurchaseCreateInput,
} from '@bear360/shared'
import { PrismaService } from '../../prisma/prisma.service'
import { TenantsService } from '../tenants/tenants.service'
import type { JwtPayload } from '../auth/jwt-payload'

@Injectable()
export class CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenants: TenantsService,
  ) {}

  // ----- Menu -----
  async listMenu(user: JwtPayload, restaurantId: string) {
    this.tenants.assertAccess(user, restaurantId)
    const [categories, items] = await Promise.all([
      this.prisma.menuCategory.findMany({
        where: { restaurantId },
        orderBy: { sortOrder: 'asc' },
      }),
      this.prisma.menuItem.findMany({
        where: { restaurantId },
        orderBy: { name: 'asc' },
      }),
    ])
    return {
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        emoji: c.emoji,
        sortOrder: c.sortOrder,
      })),
      items: items.map((i) => ({
        id: i.id,
        categoryId: i.categoryId ?? '',
        name: i.name,
        description: i.description,
        price: Number(i.price),
        veg: i.veg,
        spicy: i.spicy,
        available: i.available,
        popular: i.popular,
        image: i.image,
      })),
    }
  }

  async upsertCategory(user: JwtPayload, restaurantId: string, input: MenuCategoryInput) {
    this.tenants.assertAccess(user, restaurantId)
    if (input.id) {
      return this.prisma.menuCategory.update({
        where: { id: input.id },
        data: {
          name: input.name,
          emoji: input.emoji ?? '🍽️',
          sortOrder: input.sortOrder ?? 0,
        },
      })
    }
    return this.prisma.menuCategory.create({
      data: {
        restaurantId,
        name: input.name,
        emoji: input.emoji ?? '🍽️',
        sortOrder: input.sortOrder ?? 0,
      },
    })
  }

  async removeCategory(user: JwtPayload, restaurantId: string, id: string) {
    this.tenants.assertAccess(user, restaurantId)
    const count = await this.prisma.menuItem.count({ where: { restaurantId, categoryId: id } })
    if (count > 0) {
      throw new BadRequestException({
        code: 'CATEGORY_IN_USE',
        message: `${count} menu items still use this category`,
      })
    }
    await this.prisma.menuCategory.deleteMany({ where: { id, restaurantId } })
    return { ok: true }
  }

  async upsertItem(user: JwtPayload, restaurantId: string, input: MenuItemUpsertInput) {
    this.tenants.assertAccess(user, restaurantId)
    const data = {
      name: input.name,
      description: input.description ?? '',
      price: input.price,
      veg: input.veg ?? true,
      spicy: input.spicy ?? false,
      available: input.available ?? true,
      popular: input.popular ?? false,
      image: input.image ?? '',
      categoryId: input.categoryId || null,
      active: input.available ?? true,
    }
    if (input.id) {
      return this.prisma.menuItem.update({ where: { id: input.id }, data })
    }
    return this.prisma.menuItem.create({ data: { restaurantId, ...data } })
  }

  async removeItem(user: JwtPayload, restaurantId: string, id: string) {
    this.tenants.assertAccess(user, restaurantId)
    await this.prisma.menuItem.deleteMany({ where: { id, restaurantId } })
    return { ok: true }
  }

  // ----- Tables -----
  async listTables(user: JwtPayload, restaurantId: string) {
    this.tenants.assertAccess(user, restaurantId)
    const rows = await this.prisma.diningTable.findMany({
      where: { restaurantId },
      orderBy: { number: 'asc' },
    })
    return rows.map((t) => ({
      id: t.id,
      name: t.name,
      number: t.number,
      seats: t.seats,
      status: t.status,
      zone: t.zone,
      activeOrderId: t.activeOrderId,
    }))
  }

  async upsertTable(user: JwtPayload, restaurantId: string, input: DiningTableInput) {
    this.tenants.assertAccess(user, restaurantId)
    const data = {
      name: input.name,
      number: input.number,
      seats: input.seats ?? 4,
      status: input.status ?? 'free',
      zone: input.zone ?? 'Main',
      activeOrderId: input.activeOrderId ?? null,
    }
    if (input.id) {
      return this.prisma.diningTable.update({ where: { id: input.id }, data })
    }
    return this.prisma.diningTable.create({ data: { restaurantId, ...data } })
  }

  async removeTable(user: JwtPayload, restaurantId: string, id: string) {
    this.tenants.assertAccess(user, restaurantId)
    await this.prisma.diningTable.deleteMany({ where: { id, restaurantId } })
    return { ok: true }
  }

  // ----- Staff -----
  async listEmployees(user: JwtPayload, restaurantId: string) {
    this.tenants.assertAccess(user, restaurantId)
    const rows = await this.prisma.employee.findMany({
      where: { restaurantId },
      orderBy: { name: 'asc' },
    })
    return rows.map((e) => this.toEmployeeDto(e))
  }

  async upsertEmployee(user: JwtPayload, restaurantId: string, input: EmployeeUpsertInput) {
    this.tenants.assertAccess(user, restaurantId)
    const phone = input.phone.replace(/\D/g, '')
    if (input.id) {
      const data: Record<string, unknown> = {
        name: input.name,
        phone,
        email: input.email ?? null,
        roleId: input.roleId ?? 'waiter',
        status: input.status ?? 'active',
        hourlyRate: input.hourlyRate ?? 0,
        posAccess: input.posAccess ?? true,
        posPermissions: input.posPermissions ?? {},
        active: input.active ?? input.status !== 'inactive',
      }
      if (input.pin) data.pinHash = await argon2.hash(input.pin)
      const updated = await this.prisma.employee.update({ where: { id: input.id }, data })
      return this.toEmployeeDto(updated)
    }
    if (!input.pin) {
      throw new BadRequestException({ code: 'PIN_REQUIRED', message: 'PIN required for new staff' })
    }
    const created = await this.prisma.employee.create({
      data: {
        restaurantId,
        name: input.name,
        phone,
        email: input.email ?? null,
        pinHash: await argon2.hash(input.pin),
        roleId: input.roleId ?? 'waiter',
        status: input.status ?? 'active',
        hourlyRate: input.hourlyRate ?? 0,
        posAccess: input.posAccess ?? true,
        posPermissions: input.posPermissions ?? {
          posTerminal: true,
          orders: true,
          menu: false,
          expenses: false,
        },
        active: true,
      },
    })
    return this.toEmployeeDto(created)
  }

  async removeEmployee(user: JwtPayload, restaurantId: string, id: string) {
    this.tenants.assertAccess(user, restaurantId)
    await this.prisma.employee.deleteMany({ where: { id, restaurantId } })
    return { ok: true }
  }

  // ----- Inventory -----
  async listIngredients(user: JwtPayload, restaurantId: string) {
    this.tenants.assertAccess(user, restaurantId)
    const rows = await this.prisma.ingredient.findMany({
      where: { restaurantId },
      orderBy: { name: 'asc' },
    })
    return rows.map((i) => ({
      id: i.id,
      name: i.name,
      category: i.category,
      unit: i.unit,
      stock: Number(i.stock),
      reorder: Number(i.reorder),
      costPerUnit: Number(i.costPerUnit),
      supplier: i.supplier,
      dailyUse: Number(i.dailyUse),
    }))
  }

  async upsertIngredient(user: JwtPayload, restaurantId: string, input: IngredientUpsertInput) {
    this.tenants.assertAccess(user, restaurantId)
    const data = {
      name: input.name,
      category: input.category ?? 'General',
      unit: input.unit ?? 'kg',
      stock: input.stock ?? 0,
      reorder: input.reorder ?? 0,
      costPerUnit: input.costPerUnit ?? 0,
      supplier: input.supplier ?? '',
      dailyUse: input.dailyUse ?? 0,
    }
    if (input.id) {
      return this.prisma.ingredient.update({ where: { id: input.id }, data })
    }
    return this.prisma.ingredient.create({ data: { restaurantId, ...data } })
  }

  async removeIngredient(user: JwtPayload, restaurantId: string, id: string) {
    this.tenants.assertAccess(user, restaurantId)
    await this.prisma.ingredient.deleteMany({ where: { id, restaurantId } })
    return { ok: true }
  }

  async listPurchases(user: JwtPayload, restaurantId: string) {
    this.tenants.assertAccess(user, restaurantId)
    return this.prisma.purchase.findMany({
      where: { restaurantId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
  }

  async createPurchase(user: JwtPayload, restaurantId: string, input: PurchaseCreateInput) {
    this.tenants.assertAccess(user, restaurantId)
    const purchase = await this.prisma.purchase.create({
      data: {
        restaurantId,
        supplier: input.supplier,
        invoiceNo: input.invoiceNo ?? '',
        date: input.date,
        lines: input.lines,
        gstPct: input.gstPct ?? 0,
        note: input.note,
      },
    })
    for (const line of input.lines) {
      await this.prisma.ingredient.updateMany({
        where: { id: line.ingredientId, restaurantId },
        data: { stock: { increment: line.qty } },
      })
    }
    return purchase
  }

  async adjustStock(user: JwtPayload, restaurantId: string, id: string, stock: number) {
    this.tenants.assertAccess(user, restaurantId)
    const row = await this.prisma.ingredient.updateMany({
      where: { id, restaurantId },
      data: { stock },
    })
    if (row.count === 0) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Ingredient not found' })
    }
    return this.prisma.ingredient.findFirst({ where: { id, restaurantId } })
  }

  private toEmployeeDto(e: {
    id: string
    name: string
    phone: string
    email: string | null
    roleId: string
    status: string
    hourlyRate: unknown
    posAccess: boolean
    posPermissions: unknown
    joinedAt: Date
    active: boolean
  }) {
    return {
      id: e.id,
      name: e.name,
      phone: e.phone,
      email: e.email,
      roleId: e.roleId,
      status: e.status,
      hourlyRate: Number(e.hourlyRate),
      posAccess: e.posAccess,
      posPermissions: e.posPermissions,
      joinedAt: e.joinedAt.toISOString().slice(0, 10),
      active: e.active,
    }
  }
}
