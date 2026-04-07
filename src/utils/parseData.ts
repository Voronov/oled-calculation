import type { ParsedData, DataRow } from '../types'

/** Parse a tab-separated OLED data file.
 *  Each row: wl, val, wl, val, wl, val, wl, val, wl, val  (10 columns)
 *  Conditions header numbers are inferred from the first row column count.
 */
export function parseOledFile(text: string, fileName: string): ParsedData {
  const lines = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter(l => l.trim() !== '')

  const rows: DataRow[] = []

  for (const line of lines) {
    const cols = line.split('\t').map(c => parseFloat(c.trim()))
    if (cols.length < 2 || cols.some(isNaN)) continue

    const wavelengths: number[] = []
    const values: number[] = []

    for (let i = 0; i < cols.length; i += 2) {
      if (i + 1 < cols.length) {
        wavelengths.push(cols[i])
        values.push(cols[i + 1])
      }
    }

    rows.push({ wavelengths, values })
  }

  if (rows.length === 0) throw new Error('No valid data rows found in file.')

  const numConditions = rows[0].wavelengths.length
  // Default condition labels matching the image (6, 8, 10, 8, 10)
  const defaultLabels = [6, 8, 10, 8, 10]
  const conditions = defaultLabels.slice(0, numConditions)

  return { fileName, conditions, rows }
}
