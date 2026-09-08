import { useEffect, useState, useMemo, type FC } from 'react'
import { useApp } from '../context/AppContext'
import Chart from '../components/Chart'
import Formula from '../components/Formula'
import { referenceOption } from '../charts/options'
import CieDiagram from '../components/CieDiagram'
import { analyzeColor } from '../utils/colorimetry'
import { TEX, SYMBOL } from '../charts/tex'
import { parseReferenceData, computeResults, computeLv, DEFAULT_LV_PARAMS } from '../utils/calculate'
import type { CalcResults, LvParams } from '../types'
import './SpectralCalculation.css'

const SpectralCalculation: FC = () => {
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

  if (!normalizedData || selectedConditionIndex === null) return null

  return (
    <div className="calc">
      <div className="calc__header">
        <span className="calc__badge">Спектральне інтегрування</span>
        <span className="calc__desc">
          Спектр OLED інтегрується з кривою чутливості ока V(λ) та кривою фотодіода
        </span>
      </div>

      {loading && <div className="calc-loading">Завантаження довідкових кривих…</div>}
      {error && <div className="calc-error">{error}</div>}

      {calcResults && (
        <>
          <ChartsSection results={calcResults} />
          <ResultsSection results={calcResults} />
          <ColorimetrySection results={calcResults} />
        </>
      )}
    </div>
  )
}

const ChartsSection: FC<{ results: CalcResults }> = ({ results }) => {
  const eyeOption = useMemo(() => referenceOption(results, 'eye'), [results])
  const photoOption = useMemo(() => referenceOption(results, 'photodiode'), [results])

  return (
    <div className="charts">
      <Chart
        title="Інтенсивність OLED · чутливість ока V(λ)"
        option={eyeOption}
        exportName="oled-oko"
      />
      <Chart
        title="Інтенсивність OLED · чутливість фотодіода"
        option={photoOption}
        exportName="oled-fotodiod"
      />
    </div>
  )
}

const LV_KEYS: Array<keyof LvParams> = ['a', 'b', 'c']

const ParamInput: FC<{ value: number; onChange: (v: number) => void }> = ({ value, onChange }) => {
  const [draft, setDraft] = useState(String(value))
  const [editing, setEditing] = useState(false)

  return (
    <input
      className="lv-param__input"
      type="text"
      inputMode="decimal"
      value={editing ? draft : String(value)}
      onFocus={() => { setDraft(String(value)); setEditing(true) }}
      onBlur={() => setEditing(false)}
      onChange={e => {
        setDraft(e.target.value)
        const parsed = parseFloat(e.target.value)
        if (isFinite(parsed)) onChange(parsed)
      }}
    />
  )
}

const LvParamsPanel: FC<{ params: LvParams; onChange: (p: LvParams) => void }> = ({ params, onChange }) => {
  const isDefault = LV_KEYS.every(k => params[k] === DEFAULT_LV_PARAMS[k])

  const field = (key: keyof LvParams, suffix: string) => (
    <>
      <span className="lv-param__name">{key}</span>
      <ParamInput value={params[key]} onChange={v => onChange({ ...params, [key]: v })} />
      {suffix && <span className="lv-param__const">{suffix}</span>}
    </>
  )

  return (
    <div className="lv-param">
      <Formula tex={TEX.Lv} />
      <span className="lv-param__sep">де</span>
      {field('a', '× 0.01 × 0.01')}
      {field('b', '')}
      {field('c', '× 0.0000001')}
      <button
        className="lv-param__reset"
        disabled={isDefault}
        onClick={() => onChange(DEFAULT_LV_PARAMS)}
      >
        Скинути
      </button>
    </div>
  )
}

function formatValue(v: number): string {
  if (!isFinite(v)) return '—'
  const abs = Math.abs(v)
  if (abs !== 0 && (abs >= 1e6 || abs < 1e-4)) return v.toExponential(4)
  return v.toFixed(4)
}

