import bearlogo from '@/assets/bearlogo.png'
import { BRAND_NAME } from '@/lib/brand'
import { cn } from '@/lib/utils'

/** Raw asset URL — for places that need a plain src (QR center mark, favicons). */
export const brandLogoUrl = bearlogo

export interface BrandLogoProps {
  /** Rendered square size in px. */
  size?: number
  className?: string
}

/** The Bear 360 logo mark. The asset has a baked-in dark background, so it renders as a rounded tile. */
export function BrandLogo({ size = 32, className }: BrandLogoProps) {
  return (
    <img
      src={bearlogo}
      alt={BRAND_NAME}
      width={size}
      height={size}
      className={cn('shrink-0 rounded-lg object-cover', className)}
    />
  )
}
