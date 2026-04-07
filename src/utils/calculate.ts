import type { XYPoint, ReferenceData, CalcResults, NormalizedData } from '../types'

/** Parse oled2.txt text → ReferenceData (cols 3-4 = eye, cols 5-6 = photodiode) */
export function parseReferenceData(text: string): ReferenceData {
  const eye: XYPoint[] = []
  const photodiode: XYPoint[] = []

  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')

  for (const line of lines) {
    if (!line.trim()) continue
    const cols = line.split('\t').map(s => s.trim())

    const x2 = parseFloat(cols[2])
    const y2 = parseFloat(cols[3])
    if (isFinite(x2) && isFinite(y2)) eye.push({ x: x2, y: y2 })

    const x3 = parseFloat(cols[4])
    const y3 = parseFloat(cols[5])
    if (isFinite(x3) && isFinite(y3)) photodiode.push({ x: x3, y: y3 })
  }

  return { eye, photodiode }
}

/** Linear interpolation — returns 0 outside the reference range */
function interp(ref: XYPoint[], x: number): number {
  if (ref.length === 0) return 0
  if (x < ref[0].x || x > ref[ref.length - 1].x) return 0
  let lo = 0
  let hi = ref.length - 1
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1
    if (ref[mid].x <= x) lo = mid
    else hi = mid
  }
  if (ref[lo].x === x) return ref[lo].y
  const t = (x - ref[lo].x) / (ref[hi].x - ref[lo].x)
  return ref[lo].y + t * (ref[hi].y - ref[lo].y)
}

/** Trapezoidal integration of XYPoint array (must be sorted by x) */
function trapz(pts: XYPoint[]): number {
  let area = 0
  for (let i = 0; i < pts.length - 1; i++) {
    area += ((pts[i].y + pts[i + 1].y) / 2) * (pts[i + 1].x - pts[i].x)
  }
  return area
}

/** Multiply two curves — interpolates ref onto oled's x grid */
function multiplyWithRef(oled: XYPoint[], ref: XYPoint[]): XYPoint[] {
  return oled.map(pt => ({ x: pt.x, y: pt.y * interp(ref, pt.x) }))
}

export function computeResults(
  normalizedData: NormalizedData,
  conditionIndex: number,
  ref: ReferenceData,
): CalcResults {
  const oledPoints: XYPoint[] = normalizedData.rows.map(row => ({
    x: row.wavelength,
    y: row.normalizedValues[conditionIndex],
  }))

  const oledEyePoints = multiplyWithRef(oledPoints, ref.eye)
  const oledPhotoPoints = multiplyWithRef(oledPoints, ref.photodiode)

  const T2 = trapz(oledPoints)
  const T1 = trapz(oledEyePoints)
  const T0 = trapz(oledPhotoPoints)
  const Kr = 683 * (T1 / T2)
  const FF = T0 / T2

  // Project reference curves onto the OLED X grid so charts can overlay them
  const eyeOnOledGrid: XYPoint[] = oledPoints.map(pt => {
    const v = interp(ref.eye, pt.x)
    return { x: pt.x, y: v }
  })
  const photoOnOledGrid: XYPoint[] = oledPoints.map(pt => {
    const v = interp(ref.photodiode, pt.x)
    return { x: pt.x, y: v }
  })

  return {
    T2, T1, T0, Kr, FF,
    oledPoints,
    eyeRef: eyeOnOledGrid,
    photoRef: photoOnOledGrid,
    oledEyePoints,
    oledPhotoPoints,
  }
}

/** Down-sample an XYPoint array to at most maxPts for chart rendering */
export function downsample(pts: XYPoint[], maxPts = 400): XYPoint[] {
  if (pts.length <= maxPts) return pts
  const step = Math.ceil(pts.length / maxPts)
  return pts.filter((_, i) => i % step === 0)
}
