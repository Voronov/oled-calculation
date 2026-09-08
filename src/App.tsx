import { AppProvider, useApp } from './context/AppContext'
import Stepper from './components/Stepper'
import Step1Upload from './steps/Step1Upload'
import Step2Analyze from './steps/Step2Analyze'
import Step3Report from './steps/Step3Report'
import './App.css'

const STEPS = [
  { number: 1, label: 'Завантаження' },
  { number: 2, label: 'Нормування і розрахунок' },
  { number: 3, label: 'Звіт' },
]

function AppContent() {
  const { state } = useApp()
  const { currentStep } = state

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1Upload />
      case 2:
        return <Step2Analyze />
      case 3:
        return <Step3Report />
      default:
        return null
    }
  }

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">Калькулятор OLED</h1>
        <p className="app__subtitle">Покроковий спектральний аналіз</p>
      </header>
      <main className="app__main">
        <Stepper steps={STEPS} current={currentStep} />
        {renderStep()}
      </main>
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
