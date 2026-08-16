import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Check, Copy, Pipette, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  hexToHsv,
  hexToRgb,
  hsvToHex,
  normalizeHex,
  rgbToHex,
} from '@/lib/color'
import { cn } from '@/lib/utils'

export interface ColorPickerProps {
  label: string
  caption?: string
  value: string | null
  /** Theme default shown when value is null. */
  fallback: string
  onChange: (hex: string | null) => void
}

type Format = 'hex' | 'rgb' | 'hsv' | 'hsl'

function hueCss(h: number) {
  return `hsl(${h} 100% 50%)`
}

/** Google-style HSV colour picker in a popover. */
export function ColorPicker({ label, caption, value, fallback, onChange }: ColorPickerProps) {
  const active = value ?? fallback
  const [open, setOpen] = useState(false)
  const [hex, setHex] = useState(active)
  const [hsv, setHsv] = useState(() => hexToHsv(active) ?? { h: 142, s: 0.7, v: 0.6 })
  const [format, setFormat] = useState<Format>('hex')
  const [draftHex, setDraftHex] = useState(active)
  const svRef = useRef<HTMLDivElement>(null)
  const hueRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const next = value ?? fallback
    setHex(next)
    setDraftHex(next)
    const parsed = hexToHsv(next)
    if (parsed) setHsv(parsed)
  }, [open, value, fallback])

  const commit = (nextHex: string) => {
    const n = normalizeHex(nextHex)
    if (!n) return
    setHex(n)
    setDraftHex(n)
    onChange(n)
  }

  const applyHsv = (h: number, s: number, v: number) => {
    const next = { h: ((h % 360) + 360) % 360, s: Math.min(1, Math.max(0, s)), v: Math.min(1, Math.max(0, v)) }
    setHsv(next)
    commit(hsvToHex(next.h, next.s, next.v))
  }

  const onSvPointer = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = svRef.current
    if (!el) return
    el.setPointerCapture(e.pointerId)
    const move = (ev: PointerEvent) => {
      const rect = el.getBoundingClientRect()
      const s = Math.min(1, Math.max(0, (ev.clientX - rect.left) / rect.width))
      const v = 1 - Math.min(1, Math.max(0, (ev.clientY - rect.top) / rect.height))
      applyHsv(hsv.h, s, v)
    }
    move(e.nativeEvent)
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const onHuePointer = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = hueRef.current
    if (!el) return
    el.setPointerCapture(e.pointerId)
    const move = (ev: PointerEvent) => {
      const rect = el.getBoundingClientRect()
      const h = Math.min(1, Math.max(0, (ev.clientX - rect.left) / rect.width)) * 360
      applyHsv(h, hsv.s, hsv.v)
    }
    move(e.nativeEvent)
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const rgb = hexToRgb(hex) ?? { r: 0, g: 0, b: 0 }
  const hsl = (() => {
    const r = rgb.r / 255
    const g = rgb.g / 255
    const b = rgb.b / 255
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const l = (max + min) / 2
    let h = 0
    let s = 0
    if (max !== min) {
      const d = max - min
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
      if (max === r) h = (g - b) / d + (g < b ? 6 : 0)
      else if (max === g) h = (b - r) / d + 2
      else h = (r - g) / d + 4
      h /= 6
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) }
  })()

  const formats: { id: Format; label: string }[] = [
    { id: 'hex', label: 'HEX' },
    { id: 'rgb', label: 'RGB' },
    { id: 'hsv', label: 'HSV' },
    { id: 'hsl', label: 'HSL' },
  ]

  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {caption && <p className="mt-0.5 text-xs text-muted-foreground">{caption}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title="Reset to theme default"
            onClick={() => onChange(null)}
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        )}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex h-10 items-center gap-2 rounded-full border border-line bg-surface pl-1.5 pr-3 shadow-sm transition-colors hover:border-ink-900/20"
            >
              <span
                className="h-7 w-7 rounded-full border border-line shadow-inner"
                style={{ backgroundColor: active }}
              />
              <span className="font-mono text-xs uppercase">{active}</span>
              <Pipette className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            className="w-[300px] border-line bg-[#1a1d24] p-4 text-white shadow-float"
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold tracking-tight">Colour picker</p>
              {value ? (
                <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                  Custom
                </span>
              ) : (
                <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                  Theme default
                </span>
              )}
            </div>

            <div className="flex gap-3">
              <div
                className="h-[140px] w-14 shrink-0 rounded-lg border border-white/10"
                style={{ backgroundColor: hex }}
              />
              <div
                ref={svRef}
                onPointerDown={onSvPointer}
                className="relative h-[140px] flex-1 cursor-crosshair touch-none overflow-hidden rounded-lg"
                style={{
                  backgroundColor: hueCss(hsv.h),
                  backgroundImage:
                    'linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent)',
                }}
              >
                <span
                  className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.35)]"
                  style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%` }}
                />
              </div>
            </div>

            <div
              ref={hueRef}
              onPointerDown={onHuePointer}
              className="relative mt-3 h-3 cursor-pointer touch-none rounded-full"
              style={{
                background:
                  'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)',
              }}
            >
              <span
                className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-white shadow"
                style={{ left: `${(hsv.h / 360) * 100}%`, backgroundColor: hueCss(hsv.h) }}
              />
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex gap-1 rounded-lg bg-white/5 p-1">
                {formats.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFormat(f.id)}
                    className={cn(
                      'flex-1 rounded-md px-1 py-1 text-[10px] font-semibold uppercase tracking-wide',
                      format === f.id ? 'bg-white/15 text-white' : 'text-white/50 hover:text-white/80',
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {format === 'hex' && (
                <div className="relative">
                  <Label className="sr-only">HEX</Label>
                  <Input
                    value={draftHex}
                    onChange={(e) => setDraftHex(e.target.value)}
                    onBlur={() => {
                      const n = normalizeHex(draftHex)
                      if (n) commit(n)
                      else setDraftHex(hex)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const n = normalizeHex(draftHex)
                        if (n) commit(n)
                        else setDraftHex(hex)
                      }
                    }}
                    className="h-10 border-white/10 bg-white/5 pr-10 font-mono text-sm uppercase text-white placeholder:text-white/30"
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-white/60 hover:text-white"
                    onClick={() => {
                      navigator.clipboard
                        ?.writeText(hex)
                        .then(() => toast.success('Colour copied'))
                        .catch(() => toast.error('Could not copy'))
                    }}
                    aria-label="Copy HEX"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              )}

              {format === 'rgb' && (
                <div className="grid grid-cols-3 gap-2">
                  {(['r', 'g', 'b'] as const).map((ch) => (
                    <div key={ch} className="space-y-1">
                      <Label className="text-[10px] uppercase text-white/50">{ch}</Label>
                      <Input
                        type="number"
                        min={0}
                        max={255}
                        value={rgb[ch]}
                        onChange={(e) => {
                          const next = { ...rgb, [ch]: Number(e.target.value) || 0 }
                          commit(rgbToHex(next.r, next.g, next.b))
                        }}
                        className="h-9 border-white/10 bg-white/5 font-mono text-xs text-white"
                      />
                    </div>
                  ))}
                </div>
              )}

              {format === 'hsv' && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase text-white/50">H</Label>
                    <Input
                      type="number"
                      min={0}
                      max={360}
                      value={Math.round(hsv.h)}
                      onChange={(e) => applyHsv(Number(e.target.value) || 0, hsv.s, hsv.v)}
                      className="h-9 border-white/10 bg-white/5 font-mono text-xs text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase text-white/50">S%</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={Math.round(hsv.s * 100)}
                      onChange={(e) =>
                        applyHsv(hsv.h, (Number(e.target.value) || 0) / 100, hsv.v)
                      }
                      className="h-9 border-white/10 bg-white/5 font-mono text-xs text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase text-white/50">V%</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={Math.round(hsv.v * 100)}
                      onChange={(e) =>
                        applyHsv(hsv.h, hsv.s, (Number(e.target.value) || 0) / 100)
                      }
                      className="h-9 border-white/10 bg-white/5 font-mono text-xs text-white"
                    />
                  </div>
                </div>
              )}

              {format === 'hsl' && (
                <p className="rounded-lg bg-white/5 px-3 py-2 font-mono text-xs text-white/80">
                  hsl({hsl.h}, {hsl.s}%, {hsl.l}%)
                </p>
              )}
            </div>

            <div className="mt-3 flex items-center gap-2 text-[11px] text-white/45">
              <Check className="h-3 w-3 text-emerald-400" />
              Applies live to the admin shell
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}
