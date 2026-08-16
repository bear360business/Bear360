// Ingredient stock for the Inventory module. Quantities are "as of now" —
// sales deduct from them automatically (v2 doc §8.4).

export type StockUnit = 'kg' | 'g' | 'L' | 'ml' | 'pc'
export type StockLevel = 'out' | 'low' | 'watch' | 'ok'

export interface Ingredient {
  id: string
  name: string
  category: string
  unit: StockUnit
  /** Current quantity on hand. */
  stock: number
  /** Reorder threshold — at or below this the item is "low". */
  reorder: number
  /** Purchase cost per unit in ₹. */
  costPerUnit: number
  supplier: string
  /** Average consumption per day, used for the days-left estimate. */
  dailyUse: number
}

export interface InventoryCategory {
  id: string
  name: string
  description?: string
}

/** Fixture categories (API mode uses venue bag). */
export const inventoryCategoryFixtures: InventoryCategory[] = [
  { id: 'cat-dairy', name: 'Dairy', description: 'Milk, paneer, cream, curd' },
  { id: 'cat-veg', name: 'Vegetables', description: 'Fresh produce from mandi' },
  { id: 'cat-grains', name: 'Grains', description: 'Rice, flour, pulses' },
  { id: 'cat-meat', name: 'Meat', description: 'Chicken, mutton, seafood' },
  { id: 'cat-spices', name: 'Spices', description: 'Whole and ground masalas' },
  { id: 'cat-oils', name: 'Oils', description: 'Cooking oils and ghee' },
  { id: 'cat-pack', name: 'Packaging', description: 'Takeaway and packaging supplies' },
]

/** Live categories — synced from venue bag / masters. */
export const inventoryCategories: InventoryCategory[] = []

/** Live name list for filters / selects. */
export function getCategoryNames(): string[] {
  return inventoryCategories.map((c) => c.name)
}

/** @deprecated Prefer getCategoryNames() — snapshot of seed names for static imports. */
export const ingredientCategories = inventoryCategories.map((c) => c.name)

