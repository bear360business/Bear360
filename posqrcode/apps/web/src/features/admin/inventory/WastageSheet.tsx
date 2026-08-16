import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useInventory, type WastageReason } from '@/hooks/use-inventory'
import { inr } from '@/lib/currency'

const REASONS: WastageReason[] = ['Spoiled', 'Overcooked', 'Returned', 'Spillage', 'Expired']

export interface WastageSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  presetIngredientId?: string | null
  readOnly?: boolean
}

/** Deduct stock and roll value into monthly wastage. */
export function WastageSheet({
  open,
  onOpenChange,
  presetIngredientId,
  readOnly,
}: WastageSheetProps) {
  const { ingredients, recordWastage } = useInventory()
  const [ingredientId, setIngredientId] = useState('')
  const [qty, setQty] = useState('')
  const [reason, setReason] = useState<WastageReason>('Spoiled')

  useEffect(() => {
    if (!open) return
    const preset =
      (presetIngredientId && ingredients.find((i) => i.id === presetIngredientId)) ||
      ingredients[0]
    setIngredientId(preset?.id ?? '')
    setQty('')
    setReason('Spoiled')
  }, [open, presetIngredientId, ingredients])

  const item = ingredients.find((i) => i.id === ingredientId)
  const amount = Number(qty) || 0
  const value = item ? amount * item.costPerUnit : 0

  const submit = () => {
    if (!item) {
      toast.error('Pick an ingredient')
      return
    }
    if (amount <= 0) {
      toast.error('Enter a quantity greater than zero')
      return
    }
    if (amount > item.stock) {
      toast.error(`Only ${item.stock} ${item.unit} on hand`)
      return
    }
    recordWastage({ ingredientId: item.id, qty: amount, reason })
    toast.success(`Wastage recorded · ${item.name}`, {
      description: `${amount} ${item.unit} · ${reason} · ${inr(value)}`,
    })
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Record wastage</SheetTitle>
          <SheetDescription>
            Deducts stock immediately and adds the cost to this month’s wastage total.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 py-6">
          <div className="space-y-2">
            <Label>Ingredient</Label>
            <Select value={ingredientId} onValueChange={setIngredientId}>
              <SelectTrigger>
                <SelectValue placeholder="Select…" />
              </SelectTrigger>
              <SelectContent>
                {ingredients.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.name} · {i.stock} {i.unit}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="waste-qty">Qty {item ? `(${item.unit})` : ''}</Label>
              <Input
                id="waste-qty"
                type="number"
                min={0}
                step="0.1"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Select value={reason} onValueChange={(v) => setReason(v as WastageReason)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REASONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="rounded-xl border border-line bg-surface-muted/50 px-3 py-2 text-sm text-muted-foreground">
            Estimated loss{' '}
            <span className="font-medium tabular-nums text-foreground">
              {value > 0 ? inr(value) : '—'}
            </span>
          </p>
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={readOnly || amount <= 0} onClick={submit}>
            Record wastage
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
