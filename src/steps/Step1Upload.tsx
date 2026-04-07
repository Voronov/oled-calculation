import { useRef, useState, useCallback, type FC, type DragEvent, type ChangeEvent } from 'react'
import { useApp } from '../context/AppContext'
import { parseOledFile } from '../utils/parseData'
import type { ParsedData } from '../types'
import './Step1Upload.css'

const Step1Upload: FC = () => {
  const { state, dispatch } = useApp()
  const { parsedData } = state
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const processFile = useCallback((file: File) => {
    setError(null)
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const text = e.target?.result as string
        const data = parseOledFile(text, file.name)
        dispatch({ type: 'SET_PARSED_DATA', payload: data })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to parse file.')
      }
    }
    reader.readAsText(file)
  }, [dispatch])

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [processFile])

  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }, [processFile])

  const handleNext = () => {
    dispatch({ type: 'SET_STEP', payload: 2 })
  }

  const handleReset = () => {
    dispatch({ type: 'RESET' })
    setError(null)
  }

  return (
    <div className="step1">
      {!parsedData ? (
        <>
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
            <div className="dropzone__icon">📂</div>
            <p className="dropzone__title">Drop your data file here</p>
            <p className="dropzone__sub">or click to browse — tab-separated .txt file</p>
            <input
              ref={inputRef}
              type="file"
              accept=".txt,.tsv,.dat"
              style={{ display: 'none' }}
              onChange={handleChange}
            />
          </div>
          {error && <p className="step1__error">{error}</p>}
        </>
      ) : (
        <DataPreview data={parsedData} onReset={handleReset} onNext={handleNext} />
      )}
    </div>
  )
}

interface DataPreviewProps {
  data: ParsedData
  onReset: () => void
  onNext: () => void
}

const PREVIEW_ROWS = 20

const DataPreview: FC<DataPreviewProps> = ({ data, onReset, onNext }) => {
  const preview = data.rows.slice(0, PREVIEW_ROWS)

  return (
    <div className="preview">
      <div className="preview__meta">
        <span className="preview__filename">📄 {data.fileName}</span>
        <span className="preview__stats">
          {data.rows.length} rows · {data.conditions.length} conditions
        </span>
        <button className="btn btn--ghost" onClick={onReset}>
          Change file
        </button>
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
                <th key={`wl-${i}`} className="preview__th">λ (nm)</th>,
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
            … {data.rows.length - PREVIEW_ROWS} more rows not shown
          </p>
        )}
      </div>

      <div className="preview__actions">
        <button className="btn btn--primary" onClick={onNext}>
          Next →
        </button>
      </div>
    </div>
  )
}

export default Step1Upload