export const ingredientFixtures: Ingredient[] = [
  { id: 'ing-01', name: 'Paneer', category: 'Dairy', unit: 'kg', stock: 0.4, reorder: 5, costPerUnit: 320, supplier: 'Amul Distributors', dailyUse: 6.2 },
  { id: 'ing-02', name: 'Butter', category: 'Dairy', unit: 'kg', stock: 1.2, reorder: 3, costPerUnit: 540, supplier: 'Amul Distributors', dailyUse: 1.4 },
  { id: 'ing-03', name: 'Fresh cream', category: 'Dairy', unit: 'L', stock: 2.5, reorder: 4, costPerUnit: 260, supplier: 'Amul Distributors', dailyUse: 1.1 },
  { id: 'ing-04', name: 'Curd', category: 'Dairy', unit: 'kg', stock: 8, reorder: 4, costPerUnit: 90, supplier: 'Amul Distributors', dailyUse: 2.2 },
  { id: 'ing-05', name: 'Basmati rice', category: 'Grains', unit: 'kg', stock: 24, reorder: 10, costPerUnit: 110, supplier: 'Kohinoor Foods', dailyUse: 4.8 },
  { id: 'ing-06', name: 'Wheat flour (atta)', category: 'Grains', unit: 'kg', stock: 31, reorder: 12, costPerUnit: 46, supplier: 'Kohinoor Foods', dailyUse: 5.5 },
  { id: 'ing-07', name: 'Maida', category: 'Grains', unit: 'kg', stock: 6.5, reorder: 8, costPerUnit: 42, supplier: 'Kohinoor Foods', dailyUse: 2.0 },
  { id: 'ing-08', name: 'Onion', category: 'Vegetables', unit: 'kg', stock: 42, reorder: 15, costPerUnit: 34, supplier: 'Dadar Mandi', dailyUse: 9.0 },
  { id: 'ing-09', name: 'Tomato', category: 'Vegetables', unit: 'kg', stock: 11, reorder: 12, costPerUnit: 38, supplier: 'Dadar Mandi', dailyUse: 7.5 },
  { id: 'ing-10', name: 'Ginger–garlic paste', category: 'Vegetables', unit: 'kg', stock: 3.2, reorder: 2, costPerUnit: 180, supplier: 'Dadar Mandi', dailyUse: 0.8 },
  { id: 'ing-11', name: 'Green chilli', category: 'Vegetables', unit: 'kg', stock: 0, reorder: 2, costPerUnit: 120, supplier: 'Dadar Mandi', dailyUse: 0.6 },
  { id: 'ing-12', name: 'Chicken (curry cut)', category: 'Meat', unit: 'kg', stock: 14, reorder: 8, costPerUnit: 240, supplier: 'Zorabian', dailyUse: 6.5 },
  { id: 'ing-13', name: 'Mutton', category: 'Meat', unit: 'kg', stock: 5.5, reorder: 5, costPerUnit: 780, supplier: 'Zorabian', dailyUse: 2.1 },
  { id: 'ing-14', name: 'Garam masala', category: 'Spices', unit: 'kg', stock: 2.8, reorder: 1, costPerUnit: 640, supplier: 'Everest Spices', dailyUse: 0.25 },
  { id: 'ing-15', name: 'Turmeric', category: 'Spices', unit: 'kg', stock: 1.9, reorder: 1, costPerUnit: 280, supplier: 'Everest Spices', dailyUse: 0.18 },
  { id: 'ing-16', name: 'Red chilli powder', category: 'Spices', unit: 'kg', stock: 1.1, reorder: 1.5, costPerUnit: 310, supplier: 'Everest Spices', dailyUse: 0.3 },
  { id: 'ing-17', name: 'Refined oil', category: 'Oils', unit: 'L', stock: 38, reorder: 20, costPerUnit: 145, supplier: 'Fortune Foods', dailyUse: 6.0 },
  { id: 'ing-18', name: 'Ghee', category: 'Oils', unit: 'kg', stock: 4.4, reorder: 4, costPerUnit: 690, supplier: 'Amul Distributors', dailyUse: 1.3 },
  { id: 'ing-19', name: 'Takeaway containers', category: 'Packaging', unit: 'pc', stock: 620, reorder: 300, costPerUnit: 8, supplier: 'PackMart', dailyUse: 95 },
  { id: 'ing-20', name: 'Paper bags', category: 'Packaging', unit: 'pc', stock: 180, reorder: 250, costPerUnit: 4, supplier: 'PackMart', dailyUse: 70 },
]

/** Live stock — synced by InventoryProvider from the API. */
export const ingredients: Ingredient[] = []

export const purchases: PurchaseEntry[] = []
export const recipeMap: Record<string, { ingredientId: string; qty: number }[]> = {}

/** 🔴 out · 🟠 low · 🟡 watch · 🟢 healthy (v2 doc §8.4). */
export function stockLevel(item: Ingredient): StockLevel {
  if (item.stock <= 0) return 'out'
  if (item.stock <= item.reorder) return 'low'
  if (item.stock <= item.reorder * 1.5) return 'watch'
  return 'ok'
}

/** Whole days of cover left at the current rate; null when nothing is used. */
export function daysOfCover(item: Ingredient): number | null {
  if (item.dailyUse <= 0) return null
  return Math.floor(item.stock / item.dailyUse)
}

export function stockValue(item: Ingredient): number {
  return item.stock * item.costPerUnit
}

export function computeStockValue(items: Ingredient[] = ingredients): number {
  return items.reduce((sum, i) => sum + stockValue(i), 0)
}

export function computeAlertCount(items: Ingredient[] = ingredients): number {
  return items.filter((i) => {
    const l = stockLevel(i)
    return l === 'low' || l === 'out'
  }).length
}

export function computeOutOfStock(items: Ingredient[] = ingredients): Ingredient[] {
  return items.filter((i) => stockLevel(i) === 'out')
}

export const totalStockValue = computeStockValue()
export const lowStockItems = ingredients.filter((i) => stockLevel(i) === 'low')
export const outOfStockItems = computeOutOfStock()
/** Items needing attention now — drives the dashboard badge. */
export const alertCount = computeAlertCount()
/** Wastage recorded this month, in ₹. Live value comes from InventoryProvider. */
export const wastageThisMonth = 0

