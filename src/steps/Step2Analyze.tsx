import { useEffect, useMemo, useCallback, type FC } from 'react'
import { useApp } from '../context/AppContext'
import { normalizeData } from '../utils/normalize'
import Chart from '../components/Chart'
import SpectralCalculation from './SpectralCalculation'
import IvResults from './IvResults'
import { spectraOption, CONDITION_COLORS } from '../charts/options'
import { peakInfo } from '../utils/ivCalc'
import type { NormalizedData } from '../types'
import './Step2Analyze.css'

function conditionLabel(conditions: number[], index: number): string {
  const v = conditions[index]
  const count = conditions.slice(0, index).filter(c => c === v).length
  return count > 0 ? `V=${v} (${count + 1})` : `V=${v}`
}

const Step2Analyze: FC = () => {
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

  const labels = useMemo(
    () => normalizedData?.conditions.map((_, i) => conditionLabel(normalizedData.conditions, i)) ?? [],
    [normalizedData],
  )

  const option = useMemo(
    () => (normalizedData ? spectraOption(normalizedData, labels, selectedConditionIndex) : null),
    [normalizedData, labels, selectedConditionIndex],
  )

  if (!parsedData || !normalizedData || !option) {
    return <div className="norm-loading">Обчислення нормування…</div>
  }

  const canProceed = selectedConditionIndex !== null

  return (
    <div className="norm">
      <div className="norm__info">
        <div className="norm__badge">Нормування до [0, 1]</div>
        <span className="norm__desc">
          Мін-макс по кожній колонці &mdash; виберіть один набір, і розрахунок з&apos;явиться нижче
        </span>
      </div>

      <Chart
        title="Нормовані спектри"
        option={option}
        exportName="normovani-spektry"
        height={340}
      />

      <ConditionSelector
        data={normalizedData}
        labels={labels}
        selected={selectedConditionIndex}
        onSelect={selectCondition}
      />

      {canProceed
        ? (
          <>
            <SpectralCalculation />
            <IvResults />
          </>
        )
        : <p className="norm__waiting">Виберіть набір вище, щоб побачити розрахунок.</p>}

      <div className="norm__actions">
        <button className="btn btn--ghost" onClick={() => dispatch({ type: 'SET_STEP', payload: 1 })}>
          ← Назад
        </button>
        <button
          className="btn btn--primary"
          disabled={!canProceed}
          title={canProceed ? undefined : 'Виберіть набір, щоб продовжити'}
          onClick={() => dispatch({ type: 'SET_STEP', payload: 3 })}
        >
          Далі до звіту →
        </button>
      </div>
    </div>
  )
}

interface ConditionSelectorProps {
  data: NormalizedData
  labels: string[]
  selected: number | null
  onSelect: (idx: number) => void
}

const SPARK_POINTS = 200
const SPARK_WIDTH = 200
const SPARK_HEIGHT = 60

const Sparkline: FC<{ values: number[]; color: string }> = ({ values, color }) => {
  const step = Math.max(1, Math.ceil(values.length / SPARK_POINTS))
  const sampled = values.filter((_, i) => i % step === 0)
  const points = sampled
    .map((v, i) => {
      const x = (i / (sampled.length - 1)) * SPARK_WIDTH
      const y = SPARK_HEIGHT - Math.max(0, Math.min(1, v)) * SPARK_HEIGHT
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  return (
    <svg
      className="cond-card__spark"
      viewBox={`0 0 ${SPARK_WIDTH} ${SPARK_HEIGHT}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

const PeakNote: FC<{ data: NormalizedData; index: number }> = ({ data, index }) => {
  const peak = peakInfo(data, index)
  return (
    <div className={`cond-card__peak${peak.saturated ? ' cond-card__peak--warn' : ''}`}>
      {peak.saturated
        ? `⚠ пласка вершина ${peak.widthNm.toFixed(0)} нм — ймовірно зрізано`
        : `λ ${peak.lambdaNm.toFixed(1)} нм`}
    </div>
  )
}

const ConditionSelector: FC<ConditionSelectorProps> = ({ data, labels, selected, onSelect }) => (
  <div className="selector">
    <p className="selector__hint">Набір для розрахунку:</p>
    <div className="selector__grid">
      {data.conditions.map((_, i) => {
        const isSelected = selected === i
        const color = CONDITION_COLORS[i % CONDITION_COLORS.length]

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
              <span>мін {data.stats[i].min.toFixed(2)}</span>
              <span>макс {data.stats[i].max.toFixed(2)}</span>
            </div>
            <PeakNote data={data} index={i} />
            <Sparkline values={data.rows.map(r => r.normalizedValues[i])} color={color} />
          </button>
        )
      })}
    </div>
  </div>
)

export default Step2Analyze
