import { useEffect, useRef, useState, type FC, type ReactNode } from 'react'
import { echarts, applyView, interactionDefaults, type EChartsOption } from '../charts/echarts'
import './Chart.css'

interface ChartProps {
  title: string
  option: EChartsOption
  exportName: string
  height?: number
  logToggle?: boolean
  defaultLog?: boolean
  defaultPoints?: boolean
  extraSwitches?: ReactNode
}

const Chart: FC<ChartProps> = ({
  title,
  option,
  exportName,
  height = 320,
  logToggle = false,
  defaultLog = false,
  defaultPoints = false,
  extraSwitches,
}) => {
  const hostRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)
  const [log, setLog] = useState(defaultLog)
  const [showPoints, setShowPoints] = useState(defaultPoints)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const instance = echarts.init(host, undefined, { renderer: 'canvas' })
    chartRef.current = instance

    const observer = new ResizeObserver(() => instance.resize())
    observer.observe(host)

    return () => {
      observer.disconnect()
      instance.dispose()
      chartRef.current = null
    }
  }, [])

  useEffect(() => {
    chartRef.current?.setOption(
      { ...interactionDefaults(exportName), ...applyView(option, { log, showPoints }) },
      { notMerge: true },
    )
  }, [option, exportName, log, showPoints])

  return (
    <div className="chart">
      <div className="chart__bar">
        <span className="chart__title">{title}</span>
        <div className="chart__switches">
          {extraSwitches}
          {logToggle && (
            <button
              className={`chart__switch${log ? ' chart__switch--on' : ''}`}
              onClick={() => setLog(v => !v)}
              title="Лінійна / логарифмічна вісь Y"
            >
              {log ? 'log' : 'lin'}
            </button>
          )}
          <button
            className={`chart__switch${showPoints ? ' chart__switch--on' : ''}`}
            onClick={() => setShowPoints(v => !v)}
            title="Показати або сховати точки"
          >
            точки
          </button>
        </div>
      </div>
      <div ref={hostRef} className="chart__canvas" style={{ height }} />
      <p className="chart__hint">
        колесо — масштаб X · shift+колесо — масштаб Y · перетягування — зсув · панель — рамка, скидання, PNG
      </p>
    </div>
  )
}

export default Chart
