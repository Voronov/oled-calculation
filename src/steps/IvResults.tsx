import { useState, useMemo, type FC } from 'react'
import { useApp } from '../context/AppContext'
import Chart from '../components/Chart'
import { efficiencyOption, sweepOption } from '../charts/options'
import { computeLv } from '../utils/calculate'
import { computeIvBlock, peakInfo, DEFAULT_IV_PARAMS, type ResolvedIvParams, type PeakInfo } from '../utils/ivCalc'
import type { IvBlock, IvComputedRow, IvParams } from '../types'
import Formula from '../components/Formula'
import { TEX } from '../charts/tex'
import './IvResults.css'

function fmt(v: number | null): string {
  if (v === null || !isFinite(v)) return '—'
  const abs = Math.abs(v)
  if (abs !== 0 && (abs >= 1e5 || abs < 1e-3)) return v.toExponential(3)
  return v.toFixed(4)
}

const IvResults: FC = () => {
  const { state, dispatch } = useApp()
  const { ivData, normalizedData, selectedConditionIndex, calcResults, ivParams, lvParams, ivBaselines } = state
  const [activeCase, setActiveCase] = useState(0)
  const [tab, setTab] = useState<'raw' | 'computed'>('computed')

  const peak = useMemo(
    () => (normalizedData && selectedConditionIndex !== null
      ? peakInfo(normalizedData, selectedConditionIndex)
      : null),
    [normalizedData, selectedConditionIndex],
  )

  if (!calcResults) return null

  if (!ivData) {
    return (
      <div className="iv-empty">
        Документ ВАХ не завантажено — додайте файл .docx на кроці 1.
        <button className="btn btn--ghost" onClick={() => dispatch({ type: 'SET_STEP', payload: 1 })}>
          ← До завантаження
        </button>
      </div>
    )
  }

  const Kr = calcResults.Kr
  const Lv = computeLv(Kr, calcResults.FF, lvParams)
  const lambdaNm = ivParams.lambdaNm ?? peak?.lambdaNm ?? 0
  const resolved: ResolvedIvParams = { ...ivParams, lambdaNm }

  const block = ivData.blocks[Math.min(activeCase, ivData.blocks.length - 1)]

  return (
    <div className="iv">
      <div className="iv__header">
        <span className="iv__badge">Результати ВАХ</span>
        <span className="iv__file">⚡ {ivData.fileName}</span>
        <span className="iv__meta">
          Kr = {Kr.toFixed(4)} лм/Вт · Lv = {Lv.toExponential(4)} кд/м²
        </span>
      </div>

      <IvParamsPanel
        params={ivParams}
        peak={peak}
        onChange={p => dispatch({ type: 'SET_IV_PARAMS', payload: p })}
      />

      <div className="iv-tabs" role="tablist">
        {ivData.blocks.map((b, i) => (
          <button
            key={b.index}
            role="tab"
            aria-selected={i === activeCase}
            className={`iv-tab${i === activeCase ? ' iv-tab--active' : ''}`}
            onClick={() => setActiveCase(i)}
          >
            Вимір {b.index}
          </button>
        ))}
      </div>

      <div className="iv-subtabs" role="tablist">
        <button
          role="tab"
          aria-selected={tab === 'raw'}
          className={`iv-subtab${tab === 'raw' ? ' iv-subtab--active' : ''}`}
          onClick={() => setTab('raw')}
        >
          Сирі дані
        </button>
        <button
          role="tab"
          aria-selected={tab === 'computed'}
          className={`iv-subtab${tab === 'computed' ? ' iv-subtab--active' : ''}`}
          onClick={() => setTab('computed')}
        >
          Розраховано
        </button>
      </div>

      {tab === 'raw'
        ? <RawTable block={block} />
        : <ComputedView
            block={block}
            Kr={Kr}
            Lv={Lv}
            params={resolved}
            baselineOverride={ivBaselines[block.index]}
            onBaseline={b => dispatch({ type: 'SET_IV_BASELINE', payload: { index: block.index, baseline: b } })}
          />}

    </div>
  )
}

