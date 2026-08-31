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
  apiAdjustIngredientStock,
  apiCreatePurchase,
  apiListIngredients,
  apiListPurchases,
  apiUpsertIngredient,
} from '@/lib/api-catalog'
import { getAccessToken } from '@/lib/api-client'
import { apiGetVenueData, apiPutVenueData } from '@/lib/api-platform'
import {
  applyPurchase as applyPurchaseMut,
  computeAlertCount,
  computeOutOfStock,
  computeStockValue,
  ingredients as seedIngredients,
  purchases as seedPurchases,
  recipeMap,
  wastageThisMonth as seedWastage,
  type Ingredient,
  type PurchaseEntry,
  type PurchaseLine,
} from '@/lib/mock'
import { useMockData } from '@/lib/runtime-config'
import type { OrderItem } from '@/lib/types'
import {
  readVenueScoped,
  resolveDataVenueId,
  subscribeVenueScope,
  writeVenueScoped,
} from '@/lib/venue-scope'
import { reportApiError } from '@/lib/api-error'
import { useAuthTick } from '@/hooks/use-auth-tick'
import { isStoreSetupPending } from '@/features/admin/onboarding/store-setup'

const ING_KEY = 'bearqr:ingredients'
const PUR_KEY = 'bearqr:purchases'
const DEDUCTED_KEY = 'bearqr:deducted-orders'
const WASTE_KEY = 'bearqr:wastage-value'
const RECIPE_KEY = 'bearqr:recipe-map'

export type WastageReason = 'Spoiled' | 'Overcooked' | 'Returned' | 'Spillage' | 'Expired'
export type RecipeLine = { ingredientId: string; qty: number }

interface InventoryContextValue {
  ingredients: Ingredient[]
  purchases: PurchaseEntry[]
  recipes: Record<string, RecipeLine[]>
  stockValue: number
  alertCount: number
  outCount: number
  wastageValue: number
  savePurchase: (draft: Omit<PurchaseEntry, 'id' | 'createdAt'>) => PurchaseEntry
  upsertIngredient: (item: Ingredient) => void
  /** Set absolute stock qty (manual count / correction). */
  adjustStock: (ingredientId: string, stock: number) => void
  saveRecipes: (next: Record<string, RecipeLine[]>) => void
  recordWastage: (input: {
    ingredientId: string
    qty: number
    reason: WastageReason
  }) => void
  deductForOrder: (orderId: string, items: OrderItem[]) => void
}

const InventoryContext = createContext<InventoryContextValue | null>(null)

function read<T>(key: string, venueId: string, fallback: T): T {
  return readVenueScoped(key, venueId, fallback)
}

function write(key: string, venueId: string, value: unknown) {
  writeVenueScoped(key, venueId, value)
}

function syncModuleIngredients(list: Ingredient[]) {
  seedIngredients.splice(0, seedIngredients.length, ...list.map((i) => ({ ...i })))
}

function syncModulePurchases(list: PurchaseEntry[]) {
  seedPurchases.splice(0, seedPurchases.length, ...list)
}

function syncModuleRecipes(next: Record<string, RecipeLine[]>) {
  for (const key of Object.keys(recipeMap)) delete recipeMap[key]
  Object.assign(recipeMap, next)
}

