import { AppProvider, useApp } from './context/AppContext'
import Stepper from './components/Stepper'
import Step1Upload from './steps/Step1Upload'
import Step2Normalize from './steps/Step2Normalize'
import Step3Calculate from './steps/Step3Calculate'
import './App.css'

const STEPS = [
  { number: 1, label: 'Upload Data' },
  { number: 2, label: 'Configure' },
  { number: 3, label: 'Calculate' },
  { number: 4, label: 'Results' },
]

function AppContent() {
  const { state } = useApp()
  const { currentStep } = state

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1Upload />
      case 2:
        return <Step2Normalize />
      case 3:
        return <Step3Calculate />
      case 4:
        return <Placeholder title="Step 4: Results" />
      default:
        return null
    }
  }

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">OLED Calculator</h1>
        <p className="app__subtitle">Multi-step spectral analysis</p>
      </header>
      <main className="app__main">
        <Stepper steps={STEPS} current={currentStep} />
        {renderStep()}
      </main>
    </div>
  )
}

function Placeholder({ title }: { title: string }) {
  const { dispatch } = useApp()
  return (
    <div className="placeholder">
      <p className="placeholder__title">{title}</p>
      <p className="placeholder__sub">Coming soon</p>
      <button className="btn btn--ghost" onClick={() => dispatch({ type: 'SET_STEP', payload: 1 })}>
        ← Back to Upload
      </button>
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  )
}
