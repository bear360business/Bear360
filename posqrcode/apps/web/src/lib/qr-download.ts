/** Download a QRCodeSVG node as a PNG file. */

export function downloadQrSvgAsPng(
  svg: SVGSVGElement | null | undefined,
  filename: string,
  bg = '#ffffff',
): boolean {
  if (!svg) return false
  const xml = new XMLSerializer().serializeToString(svg)
  const img = new Image()
  const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  img.onload = () => {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      URL.revokeObjectURL(url)
      return
    }
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, 512, 512)
    ctx.drawImage(img, 0, 0, 512, 512)
    const a = document.createElement('a')
    a.download = filename.endsWith('.png') ? filename : `${filename}.png`
    a.href = canvas.toDataURL('image/png')
    a.click()
    URL.revokeObjectURL(url)
  }
  img.onerror = () => URL.revokeObjectURL(url)
  img.src = url
  return true
}