export interface Supplier {
  id: string
  name: string
  phone: string
  email?: string
  city?: string
  contactPerson?: string
  gstin?: string
}

/** Fixture suppliers (API mode uses venue bag). */
export const supplierFixtures: Supplier[] = [
  {
    id: 'sup-amul',
    name: 'Amul Distributors',
    phone: '+91 98765 10001',
    email: 'orders@amuldist.in',
    city: 'Mumbai',
    contactPerson: 'Suresh Patel',
    gstin: '27AABCA1234A1Z5',
  },
  {
    id: 'sup-kohinoor',
    name: 'Kohinoor Foods',
    phone: '+91 98765 10002',
    email: 'sales@kohinoorfoods.in',
    city: 'Delhi',
    contactPerson: 'Anita Kapoor',
  },
  {
    id: 'sup-dadar',
    name: 'Dadar Mandi',
    phone: '+91 98765 10003',
    city: 'Mumbai',
    contactPerson: 'Raju Yadav',
  },
  {
    id: 'sup-zorabian',
    name: 'Zorabian',
    phone: '+91 98765 10004',
    email: 'b2b@zorabian.com',
    city: 'Pune',
    contactPerson: 'Farhan Shaikh',
    gstin: '27AABCZ9876B1Z2',
  },
  {
    id: 'sup-everest',
    name: 'Everest Spices',
    phone: '+91 98765 10005',
    email: 'trade@everestspices.com',
    city: 'Mumbai',
    contactPerson: 'Meena Shah',
  },
  {
    id: 'sup-fortune',
    name: 'Fortune Foods',
    phone: '+91 98765 10006',
    city: 'Ahmedabad',
    contactPerson: 'Vikram Desai',
  },
  {
    id: 'sup-packmart',
    name: 'PackMart',
    phone: '+91 98765 10007',
    email: 'hello@packmart.in',
    city: 'Thane',
    contactPerson: 'Priya Nair',
  },
]

export const suppliers: Supplier[] = []

export function getSupplierNames(): string[] {
  return suppliers.map((s) => s.name)
}

export function getSupplierByName(name: string): Supplier | undefined {
  return suppliers.find((s) => s.name === name)
}

export interface PurchaseLine {
  ingredientId: string
  qty: number
  unitCost: number
}

export interface PurchaseEntry {
  id: string
  supplier: string
  invoiceNo: string
  date: string // ISO date
  lines: PurchaseLine[]
  /** GST % applied on subtotal (e.g. 5 or 12). */
  gstPct: number
  note?: string
  createdAt: string
}

export function lineTotal(line: PurchaseLine): number {
  return Math.round(line.qty * line.unitCost * 100) / 100
}

export function purchaseSubtotal(entry: Pick<PurchaseEntry, 'lines'>): number {
  return entry.lines.reduce((sum, l) => sum + lineTotal(l), 0)
}

export function purchaseGst(entry: Pick<PurchaseEntry, 'lines' | 'gstPct'>): number {
  return Math.round(purchaseSubtotal(entry) * (entry.gstPct / 100) * 100) / 100
}

export function purchaseTotal(entry: Pick<PurchaseEntry, 'lines' | 'gstPct'>): number {
  return Math.round((purchaseSubtotal(entry) + purchaseGst(entry)) * 100) / 100
}

