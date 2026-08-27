import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  apiGetMenu,
  apiRemoveCategory,
  apiRemoveMenuItem,
  apiUpsertCategory,
  apiUpsertMenuItem,
} from '@/lib/api-catalog'
import { getAccessToken } from '@/lib/api-client'
import { apiPublicMenu } from '@/lib/api-orders'
import {
  menuCategories as seedCategories,
  menuItems as seedItems,
} from '@/lib/mock/menu'
import { useMockData } from '@/lib/runtime-config'
import type { MenuCategory, MenuItem } from '@/lib/types'
import {
  readVenueScoped,
  resolveDataVenueId,
  subscribeVenueScope,
  writeVenueScoped,
} from '@/lib/venue-scope'
import { reportApiError } from '@/lib/api-error'
import { useAuthTick } from '@/hooks/use-auth-tick'
import { isStoreSetupPending } from '@/features/admin/onboarding/store-setup'

const CAT_KEY = 'bearqr:menu-categories'
const ITEM_KEY = 'bearqr:menu-items'

interface MenuContextValue {
  categories: MenuCategory[]
  items: MenuItem[]
  upsertCategory: (category: MenuCategory) => void
  removeCategory: (id: string) => { ok: true } | { ok: false; reason: string }
  upsertItem: (item: MenuItem) => void
  removeItem: (id: string) => void
  setAvailable: (id: string, available: boolean) => void
}

const MenuContext = createContext<MenuContextValue | null>(null)

function loadForVenue(venueId: string) {
  return {
    categories: readVenueScoped(CAT_KEY, venueId, [] as MenuCategory[]),
    items: readVenueScoped(ITEM_KEY, venueId, [] as MenuItem[]),
  }
}

function syncCategories(list: MenuCategory[]) {
  seedCategories.splice(0, seedCategories.length, ...list.map((c) => ({ ...c })))
}

function syncItems(list: MenuItem[]) {
  seedItems.splice(0, seedItems.length, ...list.map((i) => ({ ...i })))
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40) || `cat-${Date.now()}`
  )
}

