import { useEffect, useState, useMemo, type FC } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { useApp } from '../context/AppContext'
import { parseReferenceData, computeResults } from '../utils/calculate'
import type { CalcResults } from '../types'
import './Step3Calculate.css'

function conditionLabel(conditions: number[], index: number): string {
  const v = conditions[index]
  const count = conditions.slice(0, index).filter(c => c === v).length
  return count > 0 ? `V=${v} (${count + 1})` : `V=${v}`
}

const Step3Calculate: FC = () => {
  const { state, dispatch } = useApp()
  const { normalizedData, selectedConditionIndex, calcResults } = state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!normalizedData || selectedConditionIndex === null || calcResults) return

    setLoading(true)
    setError(null)

    fetch('/oled2.txt')
      .then(r => r.text())
      .then(text => {
        const ref = parseReferenceData(text)
        const results = computeResults(normalizedData, selectedConditionIndex, ref)
        dispatch({ type: 'SET_CALC_RESULTS', payload: results })
      })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }, [normalizedData, selectedConditionIndex, calcResults, dispatch])

  if (!normalizedData || selectedConditionIndex === null) {
    return <div className="calc-empty">No dataset selected. Go back to Step 2.</div>
  }

  const label = conditionLabel(normalizedData.conditions, selectedConditionIndex)

  return (
    <div className="calc">
      <div className="calc__header">
        <span className="calc__badge">{label}</span>
        <span className="calc__desc">
          Integrating OLED spectrum against eye sensitivity V(λ) and photodiode response
        </span>
      </div>

      {loading && <div className="calc-loading">Loading reference data…</div>}
      {error && <div className="calc-error">{error}</div>}

      {calcResults && (
        <>
          <ChartsSection results={calcResults} label={label} />
          <ResultsSection results={calcResults} />
        </>
      )}

      <div className="calc__actions">
        <button className="btn btn--ghost" onClick={() => dispatch({ type: 'SET_STEP', payload: 2 })}>
          ← Back
        </button>
        <button className="btn btn--primary" onClick={() => dispatch({ type: 'SET_STEP', payload: 4 })}>
          Next →
        </button>
      </div>
    </div>
  )
}

/* ── Charts ──────────────────────────────────────────────────────── */

interface ChartsSectionProps {
  results: CalcResults
  label: string
}

/**
 * Merge four parallel XYPoint arrays onto a single X grid (the OLED grid).
 * ref and product are interpolated onto oled's x values using a Map lookup
 * after downsampling, so we pass the full-resolution arrays.
 */
/** All three arrays are parallel (same length, same X grid). Just downsample by index. */
function buildChartData(
  oledFull: CalcResults['oledPoints'],
  refFull: CalcResults['eyeRef'] | CalcResults['photoRef'],
  productFull: CalcResults['oledEyePoints'] | CalcResults['oledPhotoPoints'],
  maxPts = 500,
) {
  const step = Math.max(1, Math.ceil(oledFull.length / maxPts))
  return oledFull
    .filter((_, i) => i % step === 0)
    .map((pt, si) => {
      const ri = si * step
      return {
        x: pt.x,
        oled: pt.y,
        // show null (gap) when reference is 0 to avoid drawing flat zero line outside its range
        ref: (refFull[ri]?.y ?? 0) > 0 ? refFull[ri].y : null,
        product: productFull[ri]?.y ?? 0,
      }
    })
}

