import { useMemo, type FC } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'

interface FormulaProps {
  tex: string
  block?: boolean
}

const Formula: FC<FormulaProps> = ({ tex, block = false }) => {
  const html = useMemo(
    () => katex.renderToString(tex, { throwOnError: false, displayMode: block, output: 'html' }),
    [tex, block],
  )
  return <span className="formula" dangerouslySetInnerHTML={{ __html: html }} />
}

export default Formula
