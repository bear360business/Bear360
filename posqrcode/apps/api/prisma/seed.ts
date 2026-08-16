import { PrismaClient } from '@prisma/client'
import * as argon2 from 'argon2'

const prisma = new PrismaClient()

/** Matches web UI demo password across portals. */
const DEMO_PASSWORD = 'demo1234'
const DEMO_PIN = '1234'

async function upsertUser(input: {
  email: string
  role: 'super' | 'restaurant' | 'kitchen'
  organizationId?: string
  restaurantId?: string
  passwordHash: string
}) {
  const user = await prisma.user.upsert({
    where: { email: input.email },
    update: { passwordHash: input.passwordHash, role: input.role },
    create: {
      email: input.email,
      passwordHash: input.passwordHash,
      role: input.role,
      organizationId: input.organizationId,
    },
  })
  if (input.restaurantId) {
    await prisma.userRestaurant.upsert({
      where: {
        userId_restaurantId: { userId: user.id, restaurantId: input.restaurantId },
      },
      update: {},
      create: { userId: user.id, restaurantId: input.restaurantId },
    })
  }
  return user
}

async function main() {
  const passwordHash = await argon2.hash(DEMO_PASSWORD)
  const pinHash = await argon2.hash(DEMO_PIN)

  await prisma.platformConfig.upsert({
    where: { id: 'default' },
    update: {},
    create: { id: 'default', flags: {} },
  })

  const org = await prisma.organization.upsert({
    where: { id: 'org_masala' },
    update: {},
    create: { id: 'org_masala', name: 'Masala Bear Group' },
  })

  const restaurant = await prisma.restaurant.upsert({
    where: { slug: 'masala-bear' },
    update: {},
    create: {
      id: 'masala-bear',
      organizationId: org.id,
      slug: 'masala-bear',
      name: 'Masala Bear',
      phone: '+91 98765 43210',
      address: '12, Besant Nagar',
      city: 'Chennai',
      planId: 'professional',
      industryId: 'restaurants',
      status: 'active',
    },
  })

  // UI + docs demo owners (same venue).
  await upsertUser({
    email: 'riya@masalabear.in',
    role: 'restaurant',
    organizationId: org.id,
    restaurantId: restaurant.id,
    passwordHash,
  })
  await upsertUser({
    email: 'owner@masala-bear.com',
    role: 'restaurant',
    organizationId: org.id,
    restaurantId: restaurant.id,
    passwordHash,
  })
  await upsertUser({
    email: 'kitchen@masalabear.in',
    role: 'kitchen',
    organizationId: org.id,
    restaurantId: restaurant.id,
    passwordHash,
  })
  await upsertUser({
    email: 'kitchen@masala-bear.com',
    role: 'kitchen',
    organizationId: org.id,
    restaurantId: restaurant.id,
    passwordHash,
  })
  await upsertUser({
    email: 'anya@bear360.app',
    role: 'super',
    passwordHash,
  })

  // Portal staff demo phones (last-10 match).
  for (const phone of ['9876541002', '9876543210']) {
    await prisma.employee.upsert({
      where: { restaurantId_phone: { restaurantId: restaurant.id, phone } },
      update: {
        pinHash,
        posPermissions: {
          posTerminal: true,
          orders: true,
          menu: false,
          expenses: false,
        },
      },
      create: {
        restaurantId: restaurant.id,
        name: phone === '9876541002' ? 'Priya Cashier' : 'Demo Cashier',
        phone,
        pinHash,
        roleId: 'cashier',
        posPermissions: {
          posTerminal: true,
          orders: true,
          menu: false,
          expenses: false,
        },
      },
    })
  }

  // Demo menu with stable ids (recipe mapper + guest menu).
  const mains = await prisma.menuCategory.upsert({
    where: { id: 'cat-mains-masala' },
    update: { name: 'Mains', restaurantId: restaurant.id },
    create: {
      id: 'cat-mains-masala',
      restaurantId: restaurant.id,
      name: 'Mains',
      emoji: '🍽️',
      sortOrder: 0,
    },
  })
  for (const item of [
    {
      id: 'mi-butter-chicken',
      name: 'Butter Chicken',
      price: 320,
      veg: false,
    },
    {
      id: 'mi-masala-dosa',
      name: 'Masala Dosa',
      price: 120,
      veg: true,
    },
    {
      id: 'mi-filter-coffee',
      name: 'Filter Coffee',
      price: 60,
      veg: true,
    },
  ] as const) {
    await prisma.menuItem.upsert({
      where: { id: item.id },
      update: {
        name: item.name,
        price: item.price,
        veg: item.veg,
        categoryId: mains.id,
        restaurantId: restaurant.id,
        available: true,
        active: true,
      },
      create: {
        id: item.id,
        restaurantId: restaurant.id,
        categoryId: mains.id,
        name: item.name,
        price: item.price,
        veg: item.veg,
      },
    })
  }

  // Guest table QR demos — stable ids used in marketing links.
  const demoTables = [
    { id: 't-01', name: 'T1', number: 1, seats: 2, zone: 'Main hall' },
    { id: 't-02', name: 'T2', number: 2, seats: 4, zone: 'Main hall' },
    { id: 't-03', name: 'T3', number: 3, seats: 4, zone: 'Main hall' },
    { id: 't-04', name: 'T4', number: 4, seats: 4, zone: 'Patio' },
    { id: 't-05', name: 'T5', number: 5, seats: 6, zone: 'Patio' },
  ] as const
  for (const t of demoTables) {
    await prisma.diningTable.upsert({
      where: { restaurantId_number: { restaurantId: restaurant.id, number: t.number } },
      update: { name: t.name, seats: t.seats, zone: t.zone },
      create: {
        id: t.id,
        restaurantId: restaurant.id,
        name: t.name,
        number: t.number,
        seats: t.seats,
        zone: t.zone,
        status: 'free',
      },
    })
  }

  const ingCount = await prisma.ingredient.count({ where: { restaurantId: restaurant.id } })
  if (ingCount === 0) {
    await prisma.ingredient.createMany({
      data: [
        {
          id: 'ing-01',
          restaurantId: restaurant.id,
          name: 'Paneer',
          category: 'Dairy',
          unit: 'kg',
          stock: 8,
          reorder: 5,
          costPerUnit: 320,
          supplier: 'Amul Distributors',
          dailyUse: 2,
        },
        {
          id: 'ing-02',
          restaurantId: restaurant.id,
          name: 'Butter',
          category: 'Dairy',
          unit: 'kg',
          stock: 4,
          reorder: 3,
          costPerUnit: 540,
          supplier: 'Amul Distributors',
          dailyUse: 1,
        },
        {
          id: 'ing-03',
          restaurantId: restaurant.id,
          name: 'Fresh cream',
          category: 'Dairy',
          unit: 'L',
          stock: 5,
          reorder: 4,
          costPerUnit: 260,
          supplier: 'Amul Distributors',
          dailyUse: 1,
        },
        {
          id: 'ing-05',
          restaurantId: restaurant.id,
          name: 'Basmati rice',
          category: 'Grains',
          unit: 'kg',
          stock: 24,
          reorder: 10,
          costPerUnit: 110,
          supplier: 'Kohinoor Foods',
          dailyUse: 4,
        },
        {
          id: 'ing-08',
          restaurantId: restaurant.id,
          name: 'Onion',
          category: 'Vegetables',
          unit: 'kg',
          stock: 20,
          reorder: 15,
          costPerUnit: 34,
          supplier: 'Dadar Mandi',
          dailyUse: 5,
        },
        {
          id: 'ing-09',
          restaurantId: restaurant.id,
          name: 'Tomato',
          category: 'Vegetables',
          unit: 'kg',
          stock: 15,
          reorder: 12,
          costPerUnit: 38,
          supplier: 'Dadar Mandi',
          dailyUse: 4,
        },
        {
          id: 'ing-12',
          restaurantId: restaurant.id,
          name: 'Chicken (curry cut)',
          category: 'Meat',
          unit: 'kg',
          stock: 14,
          reorder: 8,
          costPerUnit: 240,
          supplier: 'Zorabian',
          dailyUse: 4,
        },
        {
          id: 'ing-17',
          restaurantId: restaurant.id,
          name: 'Refined oil',
          category: 'Oils',
          unit: 'L',
          stock: 20,
          reorder: 10,
          costPerUnit: 145,
          supplier: 'Fortune Foods',
          dailyUse: 3,
        },
        {
          id: 'ing-19',
          restaurantId: restaurant.id,
          name: 'Takeaway containers',
          category: 'Packaging',
          unit: 'pc',
          stock: 400,
          reorder: 200,
          costPerUnit: 8,
          supplier: 'PackMart',
          dailyUse: 40,
        },
        {
          id: 'ing-20',
          restaurantId: restaurant.id,
          name: 'Coffee powder',
          category: 'Spices',
          unit: 'kg',
          stock: 3,
          reorder: 1,
          costPerUnit: 480,
          supplier: 'Everest Spices',
          dailyUse: 0.3,
        },
      ],
    })
  }

  // Categories + suppliers + sample recipes live in venue JSON bags.
  const prevSettings = (restaurant.settings ?? {}) as Record<string, unknown>
  const prevData = (prevSettings.data ?? {}) as Record<string, unknown>
  const inventoryCategories = [
    { id: 'cat-dairy', name: 'Dairy', description: 'Milk, paneer, cream, curd' },
    { id: 'cat-veg', name: 'Vegetables', description: 'Fresh produce' },
    { id: 'cat-grains', name: 'Grains', description: 'Rice, flour, pulses' },
    { id: 'cat-meat', name: 'Meat', description: 'Chicken, mutton, seafood' },
    { id: 'cat-spices', name: 'Spices', description: 'Masalas and coffee' },
    { id: 'cat-oils', name: 'Oils', description: 'Cooking oils and ghee' },
    { id: 'cat-pack', name: 'Packaging', description: 'Takeaway supplies' },
  ]
  const suppliers = [
    {
      id: 'sup-amul',
      name: 'Amul Distributors',
      phone: '+91 98765 10001',
      email: 'orders@amuldist.in',
      city: 'Chennai',
      contactPerson: 'Suresh Patel',
    },
    {
      id: 'sup-kohinoor',
      name: 'Kohinoor Foods',
      phone: '+91 98765 10002',
      city: 'Chennai',
      contactPerson: 'Anita Kapoor',
    },
    {
      id: 'sup-dadar',
      name: 'Dadar Mandi',
      phone: '+91 98765 10003',
      city: 'Chennai',
      contactPerson: 'Raju Yadav',
    },
    {
      id: 'sup-zorabian',
      name: 'Zorabian',
      phone: '+91 98765 10004',
      city: 'Chennai',
      contactPerson: 'Imran Shaikh',
    },
    {
      id: 'sup-fortune',
      name: 'Fortune Foods',
      phone: '+91 98765 10005',
      city: 'Chennai',
    },
    {
      id: 'sup-pack',
      name: 'PackMart',
      phone: '+91 98765 10006',
      city: 'Chennai',
    },
    {
      id: 'sup-everest',
      name: 'Everest Spices',
      phone: '+91 98765 10007',
      city: 'Chennai',
    },
  ]
  const recipes: Record<string, { ingredientId: string; qty: number }[]> = {
    'mi-butter-chicken': [
      { ingredientId: 'ing-12', qty: 0.18 },
      { ingredientId: 'ing-02', qty: 0.04 },
      { ingredientId: 'ing-03', qty: 0.05 },
    ],
    'mi-masala-dosa': [
      { ingredientId: 'ing-05', qty: 0.08 },
      { ingredientId: 'ing-08', qty: 0.03 },
      { ingredientId: 'ing-17', qty: 0.01 },
    ],
    'mi-filter-coffee': [{ ingredientId: 'ing-20', qty: 0.015 }],
  }

  const prevCats = prevData.inventoryCategories
  const prevSuppliers = prevData.suppliers
  const prevInventory = (prevData.inventory as Record<string, unknown> | undefined) ?? {}
  const prevRecipes = prevInventory.recipes as Record<string, unknown> | undefined

  await prisma.restaurant.update({
    where: { id: restaurant.id },
    data: {
      settings: {
        ...prevSettings,
        data: {
          ...prevData,
          inventoryCategories:
            Array.isArray(prevCats) && prevCats.length > 0 ? prevCats : inventoryCategories,
          suppliers:
            Array.isArray(prevSuppliers) && prevSuppliers.length > 0
              ? prevSuppliers
              : suppliers,
          inventory: {
            ...prevInventory,
            recipes:
              prevRecipes && Object.keys(prevRecipes).length > 0 ? prevRecipes : recipes,
          },
        },
      },
    },
  })

  // eslint-disable-next-line no-console
  console.log('Seeded Bear 360 demo data')
  // eslint-disable-next-line no-console
  console.log(`  riya@masalabear.in / ${DEMO_PASSWORD}`)
  // eslint-disable-next-line no-console
  console.log(`  anya@bear360.app / ${DEMO_PASSWORD}`)
  // eslint-disable-next-line no-console
  console.log(`  staff 98765 41002 / PIN ${DEMO_PIN}`)
  // eslint-disable-next-line no-console
  console.log('  guest table QR: /r/masala-bear/table/t-04')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
