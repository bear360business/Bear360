import { useMemo, useRef } from 'react'
import { Download, ExternalLink, Palette, Printer } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/app/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCurrentVenue } from '@/hooks/use-restaurants'
import { useQrDesign } from '@/hooks/use-qr-design'
import { getCounterQrUrl } from '@/lib/mock'
import { cn } from '@/lib/utils'

/** Branded QR designer for the venue counter menu link. */
export function QrDesignerPage() {
  const venue = useCurrentVenue()
  const { design, patch } = useQrDesign()
  const svgWrap = useRef<HTMLDivElement>(null)
  const menuUrl = useMemo(() => getCounterQrUrl(venue.slug || venue.id), [venue])

  const downloadPng = () => {
    const svg = svgWrap.current?.querySelector('svg')
    if (!svg) return
    const xml = new XMLSerializer().serializeToString(svg)
    const img = new Image()
    const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = 512
      canvas.height = 512
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.fillStyle = design.bg
      ctx.fillRect(0, 0, 512, 512)
      ctx.drawImage(img, 0, 0, 512, 512)
      const a = document.createElement('a')
      a.download = `${venue.slug || 'menu'}-qr.png`
      a.href = canvas.toDataURL('image/png')
      a.click()
      URL.revokeObjectURL(url)
      toast.success('PNG downloaded')
    }
    img.src = url
  }

  const radius =
    design.corner === 'sharp'
      ? '0'
      : design.corner === '5'
        ? '8px'
        : design.corner === '10'
          ? '14px'
          : '24px'

  return (
    <>
      <PageHeader
        title="QR Designer"
        caption="Create a stunning, branded QR code for your digital menu."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-success-tint px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-success">
              ● Customization enabled
            </span>
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() => {
                window.print()
                toast.message('Use browser print for the live preview')
              }}
            >
              <Printer className="h-4 w-4" />
              Print
            </Button>
            <Button type="button" className="rounded-full" onClick={downloadPng}>
              <Download className="h-4 w-4" />
              Download PNG
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-card border-line shadow-card">
          <CardContent className="space-y-5 p-6">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-brand" />
              <h2 className="font-display text-base font-bold">Design options</h2>
            </div>

            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                QR pattern style
              </Label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {(
                  [
                    ['square', 'Classic square'],
                    ['dots', 'Modern dots'],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => patch({ pattern: id })}
                    className={cn(
                      'rounded-xl border-2 px-3 py-3 text-left text-sm font-semibold transition-colors',
                      design.pattern === id
                        ? 'border-brand bg-brand-tint'
                        : 'border-line hover:border-ink-900/20',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  QR color
                </Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={design.fg}
                    onChange={(e) => patch({ fg: e.target.value })}
                    className="h-10 w-12 cursor-pointer rounded border border-line bg-transparent"
                  />
                  <Input
                    value={design.fg}
                    onChange={(e) => patch({ fg: e.target.value })}
                    className="font-mono text-xs uppercase"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Background
                </Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={design.bg}
                    onChange={(e) => patch({ bg: e.target.value })}
                    className="h-10 w-12 cursor-pointer rounded border border-line bg-transparent"
                  />
                  <Input
                    value={design.bg}
                    onChange={(e) => patch({ bg: e.target.value })}
                    className="font-mono text-xs uppercase"
                  />
                </div>
              </div>
            </div>

            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Corner smoothness
              </Label>
              <div className="mt-2 flex flex-wrap gap-1 rounded-xl bg-surface-muted p-1">
                {(
                  [
                    ['sharp', 'Sharp'],
                    ['5', '5%'],
                    ['10', '10%'],
                    ['round', 'Round'],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => patch({ corner: id })}
                    className={cn(
                      'flex-1 rounded-lg px-2 py-2 text-xs font-semibold',
                      design.corner === id
                        ? 'bg-surface text-foreground shadow-card'
                        : 'text-muted-foreground',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Display logo URL</Label>
              <Input
                value={design.logoUrl}
                onChange={(e) => patch({ logoUrl: e.target.value })}
                placeholder="Paste image URL (e.g. logo.png)"
              />
              <p className="text-xs text-muted-foreground">
                Pro tip: use a high-contrast logo for best readability.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Caption under QR</Label>
              <Input
                value={design.caption}
                onChange={(e) => patch({ caption: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="overflow-hidden rounded-card border-line shadow-card">
            <div className="bg-ink-900 px-4 py-2 text-center text-xs font-bold uppercase tracking-[0.18em] text-white">
              Live preview
            </div>
            <CardContent className="flex flex-col items-center p-8">
              <div
                ref={svgWrap}
                className="relative p-4"
                style={{ background: design.bg, borderRadius: radius }}
              >
                <QRCodeSVG
                  value={menuUrl}
                  size={200}
                  fgColor={design.fg}
                  bgColor={design.bg}
                  level="M"
                  includeMargin={false}
                  style={
                    design.pattern === 'dots'
                      ? { imageRendering: 'pixelated', opacity: 0.95 }
                      : undefined
                  }
                />
                {design.logoUrl ? (
                  <img
                    src={design.logoUrl}
                    alt=""
                    className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-lg border-2 border-white object-cover shadow-card"
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                ) : null}
              </div>
              <p className="mt-4 font-display text-lg font-bold">{venue.name}</p>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {design.caption}
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <span className="rounded-full bg-surface-muted px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Design: {design.pattern === 'square' ? 'Squares' : 'Dots'}
                </span>
                <span className="rounded-full bg-surface-muted px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Branding: {design.logoUrl ? 'Logo' : 'No logo'}
                </span>
              </div>
            </CardContent>
          </Card>

          <div className="rounded-card border border-destructive/30 bg-danger-tint/40 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-destructive">
              Your direct menu link
            </p>
            <a
              href={menuUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-destructive underline-offset-2 hover:underline"
            >
              {menuUrl}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>
    </>
  )
}
