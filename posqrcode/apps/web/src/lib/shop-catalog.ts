/** Platform shop catalog — Super Admin manages; restaurant Shop browses. */

export const SHOP_STORAGE_KEY = 'bearqr:shop-catalog'
export const SHOP_EVENT = 'bearqr:shop-changed'

export type ShopCategory = 'qr-stand' | 'printer' | 'accessory'

export type ShopProduct = {
  id: string
  name: string
  description: string
  price: number
  image: string
  alt: string
  category: ShopCategory
  /** Hidden from restaurant shop when true. */
  archived: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export const SHOP_CATEGORY_META: { id: ShopCategory; label: string }[] = [
  { id: 'qr-stand', label: 'QR stands' },
  { id: 'printer', label: 'Printers' },
  { id: 'accessory', label: 'Accessories' },
]

export function shopCategoryLabel(id: ShopCategory): string {
  return SHOP_CATEGORY_META.find((c) => c.id === id)?.label ?? id
}

const now = () => new Date().toISOString()

export function defaultShopCatalog(): ShopProduct[] {
  const ts = '2026-01-01T00:00:00.000Z'
  return [
    {
      id: 'acrylic-stand',
      name: 'Acrylic QR code stand',
      description: 'Clear table-top acrylic stand with SCAN MENU print area.',
      price: 190,
      image: '/shop/acrylic-qr-stand.svg',
      alt: 'Clear acrylic QR code table stand',
      category: 'qr-stand',
      archived: false,
      sortOrder: 1,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: 'wooden-sign',
      name: 'Wooden QR Code Sign with Stand',
      description: 'Warm wood frame on a stand — SCAN TO ORDER branding.',
      price: 299,
      image: '/shop/wooden-qr-sign.svg',
      alt: 'Wooden QR code sign on a stand',
      category: 'qr-stand',
      archived: false,
      sortOrder: 2,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: 'standee',
      name: 'Acrylic QR Standee',
      description: 'Tall counter standee with Bear 360 branding and ORDER NOW CTA.',
      price: 550,
      image: '/shop/acrylic-standee.svg',
      alt: 'Tall acrylic QR standee for counter display',
      category: 'qr-stand',
      archived: false,
      sortOrder: 3,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: 'mobile-printer',
      name: 'Mobile thermal receipt printer',
      description: 'Compact portable printer for counter and delivery bags.',
      price: 2200,
      image: '/shop/mobile-printer.svg',
      alt: 'Compact mobile thermal receipt printer',
      category: 'printer',
      archived: false,
      sortOrder: 4,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: '80mm-printer',
      name: '80mm Thermal Receipt Printer USB+LAN+BT',
      description: 'Full-size 80mm kitchen / counter printer with USB, LAN and Bluetooth.',
      price: 5800,
      image: '/shop/thermal-printer-80mm.svg',
      alt: '80mm thermal receipt printer with USB LAN Bluetooth',
      category: 'printer',
      archived: false,
      sortOrder: 5,
      createdAt: ts,
      updatedAt: ts,
    },
  ]
}

export function blankShopProduct(partial?: Partial<ShopProduct>): ShopProduct {
  const ts = now()
  return {
    id: `shop_${Date.now().toString(36)}`,
    name: '',
    description: '',
    price: 0,
    image: '/shop/acrylic-qr-stand.svg',
    alt: '',
    category: 'qr-stand',
    archived: false,
    sortOrder: 100,
    createdAt: ts,
    updatedAt: ts,
    ...partial,
  }
}

export function normalizeShopProduct(raw: Partial<ShopProduct>): ShopProduct {
  const base = blankShopProduct()
  const category = (['qr-stand', 'printer', 'accessory'] as ShopCategory[]).includes(
    raw.category as ShopCategory,
  )
    ? (raw.category as ShopCategory)
    : 'qr-stand'
  return {
    ...base,
    ...raw,
    id: typeof raw.id === 'string' && raw.id ? raw.id : base.id,
    name: (raw.name ?? '').trim() || 'Untitled product',
    description: (raw.description ?? '').trim(),
    price: typeof raw.price === 'number' && raw.price >= 0 ? raw.price : 0,
    image: (raw.image ?? base.image).trim() || base.image,
    alt: (raw.alt ?? raw.name ?? 'Shop product').trim(),
    category,
    archived: !!raw.archived,
    sortOrder: typeof raw.sortOrder === 'number' ? raw.sortOrder : 100,
    createdAt: raw.createdAt ?? base.createdAt,
    updatedAt: raw.updatedAt ?? base.updatedAt,
  }
}

export function mergeShopCatalog(raw: unknown): ShopProduct[] {
  if (!Array.isArray(raw) || raw.length === 0) return defaultShopCatalog()
  return raw.map((p) => normalizeShopProduct(p as Partial<ShopProduct>))
}
