import { unzipSync, strFromU8 } from 'fflate'
import type { IvData, IvBlock, IvRow } from '../types'

const UNIT_SCALES: Array<[string, number]> = [
  ['mA', 1e-3],
  ['uA', 1e-6],
  ['nA', 1e-9],
  ['pA', 1e-12],
]

const UNIT_EXPONENTS: Record<string, string> = {
  mA: 'e-3',
  uA: 'e-6',
  nA: 'e-9',
  pA: 'e-12',
}

const RAW_LINE = /^\s*(-?[\d.]+)V\s+(-?[\d.]+(?:mA|uA|nA|pA|A))\s+(-?[\d.]+(?:mA|uA|nA|pA|A))\s*$/

const NUMBER_CELL = /^-?[\d.]+(?:e[+-]?\d+)?$/i

const PARAGRAPH = /<w:p(?: [^>]*)?\/>|<w:p(?: [^>]*)?>[\s\S]*?<\/w:p>/g
const TABLE_ROW = /<w:tr(?: [^>]*)?>[\s\S]*?<\/w:tr>/g
const TEXT_NODE = /<w:t(?: [^>]*)?>([\s\S]*?)<\/w:t>/g

function unescapeXml(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
}

function textOf(fragment: string): string {
  let out = ''
  for (const m of fragment.matchAll(TEXT_NODE)) out += m[1]
  return unescapeXml(out)
}

function parseCurrent(token: string): { value: number; text: string } {
  for (const [unit, scale] of UNIT_SCALES) {
    if (token.endsWith(unit)) {
      const mantissa = token.slice(0, -unit.length)
      return { value: parseFloat(mantissa) * scale, text: mantissa + UNIT_EXPONENTS[unit] }
    }
  }
  const bare = token.endsWith('A') ? token.slice(0, -1) : token
  return { value: parseFloat(bare), text: bare }
}

function rowFromRaw(match: RegExpMatchArray): IvRow {
  const i1 = parseCurrent(match[2])
  const i2 = parseCurrent(match[3])
  return {
    v: parseFloat(match[1]),
    i1: i1.value,
    i2: i2.value,
    text: [match[1], i1.text, i2.text],
  }
}

function rowsFromTables(xml: string): IvBlock[] {
  const blocks: IvBlock[] = []
  for (const table of xml.match(/<w:tbl>[\s\S]*?<\/w:tbl>/g) ?? []) {
    const rows: IvRow[] = []
    for (const rowMatch of table.matchAll(TABLE_ROW)) {
      const cells = rowMatch[0]
        .split('<w:tc>')
        .slice(1)
        .map(c => textOf(c).trim())
      if (cells.length !== 3 || !cells.every(c => NUMBER_CELL.test(c))) continue
      rows.push({
        v: parseFloat(cells[0]),
        i1: parseFloat(cells[1]),
        i2: parseFloat(cells[2]),
        text: [cells[0], cells[1], cells[2]],
      })
    }
    if (rows.length) blocks.push({ index: blocks.length + 1, rows })
  }
  return blocks
}

function rowsFromParagraphs(xml: string): IvBlock[] {
  const blocks: IvBlock[] = []
  let current: IvRow[] = []

  for (const paragraph of xml.matchAll(PARAGRAPH)) {
    const match = textOf(paragraph[0]).match(RAW_LINE)
    if (match) {
      current.push(rowFromRaw(match))
    } else if (current.length) {
      blocks.push({ index: blocks.length + 1, rows: current })
      current = []
    }
  }
  if (current.length) blocks.push({ index: blocks.length + 1, rows: current })
  return blocks
}

// reads both the raw instrument export and a document already turned into tables
export function parseIvDocx(buffer: ArrayBuffer, fileName: string): IvData {
  let files: Record<string, Uint8Array>
  try {
    files = unzipSync(new Uint8Array(buffer))
  } catch {
    throw new Error('Файл не читається як .docx.')
  }

  const entry = files['word/document.xml']
  if (!entry) throw new Error('Немає word/document.xml — це точно документ Word?')

  const xml = strFromU8(entry)
  const blocks = rowsFromParagraphs(xml)
  const fromTables = rowsFromTables(xml)

  const all = blocks.length >= fromTables.length ? blocks : fromTables
  if (all.length === 0) throw new Error('У документі не знайдено блоків вимірювань.')

  return { fileName, blocks: all.map((b, i) => ({ ...b, index: i + 1 })) }
}