/** Seed purchase history (newest first). */
export const purchaseFixtures: PurchaseEntry[] = [
  {
    id: 'pur-01',
    supplier: 'Amul Distributors',
    invoiceNo: 'AMUL-4521',
    date: '2026-08-06',
    gstPct: 5,
    lines: [
      { ingredientId: 'ing-01', qty: 10, unitCost: 315 },
      { ingredientId: 'ing-02', qty: 5, unitCost: 535 },
      { ingredientId: 'ing-03', qty: 8, unitCost: 255 },
    ],
    createdAt: '2026-08-06T11:20:00',
  },
  {
    id: 'pur-02',
    supplier: 'Dadar Mandi',
    invoiceNo: 'DM-8891',
    date: '2026-08-05',
    gstPct: 0,
    lines: [
      { ingredientId: 'ing-08', qty: 40, unitCost: 32 },
      { ingredientId: 'ing-09', qty: 25, unitCost: 36 },
      { ingredientId: 'ing-11', qty: 3, unitCost: 115 },
    ],
    createdAt: '2026-08-05T08:45:00',
  },
  {
    id: 'pur-03',
    supplier: 'Zorabian',
    invoiceNo: 'ZOR-1102',
    date: '2026-08-04',
    gstPct: 5,
    lines: [
      { ingredientId: 'ing-12', qty: 20, unitCost: 235 },
      { ingredientId: 'ing-13', qty: 8, unitCost: 770 },
    ],
    createdAt: '2026-08-04T16:10:00',
  },
  {
    id: 'pur-04',
    supplier: 'Kohinoor Foods',
    invoiceNo: 'KOH-2208',
    date: '2026-08-02',
    gstPct: 5,
    lines: [
      { ingredientId: 'ing-05', qty: 50, unitCost: 108 },
      { ingredientId: 'ing-06', qty: 40, unitCost: 44 },
    ],
    createdAt: '2026-08-02T10:00:00',
  },
]

/**
 * Raise on-hand stock and refresh unit cost from the latest purchase line.
 * Mutates the shared ingredients fixture so Stock and Purchases stay in sync.
 */
export function applyPurchase(lines: PurchaseLine[], supplier?: string): Ingredient[] {
  for (const line of lines) {
    if (line.qty <= 0) continue
    const item = ingredients.find((i) => i.id === line.ingredientId)
    if (!item) continue
    const prevValue = item.stock * item.costPerUnit
    const nextStock = Math.round((item.stock + line.qty) * 1000) / 1000
    item.costPerUnit =
      nextStock > 0
        ? Math.round(((prevValue + line.qty * line.unitCost) / nextStock) * 100) / 100
        : line.unitCost
    item.stock = nextStock
    if (supplier) item.supplier = supplier
  }
  return ingredients.map((i) => ({ ...i }))
}

export function ingredientsForSupplier(supplier: string): Ingredient[] {
  return ingredients.filter((i) => i.supplier === supplier)
}

export function supplierItemCount(name: string): number {
  return ingredients.filter((i) => i.supplier === name).length
}

export function supplierSpendMtd(name: string): number {
  return purchases
    .filter((p) => p.supplier === name && p.date.startsWith('2026-08'))
    .reduce((sum, p) => sum + purchaseTotal(p), 0)
}

export function supplierLastOrder(name: string): string | undefined {
  return purchases.find((p) => p.supplier === name)?.date
}

export function categoryItemCount(name: string): number {
  return ingredients.filter((i) => i.category === name).length
}

/** Menu item → ingredient qty for auto stock deduction on completed/served orders. */
export const recipeMapFixtures: Record<string, { ingredientId: string; qty: number }[]> = {
  'butter-chicken': [
    { ingredientId: 'ing-12', qty: 0.18 },
    { ingredientId: 'ing-02', qty: 0.04 },
    { ingredientId: 'ing-03', qty: 0.05 },
  ],
  'paneer-tikka': [
    { ingredientId: 'ing-01', qty: 0.15 },
    { ingredientId: 'ing-17', qty: 0.02 },
  ],
  'paneer-butter-masala': [
    { ingredientId: 'ing-01', qty: 0.15 },
    { ingredientId: 'ing-02', qty: 0.03 },
    { ingredientId: 'ing-03', qty: 0.04 },
  ],
  'dal-makhani': [
    { ingredientId: 'ing-02', qty: 0.03 },
    { ingredientId: 'ing-18', qty: 0.015 },
  ],
  'chicken-biryani': [
    { ingredientId: 'ing-12', qty: 0.2 },
    { ingredientId: 'ing-05', qty: 0.18 },
  ],
  'butter-naan': [
    { ingredientId: 'ing-06', qty: 0.08 },
    { ingredientId: 'ing-02', qty: 0.015 },
  ],
  'masala-dosa': [
    { ingredientId: 'ing-08', qty: 0.05 },
    { ingredientId: 'ing-17', qty: 0.01 },
  ],
}
