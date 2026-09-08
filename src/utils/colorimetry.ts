import type { XYPoint } from '../types'

// CIE 1931 standard observer, 2 degrees, 380-780 nm, step 5 nm: lambda, x, y, z
const CMF: Array<[number, number, number, number]> = [
  [380, 0.001368, 0.000039, 0.006450],
  [385, 0.002236, 0.000064, 0.010550],
  [390, 0.004243, 0.000120, 0.020050],
  [395, 0.007650, 0.000217, 0.036210],
  [400, 0.014310, 0.000396, 0.067850],
  [405, 0.023190, 0.000640, 0.110200],
  [410, 0.043510, 0.001210, 0.207400],
  [415, 0.077630, 0.002180, 0.371300],
  [420, 0.134380, 0.004000, 0.645600],
  [425, 0.214770, 0.007300, 1.039050],
  [430, 0.283900, 0.011600, 1.385600],
  [435, 0.328500, 0.016840, 1.622960],
  [440, 0.348280, 0.023000, 1.747060],
  [445, 0.348060, 0.029800, 1.782600],
  [450, 0.336200, 0.038000, 1.772110],
  [455, 0.318700, 0.048000, 1.744100],
  [460, 0.290800, 0.060000, 1.669200],
  [465, 0.251100, 0.073900, 1.528100],
  [470, 0.195360, 0.090980, 1.287640],
  [475, 0.142100, 0.112600, 1.041900],
  [480, 0.095640, 0.139020, 0.812950],
  [485, 0.057950, 0.169300, 0.616200],
  [490, 0.032010, 0.208020, 0.465180],
  [495, 0.014700, 0.258600, 0.353300],
  [500, 0.004900, 0.323000, 0.272000],
  [505, 0.002400, 0.407300, 0.212300],
  [510, 0.009300, 0.503000, 0.158200],
  [515, 0.029100, 0.608200, 0.111700],
  [520, 0.063270, 0.710000, 0.078250],
  [525, 0.109600, 0.793200, 0.057250],
  [530, 0.165500, 0.862000, 0.042160],
  [535, 0.225750, 0.914850, 0.029840],
  [540, 0.290400, 0.954000, 0.020300],
  [545, 0.359700, 0.980300, 0.013400],
  [550, 0.433450, 0.994950, 0.008750],
  [555, 0.512050, 1.000000, 0.005750],
  [560, 0.594500, 0.995000, 0.003900],
  [565, 0.678400, 0.978600, 0.002750],
  [570, 0.762100, 0.952000, 0.002100],
  [575, 0.842500, 0.915400, 0.001800],
  [580, 0.916300, 0.870000, 0.001650],
  [585, 0.978600, 0.816300, 0.001400],
  [590, 1.026300, 0.757000, 0.001100],
  [595, 1.056700, 0.694900, 0.001000],
  [600, 1.062200, 0.631000, 0.000800],
  [605, 1.045600, 0.566800, 0.000600],
  [610, 1.002600, 0.503000, 0.000340],
  [615, 0.938400, 0.441200, 0.000240],
  [620, 0.854450, 0.381000, 0.000190],
  [625, 0.751400, 0.321000, 0.000100],
  [630, 0.642400, 0.265000, 0.000050],
  [635, 0.541900, 0.217000, 0.000030],
  [640, 0.447900, 0.175000, 0.000020],
  [645, 0.360800, 0.138200, 0.000010],
  [650, 0.283500, 0.107000, 0.000000],
  [655, 0.218700, 0.081600, 0.000000],
  [660, 0.164900, 0.061000, 0.000000],
  [665, 0.121200, 0.044580, 0.000000],
  [670, 0.087400, 0.032000, 0.000000],
  [675, 0.063600, 0.023200, 0.000000],
  [680, 0.046770, 0.017000, 0.000000],
  [685, 0.032900, 0.011920, 0.000000],
  [690, 0.022700, 0.008210, 0.000000],
  [695, 0.015840, 0.005723, 0.000000],
  [700, 0.011359, 0.004102, 0.000000],
  [705, 0.008111, 0.002929, 0.000000],
  [710, 0.005790, 0.002091, 0.000000],
  [715, 0.004109, 0.001484, 0.000000],
  [720, 0.002899, 0.001047, 0.000000],
  [725, 0.002049, 0.000740, 0.000000],
  [730, 0.001440, 0.000520, 0.000000],
  [735, 0.001000, 0.000361, 0.000000],
  [740, 0.000690, 0.000249, 0.000000],
  [745, 0.000476, 0.000172, 0.000000],
  [750, 0.000332, 0.000120, 0.000000],
  [755, 0.000235, 0.000085, 0.000000],
  [760, 0.000166, 0.000060, 0.000000],
  [765, 0.000117, 0.000042, 0.000000],
  [770, 0.000083, 0.000030, 0.000000],
  [775, 0.000059, 0.000021, 0.000000],
  [780, 0.000042, 0.000015, 0.000000],
]

