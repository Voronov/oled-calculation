import { useRef, useState, useCallback, type FC, type DragEvent, type ChangeEvent, type ReactNode } from 'react'
import { useApp } from '../context/AppContext'
import { parseOledFile } from '../utils/parseData'
import { parseIvDocx } from '../utils/parseIvDocx'
import type { ParsedData } from '../types'
import './Step1Upload.css'

const Step1Upload: FC = () => {
  const { state, dispatch } = useApp()
  const { parsedData, ivData } = state
  const [spectraError, setSpectraError] = useState<string | null>(null)
  const [ivError, setIvError] = useState<string | null>(null)

  const readSpectra = useCallback((file: File) => {
    setSpectraError(null)
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const text = e.target?.result as string
        dispatch({ type: 'SET_PARSED_DATA', payload: parseOledFile(text, file.name) })
      } catch (err) {
        setSpectraError(err instanceof Error ? err.message : 'Не вдалося розібрати файл.')
      }
    }
    reader.readAsText(file)
  }, [dispatch])

  const readIv = useCallback((file: File) => {
    setIvError(null)
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const buffer = e.target?.result as ArrayBuffer
        dispatch({ type: 'SET_IV_DATA', payload: parseIvDocx(buffer, file.name) })
      } catch (err) {
        setIvError(err instanceof Error ? err.message : 'Не вдалося розібрати документ.')
      }
    }
    reader.readAsArrayBuffer(file)
  }, [dispatch])

  return (
    <div className="step1">
      <div className="slots">
        <Slot
          title="Спектри випромінювання"
          hint="файл .txt з табуляцією — пара λ / значення на кожен набір"
          accept=".txt,.tsv,.dat"
          icon="📈"
          error={spectraError}
          onFile={readSpectra}
          summary={parsedData && `${parsedData.rows.length} рядків · ${parsedData.conditions.length} наборів`}
          fileName={parsedData?.fileName}
          onClear={() => { dispatch({ type: 'CLEAR_PARSED_DATA' }); setSpectraError(null) }}
        />
        <Slot
          title="Вимірювання ВАХ"
          hint="файл .docx з приладу — розгортки V1 / I1 / I2"
          accept=".docx"
          icon="⚡"
          error={ivError}
          onFile={readIv}
          summary={ivData && `${ivData.blocks.length} вимірів · по ${ivData.blocks[0].rows.length} точок`}
          fileName={ivData?.fileName}
          onClear={() => { dispatch({ type: 'SET_IV_DATA', payload: null }); setIvError(null) }}
        />
      </div>

      {parsedData && (
        <DataPreview data={parsedData} onNext={() => dispatch({ type: 'SET_STEP', payload: 2 })} />
      )}
    </div>
  )
}

interface SlotProps {
  title: string
  hint: string
  accept: string
  icon: string
  error: string | null
  summary: string | null | undefined | false
  fileName: string | undefined
  onFile: (file: File) => void
  onClear: () => void
}

const Slot: FC<SlotProps> = ({ title, hint, accept, icon, error, summary, fileName, onFile, onClear }) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) onFile(file)
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) onFile(file)
    e.target.value = ''
  }

  const picker: ReactNode = (
    <input
      ref={inputRef}
      type="file"
      accept={accept}
      style={{ display: 'none' }}
      onChange={handleChange}
    />
  )

  if (fileName) {
    return (
      <div className="slot slot--filled">
        <div className="slot__head">
          <span className="slot__title">{title}</span>
          <span className="slot__check">✓</span>
        </div>
        <span className="slot__file">{icon} {fileName}</span>
        <span className="slot__summary">{summary}</span>
        <div className="slot__actions">
          <button className="btn btn--ghost" onClick={() => inputRef.current?.click()}>Замінити</button>
          <button className="btn btn--ghost" onClick={onClear}>Прибрати</button>
        </div>
        {picker}
      </div>
    )
  }

  return (
    <div className="slot">
      <div className="slot__head">
        <span className="slot__title">{title}</span>
      </div>
      <div
        className={`dropzone${dragging ? ' dropzone--active' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && inputRef.current?.click()}
      >
        <div className="dropzone__icon">{icon}</div>
        <p className="dropzone__title">Перетягніть файл сюди</p>
        <p className="dropzone__sub">{hint}</p>
        {picker}
      </div>
      {error && <p className="step1__error">{error}</p>}
    </div>
  )
}

const PREVIEW_ROWS = 20

const DataPreview: FC<{ data: ParsedData; onNext: () => void }> = ({ data, onNext }) => {
  const preview = data.rows.slice(0, PREVIEW_ROWS)

  return (
    <div className="preview">
      <div className="preview__meta">
        <span className="preview__filename">📄 {data.fileName}</span>
        <span className="preview__stats">
          {data.rows.length} рядків · {data.conditions.length} наборів
        </span>
      </div>

      <div className="preview__table-wrap">
        <table className="preview__table">
          <thead>
            <tr>
              {data.conditions.map((cond, i) => (
                <th key={i} colSpan={2} className="preview__th-group">
                  V = {cond}
                </th>
              ))}
            </tr>
            <tr>
              {data.conditions.flatMap((_, i) => [
                <th key={`wl-${i}`} className="preview__th">λ, нм</th>,
                <th key={`val-${i}`} className="preview__th preview__th--value">Δ</th>,
              ])}
            </tr>
          </thead>
          <tbody>
            {preview.map((row, ri) => (
              <tr key={ri} className={ri % 2 === 0 ? '' : 'preview__tr--alt'}>
                {row.wavelengths.flatMap((wl, ci) => [
                  <td key={`wl-${ci}`} className="preview__td">{wl}</td>,
                  <td key={`val-${ci}`} className={`preview__td preview__td--value${row.values[ci] < 0 ? ' preview__td--neg' : ''}`}>
                    {row.values[ci]}
                  </td>,
                ])}
              </tr>
            ))}
          </tbody>
        </table>
        {data.rows.length > PREVIEW_ROWS && (
          <p className="preview__more">
            … ще {data.rows.length - PREVIEW_ROWS} рядків не показано
          </p>
        )}
      </div>

      <div className="preview__actions">
        <button className="btn btn--primary" onClick={onNext}>
          Далі →
        </button>
      </div>
    </div>
  )
}

export default Step1Upload
