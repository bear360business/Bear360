import { apiRequest } from '@/lib/api-client'
import type { Ingredient } from '@/lib/mock'
import type { Employee, MenuCategory, MenuItem, DiningTable } from '@/lib/types'

export function apiGetMenu(restaurantId: string) {
  return apiRequest<{ categories: MenuCategory[]; items: MenuItem[] }>(
    `/restaurants/${restaurantId}/menu`,
  )
}

export function apiUpsertCategory(restaurantId: string, category: MenuCategory) {
  return apiRequest(`/restaurants/${restaurantId}/menu/categories`, {
    body: category,
  })
}

export function apiRemoveCategory(restaurantId: string, id: string) {
  return apiRequest(`/restaurants/${restaurantId}/menu/categories/${id}`, {
    method: 'DELETE',
  })
}

export function apiUpsertMenuItem(restaurantId: string, item: MenuItem) {
  return apiRequest(`/restaurants/${restaurantId}/menu/items`, {
    body: {
      id: item.id,
      categoryId: item.categoryId || null,
      name: item.name,
      description: item.description,
      price: item.price,
      veg: item.veg,
      spicy: item.spicy,
      available: item.available,
      popular: item.popular,
      image: item.image,
    },
  })
}

export function apiRemoveMenuItem(restaurantId: string, id: string) {
  return apiRequest(`/restaurants/${restaurantId}/menu/items/${id}`, { method: 'DELETE' })
}

export function apiListTables(restaurantId: string) {
  return apiRequest<DiningTable[]>(`/restaurants/${restaurantId}/tables`)
}

export function apiUpsertTable(restaurantId: string, table: DiningTable) {
  return apiRequest(`/restaurants/${restaurantId}/tables`, { body: table })
}

export function apiRemoveTable(restaurantId: string, id: string) {
  return apiRequest(`/restaurants/${restaurantId}/tables/${id}`, { method: 'DELETE' })
}

export function apiListEmployees(restaurantId: string) {
  return apiRequest<Employee[]>(`/restaurants/${restaurantId}/employees`)
}

export function apiUpsertEmployee(
  restaurantId: string,
  employee: Employee & { pin?: string },
) {
  return apiRequest(`/restaurants/${restaurantId}/employees`, {
    body: {
      id: employee.id,
      name: employee.name,
      phone: employee.phone,
      email: employee.email,
      pin: employee.pin,
      roleId: employee.roleId,
      status: employee.status,
      hourlyRate: employee.hourlyRate,
      posAccess: employee.posAccess,
      posPermissions: employee.posPermissions,
      active: employee.status !== 'inactive',
    },
  })
}

export function apiRemoveEmployee(restaurantId: string, id: string) {
  return apiRequest(`/restaurants/${restaurantId}/employees/${id}`, { method: 'DELETE' })
}

export function apiListIngredients(restaurantId: string) {
  return apiRequest<Ingredient[]>(`/restaurants/${restaurantId}/inventory/ingredients`)
}

export function apiUpsertIngredient(restaurantId: string, item: Ingredient) {
  return apiRequest(`/restaurants/${restaurantId}/inventory/ingredients`, { body: item })
}

export function apiRemoveIngredient(restaurantId: string, id: string) {
  return apiRequest(`/restaurants/${restaurantId}/inventory/ingredients/${id}`, {
    method: 'DELETE',
  })
}

export function apiCreatePurchase(
  restaurantId: string,
  body: {
    supplier: string
    invoiceNo?: string
    date: string
    lines: { ingredientId: string; qty: number; unitCost: number }[]
    gstPct?: number
    note?: string
  },
) {
  return apiRequest(`/restaurants/${restaurantId}/inventory/purchases`, { body })
}

export function apiListPurchases(restaurantId: string) {
  return apiRequest<
    Array<{
      id: string
      supplier: string
      invoiceNo: string
      date: string
      lines: unknown
      gstPct: string | number
      note?: string | null
      createdAt: string
    }>
  >(`/restaurants/${restaurantId}/inventory/purchases`)
}

export function apiAdjustIngredientStock(restaurantId: string, id: string, stock: number) {
  return apiRequest(`/restaurants/${restaurantId}/inventory/ingredients/${id}/stock`, {
    body: { stock },
  })
}
