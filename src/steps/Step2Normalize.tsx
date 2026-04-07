import { useEffect, useState, useCallback, type FC } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { useApp } from '../context/AppContext'
import { normalizeData } from '../utils/normalize'
import type { NormalizedData } from '../types'
import './Step2Normalize.css'

const CONDITION_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444']

function conditionLabel(conditions: number[], index: number): string {
  const v = conditions[index]
  const count = conditions.slice(0, index).filter(c => c === v).length
  return count > 0 ? `V=${v} (${count + 1})` : `V=${v}`
}

function sampleRows(rows: NormalizedData['rows'], maxPoints = 400) {
  if (rows.length <= maxPoints) return rows
  const step = Math.ceil(rows.length / maxPoints)
  return rows.filter((_, i) => i % step === 0)
}

const Step2Normalize: FC = () => {
  const { state, dispatch } = useApp()
  const { parsedData, normalizedData, selectedConditionIndex } = state

  useEffect(() => {
    if (parsedData && !normalizedData) {
      dispatch({ type: 'SET_NORMALIZED_DATA', payload: normalizeData(parsedData) })
    }
  }, [parsedData, normalizedData, dispatch])

  const selectCondition = useCallback(
    (idx: number) => {
      dispatch({
        type: 'SET_SELECTED_CONDITION',
        payload: selectedConditionIndex === idx ? null : idx,
      })
    },
    [selectedConditionIndex, dispatch],
  )

  if (!parsedData || !normalizedData) {
    return <div className="norm-loading">Computing normalization…</div>
  }

  const labels = normalizedData.conditions.map((_, i) => conditionLabel(normalizedData.conditions, i))
  const canProceed = selectedConditionIndex !== null

  return (
    <div className="norm">
      <div className="norm__info">
        <div className="norm__badge">Normalize to [0, 1]</div>
        <span className="norm__desc">
          Min-max per column &mdash; select one dataset to use in the calculation
        </span>
      </div>

      <CombinedChart data={normalizedData} labels={labels} selected={selectedConditionIndex} />

      <ConditionSelector
        data={normalizedData}
        labels={labels}
        selected={selectedConditionIndex}
        onSelect={selectCondition}
      />

      <div className="norm__actions">
        <button className="btn btn--ghost" onClick={() => dispatch({ type: 'SET_STEP', payload: 1 })}>
          ← Back
        </button>
        <button
          className="btn btn--primary"
          disabled={!canProceed}
          title={canProceed ? undefined : 'Select a dataset to continue'}
          onClick={() => dispatch({ type: 'SET_STEP', payload: 3 })}
        >
          Next →
        </button>
      </div>
    </div>
  )
}

/* ── Combined chart ─────────────────────────────────────────────── */
interface CombinedChartProps {
  data: NormalizedData
  labels: string[]
  selected: number | null
}

const CombinedChart: FC<CombinedChartProps> = ({ data, labels, selected }) => {
  const [hidden, setHidden] = useState<Set<number>>(new Set())
  const sampled = sampleRows(data.rows)

  const chartData = sampled.map(row => {
    const point: Record<string, number> = { wavelength: row.wavelength }
    data.conditions.forEach((_, i) => { point[`c${i}`] = row.normalizedValues[i] })
    return point
  })

  const toggleVisibility = (idx: number) =>
    setHidden(prev => { const n = new Set(prev); n.has(idx) ? n.delete(idx) : n.add(idx); return n })

  return (
    <div className="chart-card">
      <div className="chart-card__header">
        <span className="chart-card__title">Normalized spectra</span>
        <div className="chart-card__legend">
          {labels.map((label, i) => (
            <button
              key={i}
              className={`legend-btn${hidden.has(i) ? ' legend-btn--hidden' : ''}${selected === i ? ' legend-btn--selected' : ''}`}
              style={{ '--color': CONDITION_COLORS[i % CONDITION_COLORS.length] } as React.CSSProperties}
              onClick={() => toggleVisibility(i)}
            >
              <span className="legend-btn__dot" />
              {label}
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="wavelength" tick={{ fontSize: 11, fill: '#64748b' }}
            label={{ value: 'λ (nm)', position: 'insideBottomRight', offset: -4, fontSize: 11, fill: '#94a3b8' }} />
          <YAxis domain={[0, 1]} tick={{ fontSize: 11, fill: '#64748b' }}
            label={{ value: 'Normalized', angle: -90, position: 'insideLeft', offset: 10, fontSize: 11, fill: '#94a3b8' }} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
            formatter={(value, name) => [Number(value).toFixed(5), labels[parseInt(String(name).replace('c', ''))]]}
            labelFormatter={v => `λ = ${v} nm`}
          />
          {data.conditions.map((_, i) => (
            <Line key={i} type="monotone" dataKey={`c${i}`}
              stroke={CONDITION_COLORS[i % CONDITION_COLORS.length]}
              strokeWidth={selected === i ? 2.5 : 1.5}
              dot={false} hide={hidden.has(i)}
              opacity={selected === null || selected === i ? 1 : 0.2}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

/* ── Condition selector cards ─────────────────────────────────────── */
interface ConditionSelectorProps {
  data: NormalizedData
  labels: string[]
  selected: number | null
  onSelect: (idx: number) => void
}

const ConditionSelector: FC<ConditionSelectorProps> = ({ data, labels, selected, onSelect }) => {
  const sampled = sampleRows(data.rows, 200)

  return (
    <div className="selector">
      <p className="selector__hint">Select one dataset for calculation:</p>
      <div className="selector__grid">
        {data.conditions.map((_, i) => {
          const isSelected = selected === i
          const color = CONDITION_COLORS[i % CONDITION_COLORS.length]
          const miniData = sampled.map(row => ({ wavelength: row.wavelength, value: row.normalizedValues[i] }))

          return (
            <button
              key={i}
              className={`cond-card${isSelected ? ' cond-card--selected' : ''}`}
              style={{ '--color': color } as React.CSSProperties}
              onClick={() => onSelect(i)}
            >
              <div className="cond-card__header">
                <span className="cond-card__label">{labels[i]}</span>
                <span className="cond-card__check">{isSelected ? '✓' : ''}</span>
              </div>
              <div className="cond-card__stats">
                <span>min {data.stats[i].min.toFixed(2)}</span>
                <span>max {data.stats[i].max.toFixed(2)}</span>
              </div>
              <ResponsiveContainer width="100%" height={80}>
                <LineChart data={miniData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <Line type="monotone" dataKey="value" stroke={color} strokeWidth={1.5} dot={false} />
                  <XAxis dataKey="wavelength" hide />
                  <YAxis domain={[0, 1]} hide />
                </LineChart>
              </ResponsiveContainer>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default Step2Normalize