const ChartsSection: FC<ChartsSectionProps> = ({ results }) => {
  const eyeData = useMemo(
    () => buildChartData(results.oledPoints, results.eyeRef, results.oledEyePoints),
    [results],
  )
  const photoData = useMemo(
    () => buildChartData(results.oledPoints, results.photoRef, results.oledPhotoPoints),
    [results],
  )

  const axisProps = {
    tick: { fontSize: 11, fill: '#64748b' },
  }

  return (
    <div className="charts">
      {/* ── Chart 1: OLED + eye + OLED×eye (like Image 5) ── */}
      <ChartCard
        title="OLED Intensity · Eye sensitivity V(λ)"
        legend={[
          { color: '#374151', label: 'Intensity (OLED)' },
          { color: '#f9a8d4', label: 'eye' },
          { color: '#ef4444', label: 'Intensity (OLED × eye)' },
        ]}
      >
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={eyeData} margin={{ top: 8, right: 20, bottom: 28, left: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="x" {...axisProps}
              label={{ value: 'wavelength nm', position: 'insideBottom', offset: -10, fontSize: 12, fill: '#64748b' }} />
            <YAxis domain={[0, 1.05]} {...axisProps}
              label={{ value: 'Intensity u.c', angle: -90, position: 'insideLeft', offset: 14, fontSize: 12, fill: '#64748b' }} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
              formatter={(v, name) => [
                Number(v).toFixed(5),
                name === 'oled' ? 'Intensity (OLED)' : name === 'ref' ? 'eye' : 'Intensity (OLED × eye)',
              ]}
              labelFormatter={v => `λ = ${v} nm`}
            />
            <Line type="monotone" dataKey="oled" stroke="#374151" strokeWidth={1.5} dot={false} name="oled" />
            <Line type="monotone" dataKey="ref" stroke="#f9a8d4" strokeWidth={1.5} dot={false} name="ref" connectNulls={false} />
            <Line type="monotone" dataKey="product" stroke="#ef4444" strokeWidth={1.5} dot={false} name="product" />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* ── Chart 2: OLED + photodiode + OLED×photodiode (like Image 4) ── */}
      <ChartCard
        title="OLED Intensity · Photodiode response"
        legend={[
          { color: '#374151', label: 'Intensity (OLED)' },
          { color: '#f9a8d4', label: 'photodiode' },
          { color: '#ef4444', label: 'Intensity (OLED × photodiode)' },
        ]}
      >
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={photoData} margin={{ top: 8, right: 20, bottom: 28, left: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="x" {...axisProps}
              label={{ value: 'wavelength nm', position: 'insideBottom', offset: -10, fontSize: 12, fill: '#64748b' }} />
            <YAxis domain={[0, 1.05]} {...axisProps}
              label={{ value: 'Intensity u.c', angle: -90, position: 'insideLeft', offset: 14, fontSize: 12, fill: '#64748b' }} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
              formatter={(v, name) => [
                Number(v).toFixed(5),
                name === 'oled' ? 'Intensity (OLED)' : name === 'ref' ? 'photodiode' : 'Intensity (OLED × photodiode)',
              ]}
              labelFormatter={v => `λ = ${v} nm`}
            />
            <Line type="monotone" dataKey="oled" stroke="#374151" strokeWidth={1.5} dot={false} name="oled" />
            <Line type="monotone" dataKey="ref" stroke="#f9a8d4" strokeWidth={1.5} dot={false} name="ref" connectNulls={false} />
            <Line type="monotone" dataKey="product" stroke="#ef4444" strokeWidth={1.5} dot={false} name="product" />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  )
}

interface LegendEntry { color: string; label: string }

const ChartCard: FC<{ title: string; legend: LegendEntry[]; children: React.ReactNode }> = ({ title, legend, children }) => (
  <div className="chart-card">
    <div className="chart-card__top">
      <p className="chart-card__title">{title}</p>
      <div className="chart-card__legend-box">
        {legend.map(e => (
          <span key={e.label} className="legend-item">
            <span className="legend-item__line" style={{ background: e.color }} />
            {e.label}
          </span>
        ))}
      </div>
    </div>
    {children}
  </div>
)

/* ── Results ─────────────────────────────────────────────────────── */

const ResultsSection: FC<{ results: CalcResults }> = ({ results }) => {
  const { T2, T1, T0, Kr, FF } = results

  const rows = [
    {
      symbol: 'T₂',
      name: '∫ OLED(λ) dλ',
      desc: 'Plain integral of OLED emission spectrum',
      value: T2,
      unit: 'u.c · nm',
      highlight: false,
    },
    {
      symbol: 'T₁',
      name: '∫ OLED(λ) × V(λ) dλ',
      desc: 'OLED weighted by eye sensitivity — Multiply OLED on eye',
      value: T1,
      unit: 'u.c · nm',
      highlight: false,
    },
    {
      symbol: 'T₀',
      name: '∫ OLED(λ) × PD(λ) dλ',
      desc: 'OLED weighted by photodiode response — Multiply OLED on LED',
      value: T0,
      unit: 'u.c · nm',
      highlight: false,
    },
    {
      symbol: 'Kr',
      name: '683 × T₁ / T₂',
      desc: 'Luminous efficacy of radiation (luminous / radiometric ratio)',
      value: Kr,
      unit: 'lm/W',
      highlight: true,
    },
    {
      symbol: 'FF',
      name: 'T₀ / T₂',
      desc: 'Fill factor — fraction captured by photodiode',
      value: FF,
      unit: '',
      highlight: true,
    },
  ]

  return (
    <div className="results">
      <h3 className="results__title">Calculation Results</h3>
      <div className="results__table-wrap">
        <table className="results__table">
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Formula</th>
              <th>Description</th>
              <th className="results__th--val">Value</th>
              <th>Unit</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.symbol} className={row.highlight ? 'results__tr--highlight' : ''}>
                <td className="results__td--sym">{row.symbol}</td>
                <td className="results__td--formula">{row.name}</td>
                <td className="results__td--desc">{row.desc}</td>
                <td className="results__td--val">{row.value.toFixed(4)}</td>
                <td className="results__td--unit">{row.unit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Step3Calculate