const CMF_MIN = CMF[0][0]
const CMF_MAX = CMF[CMF.length - 1][0]
const CMF_STEP = 5

export const D65: Chromaticity = { x: 0.31272, y: 0.32903 }

export interface Chromaticity {
  x: number
  y: number
}

export interface Colorimetry {
  X: number
  Y: number
  Z: number
  x: number
  y: number
  u: number
  v: number
  dominantNm: number | null
  purity: number | null
  cct: number | null
  duv: number | null
  boundary: Chromaticity | null
}

function cmfAt(lambda: number): [number, number, number] {
  if (lambda < CMF_MIN || lambda > CMF_MAX) return [0, 0, 0]

  const pos = (lambda - CMF_MIN) / CMF_STEP
  const i = Math.min(Math.floor(pos), CMF.length - 2)
  const t = pos - i
  const a = CMF[i]
  const b = CMF[i + 1]

  return [
    a[1] + t * (b[1] - a[1]),
    a[2] + t * (b[2] - a[2]),
    a[3] + t * (b[3] - a[3]),
  ]
}

export function spectrumToXYZ(spectrum: XYPoint[]): { X: number; Y: number; Z: number } {
  let X = 0
  let Y = 0
  let Z = 0

  for (let i = 0; i < spectrum.length - 1; i++) {
    const a = spectrum[i]
    const b = spectrum[i + 1]
    const dLambda = b.x - a.x
    if (dLambda <= 0) continue

    const ca = cmfAt(a.x)
    const cb = cmfAt(b.x)

    X += ((a.y * ca[0] + b.y * cb[0]) / 2) * dLambda
    Y += ((a.y * ca[1] + b.y * cb[1]) / 2) * dLambda
    Z += ((a.y * ca[2] + b.y * cb[2]) / 2) * dLambda
  }

  return { X, Y, Z }
}

export function spectralLocus(): Array<Chromaticity & { lambda: number }> {
  return CMF.map(([lambda, xb, yb, zb]) => {
    const sum = xb + yb + zb
    return { lambda, x: xb / sum, y: yb / sum }
  })
}

function mccamyCct(x: number, y: number): number | null {
  const denominator = 0.1858 - y
  if (denominator === 0) return null
  const n = (x - 0.3320) / denominator
  return 449 * n ** 3 + 3525 * n ** 2 + 6823.3 * n + 5520.33
}

function planckianXy(T: number): Chromaticity {
  const t = 1000 / T
  let x: number
  if (T < 4000) {
    x = -0.2661239 * t ** 3 - 0.2343589 * t ** 2 + 0.8776956 * t + 0.179910
  } else {
    x = -3.0258469 * t ** 3 + 2.1070379 * t ** 2 + 0.2226347 * t + 0.240390
  }

  let y: number
  if (T < 2222) {
    y = -1.1063814 * x ** 3 - 1.34811020 * x ** 2 + 2.18555832 * x - 0.20219683
  } else if (T < 4000) {
    y = -0.9549476 * x ** 3 - 1.37418593 * x ** 2 + 2.09137015 * x - 0.16748867
  } else {
    y = 3.0817580 * x ** 3 - 5.87338670 * x ** 2 + 3.75112997 * x - 0.37001483
  }

  return { x, y }
}

