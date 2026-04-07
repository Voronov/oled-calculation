import type { ParsedData, NormalizedData } from '../types'

/** Normalize each value column to [0, 1] using min-max normalization. */
export function normalizeData(parsed: ParsedData): NormalizedData {
  const numConditions = parsed.conditions.length

  // Compute per-condition min/max across all rows
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
