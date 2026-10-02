import { useEffect, useRef, useState, type PointerEvent } from 'react'

type Props = {
  onChange: (dataUrl: string | null) => void
  height?: number
}

export function SignaturePad({ onChange, height = 160 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const hasInk = useRef(false)
  const [, setTick] = useState(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const ratio = window.devicePixelRatio || 1
    const width = canvas.clientWidth
    canvas.width = width * ratio
    canvas.height = height * ratio
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.scale(ratio, ratio)
    ctx.lineWidth = 2.2
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#064e3b'
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
  }, [height])

  function point(e: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function start(e: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    drawing.current = true
    canvas.setPointerCapture(e.pointerId)
    const p = point(e)
    ctx.beginPath()
    ctx.moveTo(p.x, p.y)
  }

  function move(e: PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const p = point(e)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
    hasInk.current = true
    setTick((n) => n + 1)
  }

  function end() {
    if (!drawing.current) return
    drawing.current = false
    const canvas = canvasRef.current
    if (!canvas || !hasInk.current) {
      onChange(null)
      return
    }
    onChange(canvas.toDataURL('image/png'))
  }

  function clear() {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.clientWidth, height)
    hasInk.current = false
    setTick((n) => n + 1)
    onChange(null)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-emerald-900">Signature</label>
        <button type="button" className="text-sm text-emerald-700 underline" onClick={clear}>
          Clear
        </button>
      </div>
      <canvas
        ref={canvasRef}
        className="w-full touch-none rounded-xl border border-emerald-200 bg-white"
        style={{ height }}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
      />
    </div>
  )
}
