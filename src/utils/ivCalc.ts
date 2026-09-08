import type { IvBlock, IvComputedRow, IvParams, NormalizedData } from '../types'

export type ResolvedIvParams = Omit<IvParams, 'lambdaNm'> & { lambdaNm: number }

export const DEFAULT_IV_PARAMS: IvParams = {
  area: 6e-2,
  photoFactor: -0.4,
  lambdaNm: null,
}

const PI = 3.14
const ELEMENTARY_CHARGE = 1.6e-19
const PLANCK = 6.0e-34
const LIGHT_SPEED = 3e8

const PEAK_TOLERANCE = 0.005

export const SATURATION_WIDTH_NM = 20

export interface PeakInfo {
  lambdaNm: number
  widthNm: number
  saturated: boolean
}

export function peakInfo(data: NormalizedData, conditionIndex: number): PeakInfo {
  let max = -Infinity
  for (const row of data.rows) {
    const v = row.normalizedValues[conditionIndex]
    if (v > max) max = v
  }

  const threshold = max - PEAK_TOLERANCE * Math.abs(max)
  const onPeak = data.rows.filter(r => r.normalizedValues[conditionIndex] >= threshold)

  const first = onPeak[0].wavelength
  const last = onPeak[onPeak.length - 1].wavelength

  return {
    lambdaNm: (first + last) / 2,
    widthNm: last - first,
    saturated: last - first > SATURATION_WIDTH_NM,
  }
}

export function peakWavelength(data: NormalizedData, conditionIndex: number): number {
  return peakInfo(data, conditionIndex).lambdaNm
}

export function findTurnOn(luminanceRaw: number[]): number {
  for (let i = luminanceRaw.length - 1; i >= 0; i--) {
    if (luminanceRaw[i] <= 0) return i + 1
  }
  return 0
}

export function autoBaseline(luminanceRaw: number[]): number {
  const turnOn = findTurnOn(luminanceRaw)
  return turnOn > 0 ? Math.abs(luminanceRaw[turnOn - 1]) : 0
}

export function luminanceRawOf(block: IvBlock, Lv: number, params: ResolvedIvParams): number[] {
  return block.rows.map(r => r.i2 * params.photoFactor * Lv)
}

export interface IvBlockResult {
  rows: IvComputedRow[]
  baseline: number
  turnOnIndex: number
}

export function computeIvBlock(
  block: IvBlock,
  Kr: number,
  Lv: number,
  params: ResolvedIvParams,
  baselineOverride?: number,
): IvBlockResult {
  const luminanceRaw = luminanceRawOf(block, Lv, params)
  const turnOnIndex = findTurnOn(luminanceRaw)
  // below the turn-on point the photodiode reads only dark current
  const baseline = baselineOverride ?? autoBaseline(luminanceRaw)

  const lambdaMeters = params.lambdaNm * 1e-9
  const eqeFactor = (PI * ELEMENTARY_CHARGE * lambdaMeters * 100) / (Kr * PLANCK * LIGHT_SPEED)

  const rows = block.rows.map((row, i) => {
    const a = row.v
    const b = (row.i1 * 1000) / params.area
    const d = b

    const shifted = luminanceRaw[i] - baseline
    const c = i < turnOnIndex || shifted < 0 ? null : shifted

    const e = c === null || d === 0 ? null : (c / d) * 0.1
    const f = e === null || a === 0 ? null : (e * PI) / a
    const g = e === null ? null : e * eqeFactor

    return { a, b, c, d, e, f, g }
  })

  return { rows, baseline, turnOnIndex }
}