export function MenuProvider({ children }: { children: ReactNode }) {
  const mock = useMockData()
  const authTick = useAuthTick()
  const [venueId, setVenueId] = useState(() => resolveDataVenueId())
  const [categories, setCategories] = useState<MenuCategory[]>(() => {
    // API mode: never paint from localStorage (stale mock cache). Start empty → hydrate.
    const initial = mock ? loadForVenue(resolveDataVenueId()).categories : []
    syncCategories(initial)
    return initial
  })
  const [items, setItems] = useState<MenuItem[]>(() => {
    const initial = mock ? loadForVenue(resolveDataVenueId()).items : []
    syncItems(initial)
    return initial
  })

  useEffect(() => subscribeVenueScope(() => {
    const next = resolveDataVenueId()
    setVenueId(next)
    const data = loadForVenue(next)
    setCategories(data.categories)
    setItems(data.items)
    syncCategories(data.categories)
    syncItems(data.items)
  }), [])

  useEffect(() => {
    if (mock || isStoreSetupPending()) return
    let cancelled = false
    const load = async () => {
      try {
        if (getAccessToken()) {
          const data = await apiGetMenu(venueId)
          if (cancelled) return
          setCategories(data.categories)
          setItems(data.items)
          syncCategories(data.categories)
          syncItems(data.items)
          return
        }
        const data = await apiPublicMenu(venueId)
        if (cancelled || !data.items?.length) return
        const nextCats: MenuCategory[] =
          data.categories?.length > 0
            ? data.categories.map((c) => ({
                id: c.id,
                name: c.name,
                sortOrder: c.sortOrder ?? 0,
                emoji: c.emoji ?? '🍽️',
              }))
            : [{ id: 'api-menu', name: 'Menu', sortOrder: 0, emoji: '🍽️' }]
        const catIds = new Set(nextCats.map((c) => c.id))
        const fallbackCat = nextCats[0]?.id ?? 'api-menu'
        const nextItems: MenuItem[] = data.items.map((r) => ({
          id: r.id,
          categoryId: r.categoryId && catIds.has(r.categoryId) ? r.categoryId : fallbackCat,
          name: r.name,
          description: r.description ?? '',
          price: r.price,
          veg: r.veg ?? true,
          spicy: r.spicy ?? false,
          available: r.available ?? true,
          popular: r.popular,
          image:
            r.image?.trim() ||
            `https://picsum.photos/seed/bearqr-${r.id}/400/300`,
        }))
        setCategories(nextCats)
        setItems(nextItems)
        syncCategories(nextCats)
        syncItems(nextItems)
      } catch (err) {
        // Do not keep stale local/mock menu when authenticated hydrate fails.
        if (getAccessToken()) {
          setCategories([])
          setItems([])
          syncCategories([])
          syncItems([])
          reportApiError(err, 'Could not load menu')
        }
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [mock, venueId, authTick])

  useEffect(() => {
    if (!mock) return
    writeVenueScoped(CAT_KEY, venueId, categories)
    syncCategories(categories)
  }, [categories, venueId, mock])

  useEffect(() => {
    if (!mock) return
    writeVenueScoped(ITEM_KEY, venueId, items)
    syncItems(items)
  }, [items, venueId, mock])

  const upsertCategory = useCallback(
    (category: MenuCategory) => {
      setCategories((prev) => {
        const idx = prev.findIndex((c) => c.id === category.id)
        if (idx >= 0) {
          const next = [...prev]
          next[idx] = category
          return next.sort((a, b) => a.sortOrder - b.sortOrder)
        }
        let unique = category.id || slugify(category.name)
        let n = 2
        while (prev.some((c) => c.id === unique)) unique = `${slugify(category.name)}-${n++}`
        return [...prev, { ...category, id: unique }].sort((a, b) => a.sortOrder - b.sortOrder)
      })
      if (!mock) void apiUpsertCategory(venueId, category).catch((err) => reportApiError(err))
    },
    [mock, venueId],
  )

  const removeCategory = useCallback(
    (id: string) => {
      const count = items.filter((i) => i.categoryId === id).length
      if (count > 0) {
        return {
          ok: false as const,
          reason: `${count} menu item${count === 1 ? '' : 's'} still use this category`,
        }
      }
      setCategories((prev) => prev.filter((c) => c.id !== id))
      if (!mock) void apiRemoveCategory(venueId, id).catch((err) => reportApiError(err))
      return { ok: true as const }
    },
    [items, mock, venueId],
  )

  const upsertItem = useCallback(
    (item: MenuItem) => {
      setItems((prev) => {
        const idx = prev.findIndex((i) => i.id === item.id)
        if (idx === -1) return [item, ...prev]
        const next = [...prev]
        next[idx] = item
        return next
      })
      if (!mock) void apiUpsertMenuItem(venueId, item).catch((err) => reportApiError(err))
    },
    [mock, venueId],
  )

  const removeItem = useCallback(
    (id: string) => {
      setItems((prev) => prev.filter((i) => i.id !== id))
      if (!mock) void apiRemoveMenuItem(venueId, id).catch((err) => reportApiError(err))
    },
    [mock, venueId],
  )

  const setAvailable = useCallback(
    (id: string, available: boolean) => {
      setItems((prev) => {
        const next = prev.map((i) => (i.id === id ? { ...i, available } : i))
        const hit = next.find((i) => i.id === id)
        if (hit && !mock) void apiUpsertMenuItem(venueId, hit).catch((err) => reportApiError(err))
        return next
      })
    },
    [mock, venueId],
  )

  const value = useMemo(
    () => ({
      categories,
      items,
      upsertCategory,
      removeCategory,
      upsertItem,
      removeItem,
      setAvailable,
    }),
    [categories, items, upsertCategory, removeCategory, upsertItem, removeItem, setAvailable],
  )

  return <MenuContext.Provider value={value}>{children}</MenuContext.Provider>
}

export function useMenu(): MenuContextValue {
  const ctx = useContext(MenuContext)
  if (!ctx) throw new Error('useMenu must be used within a <MenuProvider>')
  return ctx
}

export function newCategoryId(name: string): string {
  return slugify(name)
}
