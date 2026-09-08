import type { EChartsOption } from './echarts'
import { AXIS_LABEL, AXIS_NAME } from './echarts'
import type { CalcResults, IvComputedRow, NormalizedData, XYPoint } from '../types'

export const CONDITION_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444']

type Point = [number, number | null]

function gridFor(legendRows: number): EChartsOption['grid'] {
  return { left: 58, right: 18, top: 26 + legendRows * 16, bottom: 46 }
}

function legend(): EChartsOption['legend'] {
  return {
    top: 20, left: 0, width: '78%',
    itemHeight: 8, itemWidth: 18,
    textStyle: { fontSize: 11, color: '#475569' },
  }
}

function xAxis(name: string): EChartsOption['xAxis'] {
  return {
    type: 'value',
    name,
    // fit the data instead of always starting at zero
    scale: true,
    nameLocation: 'middle',
    nameGap: 26,
    nameTextStyle: AXIS_NAME,
    axisLabel: AXIS_LABEL,
    axisLine: { lineStyle: { color: '#cbd5e1' } },
    splitLine: { lineStyle: { color: '#f1f5f9' } },
  }
}

function yAxis(name: string, extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    type: 'value',
    name,
    nameLocation: 'middle',
    nameGap: 42,
    nameTextStyle: AXIS_NAME,
    axisLabel: AXIS_LABEL,
    axisLine: { lineStyle: { color: '#cbd5e1' } },
    splitLine: { lineStyle: { color: '#f1f5f9' } },
    ...extra,
  }
}

function seriesAxis(
  name: string,
  color: string,
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  return yAxis(name, {
    nameTextStyle: { ...AXIS_NAME, color },
    axisLabel: { ...AXIS_LABEL, color },
    axisLine: { show: true, lineStyle: { color } },
    axisTick: { lineStyle: { color } },
    ...extra,
  })
}

const line = (name: string, color: string, data: Point[], extra: Record<string, unknown> = {}) => ({
  name,
  type: 'line' as const,
  data,
  color,
  lineStyle: { width: 1.5 },
  showSymbol: false,
  connectNulls: false,
  ...extra,
})

export function spectraOption(
  data: NormalizedData,
  labels: string[],
  selected: number | null,
): EChartsOption {
  return {
    grid: gridFor(1),
    legend: legend(),
    xAxis: xAxis('λ, нм'),
    yAxis: yAxis('нормована інтенсивність'),
    series: labels.map((label, i) =>
      line(
        label,
        CONDITION_COLORS[i % CONDITION_COLORS.length],
        data.rows.map(row => [row.wavelength, row.normalizedValues[i]] as Point),
        {
          lineStyle: {
            width: selected === i ? 2.5 : 1.5,
            opacity: selected === null || selected === i ? 1 : 0.25,
          },
          emphasis: { focus: 'series' },
        },
      ),
    ),
  }
}

const toPoints = (pts: XYPoint[]): Point[] => pts.map(p => [p.x, p.y])
const toGappedPoints = (pts: XYPoint[]): Point[] => pts.map(p => [p.x, p.y > 0 ? p.y : null])

export function referenceOption(
  results: CalcResults,
  which: 'eye' | 'photodiode',
): EChartsOption {
  const refPoints = which === 'eye' ? results.eyeRef : results.photoRef
  const product = which === 'eye' ? results.oledEyePoints : results.oledPhotoPoints
  const refLabel = which === 'eye' ? 'око' : 'фотодіод'

  return {
    grid: gridFor(1),
    legend: legend(),
    xAxis: xAxis('довжина хвилі, нм'),
    yAxis: yAxis('інтенсивність, у.о.'),
    series: [
      line('Інтенсивність (OLED)', '#374151', toPoints(results.oledPoints)),
      line(refLabel, '#f9a8d4', toGappedPoints(refPoints)),
      line(`Інтенсивність (OLED × ${refLabel})`, '#ef4444', toPoints(product)),
    ],
  }
}

const positive = (v: number | null): number | null => (v !== null && v > 0 ? v : null)

export function efficiencyOption(rows: IvComputedRow[]): EChartsOption {
  const at = (pick: (r: IvComputedRow) => number | null): Point[] =>
    rows.map(r => [r.b, positive(pick(r))])

  return {
    grid: { left: 62, right: 108, top: 58, bottom: 46 },
    legend: legend(),
    xAxis: xAxis('густина струму, мА/см²'),
    yAxis: [
      seriesAxis('кд/А', '#374151'),
      seriesAxis('лм/Вт', '#ef4444', { position: 'right', nameGap: 30, splitLine: { show: false } }),
      seriesAxis('%', '#2563eb', { position: 'right', offset: 52, nameGap: 30, splitLine: { show: false } }),
    ],
    series: [
      line('струмова ефективність, кд/А', '#374151', at(r => r.e), { yAxisIndex: 0 }),
      line('енергетична ефективність, лм/Вт', '#ef4444', at(r => r.f), { yAxisIndex: 1 }),
      line('зовнішня квантова ефективність, %', '#2563eb', at(r => r.g), { yAxisIndex: 2 }),
    ],
  }
}

export function sweepOption(rows: IvComputedRow[], shared = true): EChartsOption {
  const current = rows.map(r => [r.a, r.b] as Point)
  const luminance = rows.map(r => [r.a, r.c] as Point)

  const base = {
    grid: { left: 68, right: 68, top: 42, bottom: 46 },
    legend: legend(),
    xAxis: xAxis('напруга, В'),
  }

  if (!shared) {
    return {
      ...base,
      yAxis: [
        seriesAxis('густина струму, мА/см²', '#374151'),
        seriesAxis('яскравість, кд/м²', '#ef4444', { position: 'right', nameGap: 52, splitLine: { show: false } }),
      ],
      series: [
        line('густина струму, мА/см²', '#374151', current, { yAxisIndex: 0 }),
        line('яскравість, кд/м²', '#ef4444', luminance, { yAxisIndex: 1 }),
      ],
    }
  }

  const values = [...current, ...luminance]
    .map(p => p[1])
    .filter((v): v is number => v !== null && isFinite(v))
  const max = values.length ? Math.max(...values) : 1

  const sharedRange = { min: 0, max, splitNumber: 9 }
  return {
    ...base,
    yAxis: [
      yAxis('густина струму, мА/см² · яскравість, кд/м²', sharedRange),
      yAxis('', { ...sharedRange, position: 'right', splitLine: { show: false } }),
    ],
    series: [
      line('густина струму, мА/см²', '#374151', current, { yAxisIndex: 0 }),
      line('яскравість, кд/м²', '#ef4444', luminance, { yAxisIndex: 0 }),
    ],
  }
}
