import { spectralLocus, xyToSrgb, D65, type Chromaticity } from '../utils/colorimetry'

export const CIE_W = 560
export const CIE_H = 500
const W = CIE_W
const H = CIE_H
const PAD = { left: 54, right: 14, top: 14, bottom: 46 }

const TICKS = [460, 470, 480, 490, 500, 510, 520, 530, 540, 550, 560, 570, 580, 590, 600, 620, 700]

export type CieSpace = '1931' | '1976'

interface Space {
  title: string
  xLabel: string
  yLabel: string
  xMax: number
  yMax: number
  from: (c: Chromaticity) => Chromaticity
  to: (c: Chromaticity) => Chromaticity
}

export const SPACES: Record<CieSpace, Space> = {
  '1931': {
    title: 'Діаграма колірності CIE 1931 (x, y)',
    xLabel: 'x',
    yLabel: 'y',
    xMax: 0.8,
    yMax: 0.9,
    from: c => c,
    to: c => c,
  },
  '1976': {
    title: "Діаграма колірності CIE 1976 UCS (u′, v′)",
    xLabel: 'u′',
    yLabel: 'v′',
    xMax: 0.65,
    yMax: 0.6,
    from: ({ x, y }) => {
      const d = -2 * x + 12 * y + 3
      return { x: (4 * x) / d, y: (9 * y) / d }
    },
    to: ({ x: u, y: v }) => {
      const d = 6 * u - 16 * v + 12
      return { x: (9 * u) / d, y: (4 * v) / d }
    },
  },
}

function insidePolygon(x: number, y: number, poly: Chromaticity[]): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]
    const b = poly[j]
    if ((a.y > y) !== (b.y > y) && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside
    }
  }
  return inside
}

