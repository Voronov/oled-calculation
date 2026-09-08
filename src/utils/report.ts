import katex from 'katex'
import { renderToDataUrl } from '../charts/echarts'
import {
  spectraOption,
  referenceOption,
  efficiencyOption,
  sweepOption,
} from '../charts/options'
import { TEX } from '../charts/tex'
import { analyzeColor } from './colorimetry'
import { cieDataUrl } from '../charts/cie'
import { computeIvBlock, type ResolvedIvParams } from './ivCalc'
import type { CalcResults, IvBlock, IvComputedRow, LvParams, NormalizedData, ParsedData } from '../types'

export interface ReportInput {
  ivBaselines: Record<number, number>
  parsed: ParsedData
  ivFileName: string | null
  normalized: NormalizedData
  conditionLabels: string[]
  selectedConditionIndex: number
  results: CalcResults
  lvParams: LvParams
  Lv: number
  ivBlocks: IvBlock[]
  ivParams: ResolvedIvParams
}

function math(tex: string): string {
  return katex.renderToString(tex, { throwOnError: false, output: 'mathml' })
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function fmt(v: number | null): string {
  if (v === null || !isFinite(v)) return '—'
  const abs = Math.abs(v)
  if (abs !== 0 && (abs >= 1e5 || abs < 1e-3)) return v.toExponential(3)
  return v.toFixed(4)
}

const figure = (title: string, dataUrl: string) =>
  `<figure><img src="${dataUrl}" alt="${escapeHtml(title)}"><figcaption>${escapeHtml(title)}</figcaption></figure>`

function table(headers: string[], rows: string[][], firstColumnLeft = true): string {
  const head = headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')
  const body = rows
    .map(r => `<tr>${r.map(c => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`)
    .join('')
  return `<table class="${firstColumnLeft ? 'lead-left' : ''}"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`
}

function derivation(tex: string, substituted: string, result: string, unit = ''): string {
  return `<div class="derive">
    <span class="derive__formula">${math(tex)}</span>
    <span class="derive__sub">${escapeHtml(substituted)}</span>
    <span class="derive__result">${escapeHtml(result)}<span class="derive__unit">${escapeHtml(unit)}</span></span>
  </div>`
}

const IV_COLUMNS: Array<{ key: keyof IvComputedRow; head: string }> = [
  { key: 'a', head: 'A — напруга, В' },
  { key: 'b', head: 'B — густина струму, мА/см²' },
  { key: 'c', head: 'C — яскравість, кд/м²' },
  { key: 'd', head: 'D — = B' },
  { key: 'e', head: 'E — струмова ефективність, кд/А' },
  { key: 'f', head: 'F — енергетична ефективність, лм/Вт' },
  { key: 'g', head: 'G — EQE, %' },
]

function summarize(rows: IvComputedRow[]) {
  const best = (pick: (r: IvComputedRow) => number | null) => {
    const values = rows.map(pick).filter((v): v is number => v !== null && isFinite(v))
    return values.length ? Math.max(...values) : null
  }
  return {
    maxJ: best(r => r.b),
    maxL: best(r => r.c),
    maxCE: best(r => r.e),
    maxPE: best(r => r.f),
    maxEQE: best(r => r.g),
  }
}

export function buildReportHtml(input: ReportInput): string {
  const {
    parsed, ivFileName, normalized, conditionLabels, selectedConditionIndex,
    results, lvParams, Lv, ivBlocks, ivParams, ivBaselines,
  } = input

  const { T2, T1, T0, Kr, FF } = results
  const condition = conditionLabels[selectedConditionIndex]
  const stats = normalized.stats[selectedConditionIndex]
  const generated = new Date().toLocaleString('uk-UA')

  const inputTable = table(
    ['Файл', 'Вміст'],
    [
      [parsed.fileName, `${parsed.rows.length} точок · ${parsed.conditions.length} наборів · λ ${parsed.rows[0].wavelengths[0]}–${parsed.rows[parsed.rows.length - 1].wavelengths[0]} нм`],
      ...(ivFileName
        ? [[ivFileName, `${ivBlocks.length} вимірів · по ${ivBlocks[0].rows.length} точок · ${ivBlocks[0].rows[0].v}–${ivBlocks[0].rows[ivBlocks[0].rows.length - 1].v} В`]]
        : []),
      ['oled2.txt (вбудований)', 'довідкові криві чутливості ока V(λ) та фотодіода'],
    ],
  )

  const selectionTable = table(
    ['Параметр', 'Значення'],
    [
      ['Набір, узятий для розрахунку', condition],
      ['Сирий діапазон цієї колонки', `мін ${stats.min} · макс ${stats.max}`],
      ['Нормування', 'мін-макс до [0, 1] по колонці'],
      ['Пік випромінювання λ', `${ivParams.lambdaNm} нм`],
      ['Площа зразка S', `${ivParams.area} см²`],
      ['Коефіцієнт фотодіода k', String(ivParams.photoFactor)],
      ['Множники Lv', `a = ${lvParams.a} · b = ${lvParams.b} · c = ${lvParams.c}`],
    ],
  )

  const spectra = renderToDataUrl(
    spectraOption(normalized, conditionLabels, selectedConditionIndex), 900, 380,
  )
  const eye = renderToDataUrl(referenceOption(results, 'eye'), 760, 380)
  const photo = renderToDataUrl(referenceOption(results, 'photodiode'), 760, 380)

  const spectralDerivations = [
    derivation(TEX.T2, `інтеграл за трапеціями по ${normalized.rows.length} точках`, fmt(T2), ' у.о.·нм'),
    derivation(TEX.T1, 'спектр OLED, помножений на криву ока, потім проінтегрований', fmt(T1), ' у.о.·нм'),
    derivation(TEX.T0, 'спектр OLED, помножений на криву фотодіода, потім проінтегрований', fmt(T0), ' у.о.·нм'),
    derivation(TEX.Kr, `= 683 × ${fmt(T1)} / ${fmt(T2)}`, fmt(Kr), ' лм/Вт'),
    derivation(TEX.FF, `= ${fmt(T0)} / ${fmt(T2)}`, fmt(FF)),
    derivation(
      TEX.Lv,
      `= ${fmt(Kr)} × ${(lvParams.a * 0.01 * 0.01).toExponential(3)} / (${(lvParams.b * lvParams.c * 1e-7).toExponential(3)} × ${fmt(FF)})`,
      Lv.toExponential(4),
      ' кд/м²',
    ),
  ].join('')

  const colour = analyzeColor(results.oledPoints)
  const cie1931 = cieDataUrl('1931', { x: colour.x, y: colour.y }, colour.boundary)
  const cie1976 = cieDataUrl('1976', { x: colour.x, y: colour.y }, colour.boundary)

  const colourDerivations = [
    derivation(TEX.X, 'згортка спектра з функцією x̄(λ) стандартного спостерігача CIE 1931 (2°)', fmt(colour.X)),
    derivation(TEX.Ytri, 'згортка з ȳ(λ), тобто з тією ж кривою чутливості ока V(λ)', fmt(colour.Y)),
    derivation(TEX.Ztri, 'згортка з z̄(λ)', fmt(colour.Z)),
    derivation(TEX.cx, `${fmt(colour.X)} / ${fmt(colour.X + colour.Y + colour.Z)}`, colour.x.toFixed(4)),
    derivation(TEX.cy, `${fmt(colour.Y)} / ${fmt(colour.X + colour.Y + colour.Z)}`, colour.y.toFixed(4)),
    derivation(TEX.uv, 'рівноконтрастні координати CIE 1976', `${colour.u.toFixed(4)} / ${colour.v.toFixed(4)}`),
    derivation(
      String.raw`\lambda_d`,
      'перетин променя від білої точки D65 через точку джерела зі спектральним локусом',
      colour.dominantNm === null ? '—' : colour.dominantNm.toFixed(1),
      ' нм',
    ),
    derivation(
      TEX.purity,
      'частка відстані від D65 до точки джерела відносно відстані до локусу',
      colour.purity === null ? '—' : (colour.purity * 100).toFixed(1),
      ' %',
    ),
    derivation(
      TEX.cct,
      colour.duv !== null && Math.abs(colour.duv) > 0.05
        ? `наближення Мак-Емі; Duv = ${colour.duv.toFixed(3)}, точка далеко від локусу Планка — значення умовне`
        : 'наближення Мак-Емі',
      colour.cct === null ? '—' : Math.round(colour.cct).toString(),
      ' K',
    ),
  ].join('')

  const eqeConstant = (3.14 * 1.6e-19 * ivParams.lambdaNm * 1e-9 * 100) / (Kr * 6.0e-34 * 3e8)

  const columnDerivations = [
    derivation(TEX.A, 'напруга розгортки з документа, без змін', '', ' В'),
    derivation(TEX.B, `S = ${ivParams.area} см²`, '', ' мА/см²'),
    derivation(
      TEX.C,
      `k = ${ivParams.photoFactor}, Lv = ${Lv.toExponential(4)}, далі мінус базова лінія C₀, від'ємні очищаються`,
      '',
      ' кд/м²',
    ),
    derivation(TEX.D, 'копія колонки густини струму', ''),
    derivation(TEX.E, 'яскравість поділена на густину струму', '', ' кд/А'),
    derivation(TEX.F, 'струмова ефективність × π, поділена на напругу', '', ' лм/Вт'),
    derivation(
      TEX.G,
      `λ = ${ivParams.lambdaNm} нм, Kr = ${fmt(Kr)} ⇒ G = E × ${eqeConstant.toExponential(4)}`,
      '',
      ' %',
    ),
  ].join('')

  const { rows: sampleRows, baseline } = computeIvBlock(ivBlocks[0], Kr, Lv, ivParams, ivBaselines[ivBlocks[0].index])
  const sample = sampleRows.reduce((best, r) => ((r.c ?? -Infinity) > (best.c ?? -Infinity) ? r : best), sampleRows[0])
  const sampleSource = ivBlocks[0].rows[sampleRows.indexOf(sample)]

  const workedExample = [
    derivation(TEX.A, `= ${sampleSource.text[0]}`, fmt(sample.a), ' В'),
    derivation(TEX.B, `= ${sampleSource.text[1]} × 1000 / ${ivParams.area}`, fmt(sample.b), ' мА/см²'),
    derivation(
      TEX.C,
      `= ${sampleSource.text[2]} × ${ivParams.photoFactor} × ${Lv.toExponential(4)} − ${fmt(baseline)}`,
      fmt(sample.c),
      ' кд/м²',
    ),
    derivation(TEX.D, `= ${fmt(sample.b)}`, fmt(sample.d), ' мА/см²'),
    derivation(TEX.E, `= (${fmt(sample.c)} / ${fmt(sample.d)}) × 0,1`, fmt(sample.e), ' кд/А'),
    derivation(TEX.F, `= (${fmt(sample.e)} × 3,14) / ${fmt(sample.a)}`, fmt(sample.f), ' лм/Вт'),
    derivation(TEX.G, `= ${fmt(sample.e)} × ${eqeConstant.toExponential(4)}`, fmt(sample.g), ' %'),
  ].join('')

  const caseSections = ivBlocks.map(block => {
    const { rows, baseline: caseBaseline, turnOnIndex } = computeIvBlock(block, Kr, Lv, ivParams, ivBaselines[block.index])
    const s = summarize(rows)
    const efficiency = renderToDataUrl(efficiencyOption(rows), 760, 380)
    const sweep = renderToDataUrl(sweepOption(rows), 760, 380)

    return `
      <section class="case">
        <h3>Вимір ${block.index}</h3>
        <p class="note">відкривання при ${fmt(block.rows[turnOnIndex]?.v ?? null)} В · базова лінія колонки C ${fmt(caseBaseline)} кд/м²${ivBaselines[block.index] !== undefined ? ' (вписано вручну)' : ' (авто)'}</p>
        ${table(
          ['макс J, мА/см²', 'макс L, кд/м²', 'макс CE, кд/А', 'макс PE, лм/Вт', 'макс EQE, %'],
          [[fmt(s.maxJ), fmt(s.maxL), fmt(s.maxCE), fmt(s.maxPE), fmt(s.maxEQE)]],
          false,
        )}
        <div class="figures">${figure(`Вимір ${block.index} — ефективність від густини струму`, efficiency)}${figure(`Вимір ${block.index} — густина струму та яскравість від напруги`, sweep)}</div>
        <details>
          <summary>Розраховані колонки A–G (${rows.length} точок)</summary>
          ${table(IV_COLUMNS.map(c => c.head), rows.map(r => IV_COLUMNS.map(c => fmt(r[c.key]))), false)}
        </details>
      </section>`
  }).join('')

  return `<!doctype html>
<html lang="uk">
<head>
<meta charset="utf-8">
<title>Звіт OLED — ${escapeHtml(parsed.fileName)}</title>
<style>
  :root { color-scheme: light; }
  body {
    margin: 0 auto; padding: 32px 28px; max-width: 1020px;
    font: 13px/1.55 system-ui, 'Segoe UI', sans-serif; color: #1a1a1a; background: #fff;
  }
  h1 { font-size: 20px; margin: 0 0 4px; }
  h2 {
    font-size: 15px; margin: 30px 0 10px; padding-bottom: 5px;
    border-bottom: 2px solid #1a1a1a;
  }
  h2 .num { color: #2563eb; margin-right: 8px; }
  h3 { font-size: 13px; margin: 20px 0 8px; color: #444; }
  .meta { color: #666; font-size: 12px; margin-bottom: 4px; }
  table { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0 14px; }
  th, td { border: 1px solid #d8d8d8; padding: 3px 8px; text-align: right; }
  th { background: #f5f5f5; font-weight: 600; }
  .lead-left td, .lead-left th { text-align: left; }
  tbody tr:nth-child(even) { background: #fafafa; }

  .derive {
    display: grid; grid-template-columns: minmax(140px, auto) 1fr auto;
    gap: 12px; align-items: baseline;
    padding: 7px 10px; border: 1px solid #e2e8f0; border-bottom: none;
    background: #fff;
  }
  .derive:last-of-type { border-bottom: 1px solid #e2e8f0; }
  .derive:nth-of-type(even) { background: #fafafa; }
  .derive__formula math { font-size: 1.15em; }
  .derive__sub { font-size: 11px; color: #777; min-width: 0; }
  .derive__result {
    font-family: Consolas, 'SF Mono', monospace; font-weight: 700;
    font-size: 13px; color: #92400e; white-space: nowrap;
  }
  .derive__unit { font-weight: 400; color: #999; font-size: 11px; }

  .figures { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin: 12px 0; }
  @media (max-width: 820px) { .figures { grid-template-columns: 1fr; } }
  figure { margin: 0; }
  figure img { width: 100%; border: 1px solid #d8d8d8; }
  figcaption { font-size: 11px; color: #777; margin-top: 3px; text-align: center; }
  details { margin: 10px 0 0; }
  summary { cursor: pointer; font-size: 12px; color: #2563eb; }
  .note { font-size: 11px; color: #777; margin: 0 0 6px; }
  .case { break-inside: avoid; }
  @media print {
    body { padding: 0; max-width: none; }
    details > summary { display: none; }
    .case { break-before: page; }
  }
</style>
</head>
<body>
<h1>Звіт: спектральний аналіз і ВАХ OLED</h1>
<p class="meta">сформовано ${escapeHtml(generated)}</p>

<h2><span class="num">1</span>Що завантажено</h2>
${inputTable}

<h2><span class="num">2</span>Що вибрано</h2>
${selectionTable}
${figure('Нормовані спектри — виділена крива це вибраний набір', spectra)}

<h2><span class="num">3</span>Спектральне інтегрування</h2>
<div class="figures">${figure('OLED × чутливість ока V(λ)', eye)}${figure('OLED × чутливість фотодіода', photo)}</div>
${spectralDerivations}

<h2><span class="num">4</span>Колориметрія</h2>
${colourDerivations}
<div class="figures">${figure('Діаграма колірності CIE 1931 (x, y)', cie1931)}${figure('Діаграма колірності CIE 1976 UCS (u′, v′)', cie1976)}</div>

<h2><span class="num">5</span>Як будуються колонки ВАХ</h2>
${columnDerivations}
<h3>Приклад на рядку виміру ${ivBlocks[0].index} при ${fmt(sample.a)} В</h3>
${workedExample}

<h2><span class="num">6</span>Результати по вимірах</h2>
${caseSections}
</body>
</html>`
}

export function downloadReport(input: ReportInput): void {
  const html = buildReportHtml(input)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  const stamp = new Date().toISOString().slice(0, 10)
  const base = input.parsed.fileName.replace(/\.[^.]+$/, '') || 'oled'

  const link = document.createElement('a')
  link.href = url
  link.download = `${base}-zvit-${stamp}.html`
  document.body.appendChild(link)
  link.click()
  link.remove()

  URL.revokeObjectURL(url)
}