const ParamInput: FC<{ value: number; onChange: (v: number) => void }> = ({ value, onChange }) => {
  const [draft, setDraft] = useState(String(value))
  const [editing, setEditing] = useState(false)

  return (
    <input
      className="iv-param__input"
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

interface IvParamsPanelProps {
  params: IvParams
  peak: PeakInfo | null
  onChange: (p: IvParams) => void
}

const IvParamsPanel: FC<IvParamsPanelProps> = ({ params, peak, onChange }) => {
  const followingPeak = params.lambdaNm === null
  const isDefault = params.area === DEFAULT_IV_PARAMS.area
    && params.photoFactor === DEFAULT_IV_PARAMS.photoFactor
    && followingPeak

  return (
    <div className="iv-param">
      <span className="iv-param__group">
        <Formula tex={TEX.B} />
        <span className="iv-param__label">S =</span>
        <ParamInput value={params.area} onChange={v => onChange({ ...params, area: v })} />
        <span className="iv-param__unit">см²</span>
      </span>

      <span className="iv-param__group">
        <Formula tex={TEX.C} />
        <span className="iv-param__label">k =</span>
        <ParamInput value={params.photoFactor} onChange={v => onChange({ ...params, photoFactor: v })} />

      </span>

      <span className="iv-param__group">
        <span className="iv-param__label">λ =</span>
        <ParamInput
          value={params.lambdaNm ?? peak?.lambdaNm ?? 0}
          onChange={v => onChange({ ...params, lambdaNm: v })}
        />
        <span className="iv-param__unit">нм</span>
        {followingPeak && peak && (
          <span className={peak.saturated ? 'iv-param__warn' : 'iv-param__note'}>
            {peak.saturated
              ? `⚠ пік плаский на ${peak.widthNm.toFixed(0)} нм — впишіть λ вручну`
              : `середина піка з кроку 2 (ширина ${peak.widthNm.toFixed(1)} нм)`}
          </span>
        )}
      </span>

      <button
        className="iv-param__reset"
        disabled={isDefault}
        onClick={() => onChange(DEFAULT_IV_PARAMS)}
      >
        Скинути
      </button>
    </div>
  )
}

const RawTable: FC<{ block: IvBlock }> = ({ block }) => (
  <div className="iv-table-wrap">
    <table className="iv-table">
      <thead>
        <tr>
          <th>V1 −Ch1</th>
          <th>I1 −Ch1</th>
          <th>I2 −Ch2</th>
        </tr>
      </thead>
      <tbody>
        {block.rows.map((row, i) => (
          <tr key={i} className={i % 2 ? 'iv-table__tr--alt' : ''}>
            <td>{row.text[0]}</td>
            <td>{row.text[1]}</td>
            <td>{row.text[2]}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)

const COLUMNS: Array<{ key: keyof IvComputedRow; head: string; tex: string; sub: string }> = [
  { key: 'a', head: 'A', tex: TEX.A, sub: 'напруга, В' },
  { key: 'b', head: 'B', tex: TEX.B, sub: 'густина струму, мА/см²' },
  { key: 'c', head: 'C', tex: TEX.C, sub: 'яскравість, кд/м²' },
  { key: 'd', head: 'D', tex: TEX.D, sub: '= B' },
  { key: 'e', head: 'E', tex: TEX.E, sub: 'струмова ефективність, кд/А' },
  { key: 'f', head: 'F', tex: TEX.F, sub: 'енергетична ефективність, лм/Вт' },
  { key: 'g', head: 'G', tex: TEX.G, sub: 'EQE, %' },
]

interface ComputedViewProps {
  block: IvBlock
  Kr: number
  Lv: number
  params: ResolvedIvParams
  baselineOverride: number | undefined
  onBaseline: (baseline: number | null) => void
}

const ComputedView: FC<ComputedViewProps> = ({ block, Kr, Lv, params, baselineOverride, onBaseline }) => {
  const { rows, baseline, turnOnIndex } = useMemo(
    () => computeIvBlock(block, Kr, Lv, params, baselineOverride),
    [block, Kr, Lv, params, baselineOverride],
  )

  const [sharedScale, setSharedScale] = useState(true)
  const efficiency = useMemo(() => efficiencyOption(rows), [rows])
  const sweep = useMemo(() => sweepOption(rows, sharedScale), [rows, sharedScale])

  return (
    <>
      <div className="iv-baseline">
        <span className="iv-param__label">Базова лінія колонки C</span>
        <ParamInput value={baseline} onChange={onBaseline} />
        <span className="iv-param__unit">кд/м²</span>
        <span className="iv-param__note">
          відкривання при {block.rows[turnOnIndex] ? `${block.rows[turnOnIndex].v} В` : '—'} ·
          {baselineOverride === undefined ? ' авто з останнього темнового відліку' : ' вписано вручну'}
        </span>
        {baselineOverride !== undefined && (
          <button className="iv-param__reset" onClick={() => onBaseline(null)}>Авто</button>
        )}
      </div>

      <div className="iv-charts">
        <Chart
          title="Ефективність від густини струму"
          option={efficiency}
          exportName={`case-${block.index}-efficiency`}
          logToggle
          defaultLog
          defaultPoints
        />
        <Chart
          title="Густина струму та яскравість від напруги"
          option={sweep}
          exportName={`case-${block.index}-sweep`}
          logToggle
          defaultPoints
          extraSwitches={
            <button
              className={`chart__switch${sharedScale ? ' chart__switch--on' : ''}`}
              onClick={() => setSharedScale(v => !v)}
              title="Спільна шкала для обох кривих або окрема вісь для кожної"
            >
              {sharedScale ? 'спільна' : 'окремі'}
            </button>
          }
        />
      </div>

      <div className="iv-table-wrap">
        <table className="iv-table">
          <thead>
            <tr>
              {COLUMNS.map(c => <th key={c.head} title={c.sub}><Formula tex={c.tex} /></th>)}
            </tr>
            <tr>
              {COLUMNS.map(c => <th key={c.head} className="iv-table__sub">{c.sub}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className={i % 2 ? 'iv-table__tr--alt' : ''}>
                {COLUMNS.map(c => (
                  <td key={c.head} className={row[c.key] === null ? 'iv-table__td--empty' : ''}>
                    {fmt(row[c.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

export default IvResults