export function drawCieDiagram(
  ctx: CanvasRenderingContext2D,
  space: CieSpace,
  sample: Chromaticity | null,
  boundary: Chromaticity | null,
) {
  const s = SPACES[space]
  const toPx = (x: number, y: number): [number, number] => [
    PAD.left + (x / s.xMax) * (W - PAD.left - PAD.right),
    H - PAD.bottom - (y / s.yMax) * (H - PAD.top - PAD.bottom),
  ]

  const locus = spectralLocus().map(p => ({ ...p, ...s.from(p) }))

  ctx.clearRect(0, 0, W, H)
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, W, H)

  const [x0] = toPx(0, 0)
  const [x1] = toPx(s.xMax, 0)
  const [, yTop] = toPx(0, s.yMax)
  const [, yBottom] = toPx(0, 0)

  const plotW = Math.ceil(x1 - x0)
  const plotH = Math.ceil(yBottom - yTop)

  // putImageData ignores the canvas transform, so draw the fill from its own canvas
  const fill = document.createElement('canvas')
  fill.width = plotW
  fill.height = plotH
  const fillCtx = fill.getContext('2d')!
  const image = fillCtx.createImageData(plotW, plotH)
  const { data } = image

  for (let py = 0; py < plotH; py++) {
    const dy = ((plotH - py) / plotH) * s.yMax
    for (let px = 0; px < plotW; px++) {
      const dx = (px / plotW) * s.xMax
      if (!insidePolygon(dx, dy, locus)) continue

      const chroma = s.to({ x: dx, y: dy })
      const rgb = xyToSrgb(chroma.x, chroma.y)
      if (!rgb) continue

      const offset = (py * plotW + px) * 4
      data[offset] = rgb[0]
      data[offset + 1] = rgb[1]
      data[offset + 2] = rgb[2]
      data[offset + 3] = 255
    }
  }
  fillCtx.putImageData(image, 0, 0)
  ctx.drawImage(fill, x0, yTop, plotW, plotH)

  const step = 0.1
  ctx.strokeStyle = '#cbd5e1'
  ctx.fillStyle = '#64748b'
  ctx.lineWidth = 1
  ctx.font = '11px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'

  for (let value = 0; value <= s.xMax + 1e-9; value += step) {
    const [px] = toPx(value, 0)
    ctx.beginPath()
    ctx.moveTo(px, yBottom)
    ctx.lineTo(px, yBottom + 4)
    ctx.stroke()
    ctx.fillText(value.toFixed(1), px, yBottom + 7)
  }

  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  for (let value = 0; value <= s.yMax + 1e-9; value += step) {
    const [, py] = toPx(0, value)
    ctx.beginPath()
    ctx.moveTo(x0 - 4, py)
    ctx.lineTo(x0, py)
    ctx.stroke()
    ctx.fillText(value.toFixed(1), x0 - 7, py)
  }

  ctx.strokeStyle = '#94a3b8'
  ctx.beginPath()
  ctx.moveTo(x0, yTop)
  ctx.lineTo(x0, yBottom)
  ctx.lineTo(x1, yBottom)
  ctx.stroke()

  ctx.fillStyle = '#475569'
  ctx.font = '12px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'bottom'
  ctx.fillText(s.xLabel, (x0 + x1) / 2, H - 6)
  ctx.save()
  ctx.translate(14, (yTop + yBottom) / 2)
  ctx.rotate(-Math.PI / 2)
  ctx.fillText(s.yLabel, 0, 0)
  ctx.restore()

  ctx.strokeStyle = '#1a1a1a'
  ctx.lineWidth = 1.4
  ctx.beginPath()
  locus.forEach((p, i) => {
    const [px, py] = toPx(p.x, p.y)
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  })
  ctx.closePath()
  ctx.stroke()

  ctx.font = '9px system-ui, sans-serif'
  ctx.textBaseline = 'middle'

  const centre = s.from({ x: 0.33, y: 0.33 })
  const [cx, cy] = toPx(centre.x, centre.y)

  for (const nm of TICKS) {
    const p = locus.find(l => l.lambda === nm)
    if (!p) continue
    const [px, py] = toPx(p.x, p.y)

    const len = Math.hypot(px - cx, py - cy) || 1
    const ox = ((px - cx) / len) * 13
    const oy = ((py - cy) / len) * 13

    ctx.strokeStyle = '#1a1a1a'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(px, py)
    ctx.lineTo(px + ox * 0.4, py + oy * 0.4)
    ctx.stroke()

    ctx.fillStyle = '#1a1a1a'
    ctx.textAlign = ox < -2 ? 'right' : ox > 2 ? 'left' : 'center'
    ctx.fillText(String(nm), px + ox, py + oy)
  }

  const white = s.from(D65)

  if (sample && boundary) {
    const p = s.from(sample)
    const b = s.from(boundary)
    const [sx, sy] = toPx(p.x, p.y)
    const [wx, wy] = toPx(white.x, white.y)
    const [bx, by] = toPx(b.x, b.y)

    ctx.setLineDash([4, 3])
    ctx.strokeStyle = '#1a1a1a'
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.moveTo(wx, wy)
    ctx.lineTo(sx, sy)
    ctx.lineTo(bx, by)
    ctx.stroke()
    ctx.setLineDash([])
  }

  const marker = (c: Chromaticity, label: string) => {
    const [px, py] = toPx(c.x, c.y)
    ctx.beginPath()
    ctx.arc(px, py, 5, 0, Math.PI * 2)
    ctx.fillStyle = '#ffffff'
    ctx.fill()
    ctx.strokeStyle = '#1a1a1a'
    ctx.lineWidth = 1.5
    ctx.stroke()

    ctx.fillStyle = '#1a1a1a'
    ctx.font = 'bold 11px system-ui, sans-serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'bottom'
    ctx.fillText(label, px + 8, py - 4)
  }

  marker(white, 'D65')
  if (sample) {
    const p = s.from(sample)
    const digits = space === '1931' ? 4 : 4
    marker(p, `${p.x.toFixed(digits)}, ${p.y.toFixed(digits)}`)
  }
}

export function cieDataUrl(
  space: CieSpace,
  sample: Chromaticity | null,
  boundary: Chromaticity | null,
): string {
  const canvas = document.createElement('canvas')
  canvas.width = W * 2
  canvas.height = H * 2
  const ctx = canvas.getContext('2d')!
  ctx.scale(2, 2)
  drawCieDiagram(ctx, space, sample, boundary)
  return canvas.toDataURL('image/png')
}

export const spaceTitle = (space: CieSpace) => SPACES[space].title
