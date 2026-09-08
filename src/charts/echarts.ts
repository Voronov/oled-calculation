import * as echarts from 'echarts/core'
import { LineChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  ToolboxComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { EChartsOption } from 'echarts'

echarts.use([
  LineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  ToolboxComponent,
  CanvasRenderer,
])

export { echarts }
export type { EChartsOption }

export const AXIS_LABEL = { fontSize: 11, color: '#64748b' } as const
export const AXIS_NAME = { fontSize: 12, color: '#64748b' } as const

export function interactionDefaults(exportName: string): EChartsOption {
  return {
    animation: false,
    textStyle: { fontFamily: 'system-ui, Segoe UI, sans-serif' },
    dataZoom: [
      { type: 'inside', xAxisIndex: 0, filterMode: 'none' },
      { type: 'inside', yAxisIndex: 0, filterMode: 'none', zoomOnMouseWheel: 'shift' },
    ],
    toolbox: {
      right: 4,
      top: 0,
      itemSize: 13,
      iconStyle: { borderColor: '#94a3b8' },
      feature: {
        dataZoom: { title: { zoom: 'Масштаб рамкою', back: 'Скасувати масштаб' }, yAxisIndex: 'none' },
        restore: { title: 'Скинути' },
        saveAsImage: { title: 'Зберегти PNG', name: exportName, pixelRatio: 2, backgroundColor: '#fff' },
      },
    },
    tooltip: {
      trigger: 'axis',
      confine: true,
      textStyle: { fontSize: 12 },
      axisPointer: { type: 'cross', lineStyle: { color: '#cbd5e1' } },
    },
  }
}

interface ViewState {
  log: boolean
  showPoints: boolean
}

export function applyView(option: EChartsOption, { log, showPoints }: ViewState): EChartsOption {
  const yAxes = Array.isArray(option.yAxis) ? option.yAxis : [option.yAxis]
  const series = Array.isArray(option.series) ? option.series : [option.series]

  return {
    ...option,
    yAxis: yAxes.map(axis => {
      const next: Record<string, unknown> = { ...(axis as object), type: log ? 'log' : 'value' }
      // a log axis cannot start at zero
      if (log) { delete next.min; delete next.max }
      return next
    }),
    series: series.map(s => ({
      ...(s as object),
      showSymbol: showPoints,
      symbol: 'circle',
      symbolSize: 4,
    })),
  } as EChartsOption
}

export function renderToDataUrl(option: EChartsOption, width = 760, height = 380): string {
  const host = document.createElement('div')
  host.style.cssText = `position:absolute;left:-10000px;width:${width}px;height:${height}px`
  document.body.appendChild(host)

  const instance = echarts.init(host, undefined, { renderer: 'canvas', width, height })
  instance.setOption({ ...option, animation: false, toolbox: { show: false }, dataZoom: [] })
  const url = instance.getDataURL({ pixelRatio: 2, backgroundColor: '#fff' })

  instance.dispose()
  host.remove()
  return url
}