const ResultsSection: FC<{ results: CalcResults }> = ({ results }) => {
  const { state, dispatch } = useApp()
  const { lvParams } = state
  const { T2, T1, T0, Kr, FF } = results
  const Lv = computeLv(Kr, FF, lvParams)

  const rows = [
    {
      symbol: SYMBOL.T2,
      tex: TEX.T2,
      desc: 'Інтеграл спектра випромінювання OLED',
      value: T2,
      unit: 'у.о. · нм',
      highlight: false,
    },
    {
      symbol: SYMBOL.T1,
      tex: TEX.T1,
      desc: 'Спектр OLED, зважений чутливістю ока',
      value: T1,
      unit: 'у.о. · нм',
      highlight: false,
    },
    {
      symbol: SYMBOL.T0,
      tex: TEX.T0,
      desc: 'Спектр OLED, зважений чутливістю фотодіода',
      value: T0,
      unit: 'у.о. · нм',
      highlight: false,
    },
    {
      symbol: SYMBOL.Kr,
      tex: TEX.Kr,
      desc: 'Світлова віддача випромінювання',
      value: Kr,
      unit: 'лм/Вт',
      highlight: true,
    },
    {
      symbol: SYMBOL.FF,
      tex: TEX.FF,
      desc: 'Fill factor — частка, яку вловлює фотодіод',
      value: FF,
      unit: '',
      highlight: true,
    },
    {
      symbol: SYMBOL.Lv,
      tex: TEX.Lv,
      desc: 'Яскравість — Kr, помножений на коефіцієнти нижче',
      value: Lv,
      unit: 'кд/м²',
      highlight: true,
    },
  ]

  return (
    <div className="results">
      <h3 className="results__title">Результати розрахунку</h3>
      <div className="results__table-wrap">
        <table className="results__table">
          <thead>
            <tr>
              <th>Символ</th>
              <th>Формула</th>
              <th>Опис</th>
              <th className="results__th--val">Значення</th>
              <th>Одиниці</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.symbol} className={row.highlight ? 'results__tr--highlight' : ''}>
                <td className="results__td--sym"><Formula tex={row.symbol} /></td>
                <td className="results__td--formula"><Formula tex={row.tex} /></td>
                <td className="results__td--desc">{row.desc}</td>
                <td className="results__td--val">{formatValue(row.value)}</td>
                <td className="results__td--unit">{row.unit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <LvParamsPanel
        params={lvParams}
        onChange={p => dispatch({ type: 'SET_LV_PARAMS', payload: p })}
      />
    </div>
  )
}

const ColorimetrySection: FC<{ results: CalcResults }> = ({ results }) => {
  const colour = useMemo(() => analyzeColor(results.oledPoints), [results])

  const rows = [
    { tex: TEX.cx, desc: 'Координата колірності x', value: colour.x.toFixed(4), unit: '' },
    { tex: TEX.cy, desc: 'Координата колірності y', value: colour.y.toFixed(4), unit: '' },
    { tex: TEX.uv, desc: 'Рівноконтрастні координати CIE 1976', value: `${colour.u.toFixed(4)} / ${colour.v.toFixed(4)}`, unit: '' },
    {
      tex: String.raw`\lambda_d`,
      desc: 'Домінуюча довжина хвилі — перетин променя від D65 зі спектральним локусом',
      value: colour.dominantNm === null ? '—' : colour.dominantNm.toFixed(1),
      unit: 'нм',
    },
    {
      tex: TEX.purity,
      desc: 'Збуджувальна чистота кольору відносно D65',
      value: colour.purity === null ? '—' : (colour.purity * 100).toFixed(1),
      unit: '%',
    },
    {
      tex: TEX.cct,
      desc: colour.duv !== null && Math.abs(colour.duv) > 0.05
        ? 'Корельована колірна температура — точка далеко від локусу Планка, значення умовне'
        : 'Корельована колірна температура',
      value: colour.cct === null ? '—' : Math.round(colour.cct).toString(),
      unit: 'K',
    },
  ]

  return (
    <div className="colour">
      <div className="calc__header">
        <span className="calc__badge">Колориметрія</span>
        <span className="calc__desc">
          Спектр згортається з функціями додавання кольору стандартного спостерігача CIE 1931 (2°)
        </span>
      </div>

      <div className="colour__body">
        <div className="results__table-wrap">
          <table className="results__table">
            <thead>
              <tr>
                <th>Формула</th>
                <th>Опис</th>
                <th className="results__th--val">Значення</th>
                <th>Одиниці</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.desc}>
                  <td className="results__td--formula"><Formula tex={row.tex} /></td>
                  <td className="results__td--desc">{row.desc}</td>
                  <td className="results__td--val">{row.value}</td>
                  <td className="results__td--unit">{row.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {colour.duv !== null && Math.abs(colour.duv) > 0.05 && (
            <p className="colour__warn">
              Duv = {colour.duv.toFixed(3)} — колір насичено зелений і лежить далеко від локусу
              Планка, тому CCT для нього фізичного змісту не має.
            </p>
          )}
        </div>

        <CieDiagram
          sample={{ x: colour.x, y: colour.y }}
          boundary={colour.boundary}
        />
      </div>
    </div>
  )
}

export default SpectralCalculation
