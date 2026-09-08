import { useEffect, useRef, useState, type FC } from 'react'
import { drawCieDiagram, SPACES, CIE_W, CIE_H, type CieSpace } from '../charts/cie'
import type { Chromaticity } from '../utils/colorimetry'
import './CieDiagram.css'

interface CieDiagramProps {
  sample: Chromaticity | null
  boundary: Chromaticity | null
}

const CieDiagram: FC<CieDiagramProps> = ({ sample, boundary }) => {
  const ref = useRef<HTMLCanvasElement>(null)
  const [space, setSpace] = useState<CieSpace>('1931')

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = CIE_W * dpr
    canvas.height = CIE_H * dpr

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(dpr, dpr)
    drawCieDiagram(ctx, space, sample, boundary)
  }, [space, sample, boundary])

  return (
    <div className="cie">
      <div className="cie__bar">
        <span className="cie__title">{SPACES[space].title}</span>
        <div className="cie__tabs" role="tablist">
          {(['1931', '1976'] as CieSpace[]).map(id => (
            <button
              key={id}
              role="tab"
              aria-selected={space === id}
              className={`cie__tab${space === id ? ' cie__tab--active' : ''}`}
              onClick={() => setSpace(id)}
            >
              CIE {id}
            </button>
          ))}
        </div>
      </div>
      <canvas ref={ref} className="cie__canvas" style={{ aspectRatio: `${CIE_W} / ${CIE_H}` }} />
    </div>
  )
}

export default CieDiagram
