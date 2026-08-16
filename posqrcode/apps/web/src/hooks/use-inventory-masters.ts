import { useCallback } from 'react'
import { useVenueBagState } from '@/hooks/use-venue-bag'
import type { InventoryCategory, Supplier } from '@/lib/mock'

export function useSuppliers() {
  const { value: suppliers, setValue: setSuppliers, hydrated } = useVenueBagState<Supplier[]>({
    storageKey: 'bearqr:suppliers',
    bag: 'suppliers',
    seed: [],
    isEmpty: (v) => !Array.isArray(v) || v.length === 0,
  })

  const upsert = useCallback(
    (item: Supplier) => {
      setSuppliers((prev) => {
        const i = prev.findIndex((s) => s.id === item.id)
        if (i >= 0) {
          const next = [...prev]
          next[i] = item
          return next
        }
        return [item, ...prev]
      })
    },
    [setSuppliers],
  )

  const remove = useCallback(
    (id: string) => {
      setSuppliers((prev) => prev.filter((s) => s.id !== id))
    },
    [setSuppliers],
  )

  return { suppliers, setSuppliers, upsert, remove, hydrated }
}

export function useInventoryCategories() {
  const { value: categories, setValue: setCategories, hydrated } =
    useVenueBagState<InventoryCategory[]>({
      storageKey: 'bearqr:inventory-categories',
      bag: 'inventoryCategories',
      seed: [],
      isEmpty: (v) => !Array.isArray(v) || v.length === 0,
    })

  const upsert = useCallback(
    (item: InventoryCategory) => {
      setCategories((prev) => {
        const i = prev.findIndex((c) => c.id === item.id)
        if (i >= 0) {
          const next = [...prev]
          next[i] = item
          return next
        }
        return [item, ...prev]
      })
    },
    [setCategories],
  )

  const remove = useCallback(
    (id: string) => {
      setCategories((prev) => prev.filter((c) => c.id !== id))
    },
    [setCategories],
  )

  return { categories, setCategories, upsert, remove, hydrated }
}
