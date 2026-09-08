import { useState, useEffect, useCallback, type FC } from 'react'
import { useApp } from '../context/AppContext'
import { computeLv } from '../utils/calculate'
import { peakInfo, type ResolvedIvParams } from '../utils/ivCalc'
import { buildReportHtml, downloadReport, type ReportInput } from '../utils/report'
import './Step3Report.css'

function conditionLabel(conditions: number[], index: number): string {
  const v = conditions[index]
  const count = conditions.slice(0, index).filter(c => c === v).length
  return count > 0 ? `V=${v} (${count + 1})` : `V=${v}`
}

const Step3Report: FC = () => {
  const { state, dispatch } = useApp()
  const {
    parsedData, ivData, normalizedData, selectedConditionIndex,
    calcResults, ivParams, lvParams, ivBaselines,
  } = state

  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const ready = Boolean(
    parsedData && normalizedData && calcResults && ivData && selectedConditionIndex !== null,
  )

  const collect = useCallback((): ReportInput => {
    const peak = peakInfo(normalizedData!, selectedConditionIndex!)
    const Lv = computeLv(calcResults!.Kr, calcResults!.FF, lvParams)
    const resolved: ResolvedIvParams = {
      ...ivParams,
      lambdaNm: ivParams.lambdaNm ?? peak.lambdaNm,
    }

    return {
      parsed: parsedData!,
      ivFileName: ivData!.fileName,
      normalized: normalizedData!,
      conditionLabels: normalizedData!.conditions.map((_, i) =>
        conditionLabel(normalizedData!.conditions, i)),
      selectedConditionIndex: selectedConditionIndex!,
      results: calcResults!,
      lvParams,
      Lv,
      ivBlocks: ivData!.blocks,
      ivParams: resolved,
      ivBaselines,
    }
  }, [parsedData, ivData, normalizedData, selectedConditionIndex, calcResults, ivParams, lvParams, ivBaselines])

  useEffect(() => {
    if (!ready) return

    let url: string | null = null

    // a frame callback never runs while the tab is not painted, so use a timer
    const timer = setTimeout(() => {
      const blob = new Blob([buildReportHtml(collect())], { type: 'text/html;charset=utf-8' })
      url = URL.createObjectURL(blob)
      setPreviewUrl(url)
    }, 0)

    return () => {
      clearTimeout(timer)
      if (url) URL.revokeObjectURL(url)
    }
  }, [ready, collect])

  if (!ready) {
    return (
      <div className="report-empty">
        Звіт збереться, коли будуть готові обидва файли й вибраний набір на кроці 2.
        <button className="btn btn--ghost" onClick={() => dispatch({ type: 'SET_STEP', payload: 2 })}>
          ← До розрахунку
        </button>
      </div>
    )
  }

  const Lv = computeLv(calcResults!.Kr, calcResults!.FF, lvParams)

  return (
    <div className="report">
      <div className="report__head">
        <div className="report__info">
          <span className="report__badge">Звіт</span>
          <span className="report__desc">
            Що завантажено &rarr; що вибрано &rarr; формули з підставленими числами &rarr;
            колориметрія &rarr; результати по {ivData!.blocks.length} вимірах
          </span>
        </div>
        <button
          className="btn btn--primary"
          disabled={saving}
          onClick={() => {
            setSaving(true)
            setTimeout(() => {
              try {
                downloadReport(collect())
              } finally {
                setSaving(false)
              }
            }, 0)
          }}
        >
          {saving ? 'Збереження…' : '📄 Зберегти HTML'}
        </button>
      </div>

      <div className="report__summary">
        <Fact label="Спектри" value={parsedData!.fileName} />
        <Fact label="ВАХ" value={ivData!.fileName} />
        <Fact label="Набір" value={conditionLabel(normalizedData!.conditions, selectedConditionIndex!)} />
        <Fact label="Kr" value={`${calcResults!.Kr.toFixed(4)} лм/Вт`} />
        <Fact label="FF" value={calcResults!.FF.toFixed(4)} />
        <Fact label="Lv" value={`${Lv.toExponential(4)} кд/м²`} />
      </div>

      {previewUrl
        ? <iframe className="report__preview" title="Звіт" src={previewUrl} />
        : <p className="report__hint">Формування звіту — рендеряться графіки…</p>}

      <div className="report__nav">
        <button className="btn btn--ghost" onClick={() => dispatch({ type: 'SET_STEP', payload: 2 })}>
          ← Назад
        </button>
      </div>
    </div>
  )
}

const Fact: FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="report__fact">
    <span className="report__fact-label">{label}</span>
    <span className="report__fact-value">{value}</span>
  </div>
)

export default Step3Report
