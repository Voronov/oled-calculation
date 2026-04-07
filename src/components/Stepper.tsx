import type { FC } from 'react'
import './Stepper.css'

interface Step {
  label: string
  number: number
}

interface StepperProps {
  steps: Step[]
  current: number
}

const Stepper: FC<StepperProps> = ({ steps, current }) => {
  return (
    <div className="stepper">
      {steps.map((step, i) => {
        const status =
          step.number < current ? 'done' : step.number === current ? 'active' : 'pending'
        return (
          <div key={step.number} className="stepper__item">
            <div className={`stepper__circle stepper__circle--${status}`}>
              {status === 'done' ? '✓' : step.number}
            </div>
            <span className={`stepper__label stepper__label--${status}`}>{step.label}</span>
            {i < steps.length - 1 && (
              <div className={`stepper__line stepper__line--${status === 'done' ? 'done' : 'pending'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default Stepper
