import { useEffect, useRef, useState } from 'react'
import {
  Camera,
  Check,
  RefreshCw,
  RotateCcw,
  Upload,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface CameraCaptureDialogProps {
  open: boolean
  onClose: () => void
  onCapture: (dataUrl: string) => void
  onFallbackNativeCamera?: () => void
}

export function CameraCaptureDialog({
  open,
  onClose,
  onCapture,
  onFallbackNativeCamera,
}: CameraCaptureDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null)
  const [isStarting, setIsStarting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const stopTracks = (s: MediaStream | null) => {
    if (s) {
      s.getTracks().forEach((track) => track.stop())
    }
  }

  const startCamera = async (mode: 'environment' | 'user') => {
    if (typeof navigator === 'undefined' || typeof navigator.mediaDevices?.getUserMedia !== 'function') {
      setErrorMsg('Camera stream not supported in this browser. Use the native camera button.')
      return
    }

    try {
      setIsStarting(true)
      setErrorMsg(null)
      stopTracks(stream)

      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      })

      setStream(newStream)
      if (videoRef.current) {
        videoRef.current.srcObject = newStream
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('Permission') || msg.includes('NotAllowedError')) {
        setErrorMsg('Camera permission denied. Allow camera access in browser settings, or use device camera.')
      } else {
        setErrorMsg('Could not open camera stream. Try using the device camera button.')
      }
    } finally {
      setIsStarting(false)
    }
  }

  useEffect(() => {
    if (!open) {
      stopTracks(stream)
      setStream(null)
      setCapturedPreview(null)
      setErrorMsg(null)
    } else {
      void startCamera(facingMode)
    }

    return () => {
      stopTracks(stream)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, facingMode])

  const flipCamera = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment'
    setFacingMode(nextMode)
    void startCamera(nextMode)
  }

  const takeSnapshot = () => {
    const video = videoRef.current
    if (!video || !video.videoWidth) return

    const targetWidth = 1280
    const targetHeight = 720
    const canvas = document.createElement('canvas')
    canvas.width = targetWidth
    canvas.height = targetHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const videoRatio = video.videoWidth / video.videoHeight
    const targetRatio = targetWidth / targetHeight

    let sx = 0
    let sy = 0
    let sw = video.videoWidth
    let sh = video.videoHeight

    if (videoRatio > targetRatio) {
      sw = video.videoHeight * targetRatio
      sx = (video.videoWidth - sw) / 2
    } else {
      sh = video.videoWidth / targetRatio
      sy = (video.videoHeight - sh) / 2
    }

    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
    setCapturedPreview(dataUrl)

    stopTracks(stream)
    setStream(null)
  }

  const handleRetake = () => {
    setCapturedPreview(null)
    void startCamera(facingMode)
  }

  const handleConfirm = () => {
    if (capturedPreview) {
      onCapture(capturedPreview)
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg p-0 overflow-hidden rounded-2xl border-line bg-surface shadow-2xl">
        <DialogHeader className="p-4 pb-2 border-b border-line">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 text-brand">
                <Camera className="h-4 w-4" />
              </div>
              <DialogTitle className="text-base font-semibold">Take dish photo</DialogTitle>
            </div>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Capture a fresh 16:9 photo of your dish directly with your phone or tablet camera.
          </DialogDescription>
        </DialogHeader>

        <div className="p-4 space-y-4">
          {/* Camera Viewfinder / Preview */}
          <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black border border-line flex items-center justify-center shadow-inner">
            {capturedPreview ? (
              <img
                src={capturedPreview}
                alt="Captured dish"
                className="h-full w-full object-cover animate-in fade-in duration-200"
              />
            ) : errorMsg ? (
              <div className="p-6 text-center space-y-3">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20 text-amber-500">
                  <Camera className="h-5 w-5" />
                </div>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">{errorMsg}</p>
                {onFallbackNativeCamera && (
                  <Button
                    type="button"
                    onClick={() => {
                      onClose()
                      onFallbackNativeCamera()
                    }}
                    className="rounded-full bg-brand text-brand-foreground text-xs font-semibold"
                  >
                    <Upload className="mr-1.5 h-3.5 w-3.5" />
                    Open Native Camera
                  </Button>
                )}
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full object-cover"
                />

                {/* Framing Guide Overlay */}
                <div className="pointer-events-none absolute inset-3 rounded-lg border-2 border-dashed border-white/40 shadow-sm flex items-end justify-center pb-2">
                  <span className="rounded-full bg-black/60 px-2.5 py-0.5 text-[10px] font-medium text-white/90 backdrop-blur-sm">
                    Frame dish in 16:9 box
                  </span>
                </div>

                {isStarting && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white text-xs">
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin text-brand" />
                    Starting camera…
                  </div>
                )}
              </>
            )}
          </div>

          {/* Action Controls */}
          {capturedPreview ? (
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleRetake}
                className="flex-1 rounded-xl h-11 text-xs font-semibold"
              >
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                Retake
              </Button>
              <Button
                type="button"
                onClick={handleConfirm}
                className="flex-1 rounded-xl h-11 bg-brand text-brand-foreground text-xs font-semibold hover:opacity-95"
              >
                <Check className="mr-1.5 h-4 w-4" />
                Use Photo
              </Button>
            </div>
          ) : !errorMsg ? (
            <div className="flex items-center justify-between gap-3 pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={flipCamera}
                className="h-10 rounded-xl px-3 text-xs text-muted-foreground hover:text-foreground"
                title="Switch between front and back camera"
              >
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                Flip camera
              </Button>

              {/* Shutter Button */}
              <button
                type="button"
                onClick={takeSnapshot}
                disabled={isStarting}
                className="group relative flex h-14 w-14 items-center justify-center rounded-full border-4 border-brand bg-white shadow-xl transition-transform active:scale-90 hover:scale-105 disabled:opacity-50"
                title="Capture photo"
              >
                <span className="h-10 w-10 rounded-full bg-brand group-hover:bg-brand-hover transition-colors flex items-center justify-center text-brand-foreground">
                  <Camera className="h-5 w-5" />
                </span>
              </button>

              {onFallbackNativeCamera && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onClose()
                    onFallbackNativeCamera()
                  }}
                  className="h-10 rounded-xl px-3 text-xs text-muted-foreground hover:text-foreground"
                  title="Use native mobile camera app"
                >
                  <Upload className="mr-1.5 h-3.5 w-3.5" />
                  Native app
                </Button>
              )}
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
