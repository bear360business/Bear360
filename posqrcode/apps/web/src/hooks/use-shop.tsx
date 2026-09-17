import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { getAccessToken } from '@/lib/api-client'
import { isSuperAdmin } from '@/lib/auth'
import { apiGetPlatformConfig, apiPutPlatformConfig } from '@/lib/api-platform'
import {
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

function sortProducts(list: ShopProduct[]) {
  return [...list].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
}

function writeStored(products: ShopProduct[]): void {
  try {
    localStorage.setItem(SHOP_STORAGE_KEY, JSON.stringify(products))
  } catch {
    /* ignore */
  }
}

export function ShopProvider({ children }: { children: ReactNode }) {
  const mock = useMockData()
  const [products, setProducts] = useState<ShopProduct[]>(() => readStored())

  const persist = useCallback(
    (next: ShopProduct[]) => {
      writeStored(next)
      if (!mock && isSuperAdmin() && getAccessToken()) {
        void apiPutPlatformConfig({ shop: next }).catch((err) => reportApiError(err))
      }
    },
    [mock],
  )

  useEffect(() => {
    if (mock || !isSuperAdmin() || !getAccessToken()) {
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
    return () => {
      cancelled = true
    }
  }, [mock])

  useEffect(() => {
    const sync = () => setProducts(readStored())
    const onStorage = (e: StorageEvent) => {
      if (e.key === SHOP_STORAGE_KEY || e.key === null) sync()
    }
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  const create = useCallback((draft?: Partial<ShopProduct>) => {
    const next = blankShopProduct({
      ...draft,
      updatedAt: new Date().toISOString(),
    })
    setProducts((prev) => {
      const updated = [...prev, next]
      persist(updated)
      return updated
    })
    return next
  }, [persist])

  const update = useCallback((id: string, patch: Partial<ShopProduct>) => {
    setProducts((prev) => {
      const updated = prev.map((p) =>
        p.id === id
          ? { ...p, ...patch, id: p.id, updatedAt: new Date().toISOString() }
          : p,
      )
      persist(updated)
      return updated
    })
  }, [persist])

  const archive = useCallback(
    (id: string) => update(id, { archived: true }),
    [update],
  )

  const restore = useCallback(
    (id: string) => update(id, { archived: false }),
    [update],
  )

  const remove = useCallback((id: string) => {
    setProducts((prev) => {
      const updated = prev.filter((p) => p.id !== id)
      persist(updated)
      return updated
    })
  }, [persist])

  const reset = useCallback(() => {
    const next = defaultShopCatalog()
    persist(next)
    setProducts(next)
  }, [persist])

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