export function InventoryProvider({ children }: { children: ReactNode }) {
  const mock = useMockData()
  const authTick = useAuthTick()
  const [venueId, setVenueId] = useState(() => resolveDataVenueId())

  const [ingredients, setIngredients] = useState<Ingredient[]>(() =>
    read(ING_KEY, resolveDataVenueId(), [] as Ingredient[]),
  )
  const [purchases, setPurchases] = useState<PurchaseEntry[]>(() =>
    read(PUR_KEY, resolveDataVenueId(), [] as PurchaseEntry[]),
  )
  const [recipes, setRecipes] = useState<Record<string, RecipeLine[]>>(() =>
    read(RECIPE_KEY, resolveDataVenueId(), {} as Record<string, RecipeLine[]>),
  )
  const [deducted, setDeducted] = useState<string[]>(() =>
    read(DEDUCTED_KEY, resolveDataVenueId(), []),
  )
  const [extraWastage, setExtraWastage] = useState(() =>
    read(WASTE_KEY, resolveDataVenueId(), 0),
  )

  useEffect(
    () =>
      subscribeVenueScope(() => {
        const next = resolveDataVenueId()
        if (!next || next === venueId) return
        setVenueId(next)
        setIngredients(read(ING_KEY, next, [] as Ingredient[]))
        setPurchases(read(PUR_KEY, next, [] as PurchaseEntry[]))
        setRecipes(read(RECIPE_KEY, next, {} as Record<string, RecipeLine[]>))
        setDeducted(read(DEDUCTED_KEY, next, []))
        setExtraWastage(read(WASTE_KEY, next, 0))
      }),
    [venueId],
  )

  useEffect(() => {
    write(ING_KEY, venueId, ingredients)
    syncModuleIngredients(ingredients)
  }, [ingredients, venueId])

  useEffect(() => {
    write(PUR_KEY, venueId, purchases)
    syncModulePurchases(purchases)
  }, [purchases, venueId])

  useEffect(() => {
    write(RECIPE_KEY, venueId, recipes)
    syncModuleRecipes(recipes)
  }, [recipes, venueId])

  useEffect(() => write(DEDUCTED_KEY, venueId, deducted), [deducted, venueId])
  useEffect(() => write(WASTE_KEY, venueId, extraWastage), [extraWastage, venueId])

  // Cross-tab: reload stock + deducted so two admin tabs don't double-cut.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key?.includes(ING_KEY) || e.key === null) {
        setIngredients(read(ING_KEY, venueId, [] as Ingredient[]))
      }
      if (e.key?.includes(DEDUCTED_KEY) || e.key === null) {
        setDeducted(read(DEDUCTED_KEY, venueId, []))
      }
      if (e.key?.includes(RECIPE_KEY) || e.key === null) {
        const next = read(RECIPE_KEY, venueId, {} as Record<string, RecipeLine[]>)
        setRecipes(next)
        syncModuleRecipes(next)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [venueId])

  useEffect(() => {
    if (mock || !getAccessToken() || isStoreSetupPending()) return
    let cancelled = false
    void Promise.all([
      apiListIngredients(venueId),
      apiListPurchases(venueId),
      apiGetVenueData<{
        recipes?: Record<string, RecipeLine[]>
        wastageValue?: number
        deducted?: string[]
      }>(venueId, 'inventory'),
    ])
      .then(([ings, purs, bag]) => {
        if (cancelled) return
        setIngredients(ings)
        syncModuleIngredients(ings)
        if (Array.isArray(purs)) {
          const mapped: PurchaseEntry[] = purs.map((p) => ({
            id: p.id,
            supplier: p.supplier,
            invoiceNo: p.invoiceNo,
            date: p.date,
            lines: (p.lines as PurchaseLine[]) ?? [],
            gstPct: Number(p.gstPct) || 0,
            note: p.note ?? undefined,
            createdAt: p.createdAt,
          }))
          setPurchases(mapped)
          syncModulePurchases(mapped)
        }
        if (bag && typeof bag === 'object') {
          if (bag.recipes) {
            setRecipes(bag.recipes)
            syncModuleRecipes(bag.recipes)
          }
          if (typeof bag.wastageValue === 'number') setExtraWastage(bag.wastageValue)
          if (Array.isArray(bag.deducted)) setDeducted(bag.deducted)
        }
      })
      .catch((err) => reportApiError(err))
    return () => {
      cancelled = true
    }
  }, [mock, venueId, authTick])

  const persistInventoryBag = useCallback(
    (next: {
      recipes?: Record<string, RecipeLine[]>
      wastageValue?: number
      deducted?: string[]
    }) => {
      if (mock || !getAccessToken()) return
      void apiPutVenueData(venueId, 'inventory', {
        recipes: next.recipes ?? recipes,
        wastageValue: next.wastageValue ?? extraWastage,
        deducted: next.deducted ?? deducted,
      }).catch((err) => reportApiError(err))
    },
    [mock, venueId, recipes, extraWastage, deducted],
  )

  const savePurchase = useCallback(
    (draft: Omit<PurchaseEntry, 'id' | 'createdAt'>) => {
      const entry: PurchaseEntry = {
        ...draft,
        id: `pur-${Date.now()}`,
        createdAt: new Date().toISOString(),
      }
      syncModuleIngredients(ingredients)
      const next = applyPurchaseMut(entry.lines as PurchaseLine[], entry.supplier)
      setIngredients(next)
      setPurchases((prev) => [entry, ...prev])
      if (!mock) {
        void apiCreatePurchase(venueId, {
          supplier: entry.supplier,
          invoiceNo: entry.invoiceNo,
          date: entry.date,
          lines: entry.lines.map((l) => ({
            ingredientId: l.ingredientId,
            qty: l.qty,
            unitCost: l.unitCost,
          })),
          gstPct: entry.gstPct,
          note: entry.note,
        }).catch((err) => reportApiError(err))
      }
      return entry
    },
    [ingredients, mock, venueId],
  )

  const upsertIngredient = useCallback(
    (item: Ingredient) => {
      setIngredients((prev) => {
        const idx = prev.findIndex((i) => i.id === item.id)
        if (idx === -1) return [...prev, item]
        const next = [...prev]
        next[idx] = item
        return next
      })
      if (!mock) void apiUpsertIngredient(venueId, item).catch((err) => reportApiError(err))
    },
    [mock, venueId],
  )

  const adjustStock = useCallback(
    (ingredientId: string, stock: number) => {
      const nextStock = Math.max(0, Math.round(stock * 1000) / 1000)
      setIngredients((prev) =>
        prev.map((i) => (i.id === ingredientId ? { ...i, stock: nextStock } : i)),
      )
      if (!mock) {
        void apiAdjustIngredientStock(venueId, ingredientId, nextStock).catch((err) => reportApiError(err))
      }
    },
    [mock, venueId],
  )

  const saveRecipes = useCallback(
    (next: Record<string, RecipeLine[]>) => {
      setRecipes(next)
      persistInventoryBag({ recipes: next })
    },
    [persistInventoryBag],
  )

  const recordWastage = useCallback(
    (input: { ingredientId: string; qty: number; reason: WastageReason }) => {
      if (input.qty <= 0) return
      const item = ingredients.find((i) => i.id === input.ingredientId)
      const value = (item?.costPerUnit ?? 0) * input.qty
      const nextStock = item
        ? Math.max(0, Math.round((item.stock - input.qty) * 1000) / 1000)
        : 0
      setIngredients((prev) =>
        prev.map((i) =>
          i.id === input.ingredientId ? { ...i, stock: nextStock } : i,
        ),
      )
      setExtraWastage((v) => {
        const next = v + value
        persistInventoryBag({ wastageValue: next })
        return next
      })
      if (!mock && item) {
        void apiAdjustIngredientStock(venueId, input.ingredientId, nextStock).catch((err) => reportApiError(err))
      }
    },
    [ingredients, mock, venueId, persistInventoryBag],
  )

  const deductForOrder = useCallback(
    (orderId: string, items: OrderItem[]) => {
      if (deducted.includes(orderId)) return
      // Don't permanently mark deducted when no recipes match — allows mapping later.
      const hasRecipe = items.some((line) => (recipes[line.menuItemId] ?? []).length > 0)
      if (!hasRecipe) return

      setIngredients((prev) => {
        const next = prev.map((i) => ({ ...i }))
        for (const line of items) {
          const recipe = recipes[line.menuItemId]
          if (!recipe?.length) continue
          for (const r of recipe) {
            const ing = next.find((i) => i.id === r.ingredientId)
            if (!ing) continue
            ing.stock = Math.max(
              0,
              Math.round((ing.stock - r.qty * line.qty) * 1000) / 1000,
            )
          }
        }
        if (!mock) {
          for (const ing of next) {
            const before = prev.find((p) => p.id === ing.id)
            if (before && before.stock !== ing.stock) {
              void apiAdjustIngredientStock(venueId, ing.id, ing.stock).catch((err) => reportApiError(err))
            }
          }
        }
        return next
      })
      setDeducted((prev) => {
        const next = prev.includes(orderId) ? prev : [...prev, orderId]
        persistInventoryBag({ deducted: next })
        return next
      })
    },
    [deducted, recipes, persistInventoryBag, mock, venueId],
  )

  const value = useMemo(
    () => ({
      ingredients,
      purchases,
      recipes,
      stockValue: computeStockValue(ingredients),
      alertCount: computeAlertCount(ingredients),
      outCount: computeOutOfStock(ingredients).length,
      wastageValue: seedWastage + extraWastage,
      savePurchase,
      upsertIngredient,
      adjustStock,
      saveRecipes,
      recordWastage,
      deductForOrder,
    }),
    [
      ingredients,
      purchases,
      recipes,
      extraWastage,
      savePurchase,
      upsertIngredient,
      adjustStock,
      saveRecipes,
      recordWastage,
      deductForOrder,
    ],
  )

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>
}

export function useInventory(): InventoryContextValue {
  const ctx = useContext(InventoryContext)
  if (!ctx) throw new Error('useInventory must be used within an <InventoryProvider>')
  return ctx
}