const toUv = ({ x, y }: Chromaticity) => {
  const d = -2 * x + 12 * y + 3
  return { u: (4 * x) / d, v: (6 * y) / d }
}

function duvFrom(x: number, y: number, cct: number): number {
  const sample = toUv({ x, y })
  const locus = toUv(planckianXy(cct))
  const dist = Math.hypot(sample.u - locus.u, sample.v - locus.v)
  return sample.v >= locus.v ? dist : -dist
}

function dominantAndPurity(
  x: number,
  y: number,
  white: Chromaticity,
): { dominantNm: number | null; purity: number | null; boundary: Chromaticity | null } {
  const dx = x - white.x
  const dy = y - white.y
  if (dx === 0 && dy === 0) return { dominantNm: null, purity: 0, boundary: null }

  const locus = spectralLocus()

  const cross = (dirX: number, dirY: number) => {
    for (let i = 0; i < locus.length; i++) {
      const p = locus[i]
      const q = locus[(i + 1) % locus.length]   // wrapping edge is the line of purples
      const sx = q.x - p.x
      const sy = q.y - p.y

      const denominator = dirX * sy - dirY * sx
      if (denominator === 0) continue

      const t = ((p.x - white.x) * sy - (p.y - white.y) * sx) / denominator
      const s = ((p.x - white.x) * dirY - (p.y - white.y) * dirX) / denominator
      if (t < 0 || s < 0 || s > 1) continue

      return {
        onLocus: i < locus.length - 1,
        lambda: p.lambda + s * (q.lambda - p.lambda),
        distance: t * Math.hypot(dirX, dirY),
        point: { x: white.x + t * dirX, y: white.y + t * dirY },
      }
    }
    return null
  }

  // the ray can leave through the purple line, then the colour has no dominant wavelength
  const forward = cross(dx, dy)
  if (!forward) return { dominantNm: null, purity: null, boundary: null }

  const purity = Math.hypot(dx, dy) / forward.distance

  if (forward.onLocus) return { dominantNm: forward.lambda, purity, boundary: forward.point }

  const backward = cross(-dx, -dy)
  return {
    dominantNm: backward?.onLocus ? -backward.lambda : null,
    purity,
    boundary: forward.point,
  }
}

export function analyzeColor(spectrum: XYPoint[], white: Chromaticity = D65): Colorimetry {
  const { X, Y, Z } = spectrumToXYZ(spectrum)
  const sum = X + Y + Z

  if (sum <= 0) {
    return { X, Y, Z, x: 0, y: 0, u: 0, v: 0, dominantNm: null, purity: null, cct: null, duv: null, boundary: null }
  }

  const x = X / sum
  const y = Y / sum

  const denominator = X + 15 * Y + 3 * Z
  const u = (4 * X) / denominator
  const v = (9 * Y) / denominator

  const { dominantNm, purity, boundary } = dominantAndPurity(x, y, white)
  const cct = mccamyCct(x, y)

  return {
    X, Y, Z, x, y, u, v,
    dominantNm,
    purity,
    boundary,
    cct: cct !== null && cct > 0 && cct < 1e6 ? cct : null,
    duv: cct !== null && cct > 1000 && cct < 25000 ? duvFrom(x, y, cct) : null,
  }
}

export function xyToSrgb(x: number, y: number): [number, number, number] | null {
  if (y <= 0) return null

  const X = x / y
  const Y = 1
  const Z = (1 - x - y) / y

  let r = 3.2406 * X - 1.5372 * Y - 0.4986 * Z
  let g = -0.9689 * X + 1.8758 * Y + 0.0415 * Z
  let b = 0.0557 * X - 0.2040 * Y + 1.0570 * Z

  const min = Math.min(r, g, b)
  if (min < 0) {
    r -= min
    g -= min
    b -= min
  }

  const max = Math.max(r, g, b)
  if (max <= 0) return null
  r /= max
  g /= max
  b /= max

  const gamma = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055)

  return [
    Math.round(255 * gamma(r)),
    Math.round(255 * gamma(g)),
    Math.round(255 * gamma(b)),
  ]
}
