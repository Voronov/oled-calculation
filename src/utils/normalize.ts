import type { ParsedData, NormalizedData } from '../types'

export function normalizeData(parsed: ParsedData): NormalizedData {
  const numConditions = parsed.conditions.length

  const stats = parsed.conditions.map((_, ci) => {
    const vals = parsed.rows.map(r => r.values[ci]).filter(v => isFinite(v))
    return {
      min: Math.min(...vals),
      max: Math.max(...vals),
    }
  })

  const rows = parsed.rows.map(row => {
    const normalizedValues = Array.from({ length: numConditions }, (_, ci) => {
      const { min, max } = stats[ci]
      const range = max - min
      if (range === 0) return 0
      return (row.values[ci] - min) / range
    })
    return {
      // every wavelength column in a row holds the same value
      wavelength: row.wavelengths[0], // all wavelength columns are the same per row
      normalizedValues,
    }
  })

  return {
    conditions: parsed.conditions,
    rows,
    stats,
  }
}
