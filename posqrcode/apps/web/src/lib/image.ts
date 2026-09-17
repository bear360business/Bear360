/**
 * Client-side image compression and resizing.
 * Scales high-resolution mobile phone/tablet photos (e.g. 48MP / 12MB)
 * to a web-optimized 16:9 JPEG (~100-200KB) to prevent storage quota issues.
 */
export async function compressImage(
  fileOrDataUrl: File | string,
  maxDimension = 1280,
  quality = 0.82,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()

    img.onload = () => {
      let { width, height } = img

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width)
          width = maxDimension
        } else {
          width = Math.round((width * maxDimension) / height)
          height = maxDimension
        }
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(typeof fileOrDataUrl === 'string' ? fileOrDataUrl : URL.createObjectURL(fileOrDataUrl))
        return
      }

      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, 0, 0, width, height)

      resolve(canvas.toDataURL('image/jpeg', quality))
    }

    img.onerror = (err) => reject(err)

    if (typeof fileOrDataUrl === 'string') {
      img.src = fileOrDataUrl
    } else {
      const reader = new FileReader()
      reader.onload = () => {
        img.src = reader.result as string
      }
      reader.onerror = (err) => reject(err)
      reader.readAsDataURL(fileOrDataUrl)
    }
  })
}
