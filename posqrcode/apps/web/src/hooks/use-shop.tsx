import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { isSuperAdmin } from '@/lib/auth'
import { apiGetPlatformConfig, apiPutPlatformConfig } from '@/lib/api-platform'
import {
  SHOP_EVENT,
  SHOP_STORAGE_KEY,
  blankShopProduct,
  defaultShopCatalog,
  mergeShopCatalog,
  type ShopProduct,
} from '@/lib/shop-catalog'
import { useMockData } from '@/lib/runtime-config'
import { reportApiError } from '@/lib/api-error'

interface ShopContextValue {
  products: ShopProduct[]
  /** Active products for restaurant shop (not archived), sorted. */
  activeProducts: ShopProduct[]
  qrStands: ShopProduct[]
  create: (draft?: Partial<ShopProduct>) => ShopProduct
  update: (id: string, patch: Partial<ShopProduct>) => void
  archive: (id: string) => void
  restore: (id: string) => void
  remove: (id: string) => void
  reset: () => void
}

const ShopContext = createContext<ShopContextValue | null>(null)

function readStored(): ShopProduct[] {
  try {
    const raw = localStorage.getItem(SHOP_STORAGE_KEY)
    return raw ? mergeShopCatalog(JSON.parse(raw)) : defaultShopCatalog()
  } catch {
    return defaultShopCatalog()
  }
}

function writeStored(products: ShopProduct[]) {
  try {
    localStorage.setItem(SHOP_STORAGE_KEY, JSON.stringify(products))
    window.dispatchEvent(new Event(SHOP_EVENT))
  } catch {
    /* ignore */
  }
}

function sortProducts(list: ShopProduct[]) {
  return [...list].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
}

export function ShopProvider({ children }: { children: ReactNode }) {
  const mock = useMockData()
  const apiReady = useRef(mock)
  const [products, setProducts] = useState<ShopProduct[]>(() => readStored())

  useEffect(() => {
    writeStored(products)
    if (!mock && apiReady.current && isSuperAdmin()) {
      void apiPutPlatformConfig({ shop: products }).catch((err) => reportApiError(err))
    }
  }, [products, mock])

  useEffect(() => {
    if (mock || !isSuperAdmin()) {
      apiReady.current = true
      return
    }
    let cancelled = false
    void apiGetPlatformConfig()
      .then((cfg) => {
        if (cancelled) return
        if (Array.isArray(cfg.shop)) {
          const next = mergeShopCatalog(cfg.shop)
          writeStored(next)
          setProducts(next)
        }
      })
      .catch((err) => reportApiError(err))
      .finally(() => {
        if (!cancelled) apiReady.current = true
      })
    return () => {
      cancelled = true
    }
  }, [mock])

  useEffect(() => {
    const sync = () => setProducts(readStored())
    const onStorage = (e: StorageEvent) => {
      if (e.key === SHOP_STORAGE_KEY || e.key === null) sync()
    }
    window.addEventListener(SHOP_EVENT, sync)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(SHOP_EVENT, sync)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  const create = useCallback((draft?: Partial<ShopProduct>) => {
    const next = blankShopProduct({
      ...draft,
      updatedAt: new Date().toISOString(),
    })
    setProducts((prev) => [...prev, next])
    return next
  }, [])

  const update = useCallback((id: string, patch: Partial<ShopProduct>) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, ...patch, id: p.id, updatedAt: new Date().toISOString() }
          : p,
      ),
    )
  }, [])

  const archive = useCallback(
    (id: string) => update(id, { archived: true }),
    [update],
  )

  const restore = useCallback(
    (id: string) => update(id, { archived: false }),
    [update],
  )

  const remove = useCallback((id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id))
  }, [])

  const reset = useCallback(() => {
    const next = defaultShopCatalog()
    writeStored(next)
    setProducts(next)
  }, [])

  const activeProducts = useMemo(
    () => sortProducts(products.filter((p) => !p.archived)),
    [products],
  )

  const qrStands = useMemo(
    () => activeProducts.filter((p) => p.category === 'qr-stand'),
    [activeProducts],
  )

  const value = useMemo(
    () => ({
      products: sortProducts(products),
      activeProducts,
      qrStands,
      create,
      update,
      archive,
      restore,
      remove,
      reset,
    }),
    [products, activeProducts, qrStands, create, update, archive, restore, remove, reset],
  )

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>
}

export function useShop(): ShopContextValue {
  const ctx = useContext(ShopContext)
  if (!ctx) throw new Error('useShop must be used within <ShopProvider>')
  return ctx
}
