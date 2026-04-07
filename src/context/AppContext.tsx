import { createContext, useContext, useReducer, type ReactNode } from 'react'
import type { AppState, AppAction } from '../types'

const initialState: AppState = {
  currentStep: 1,
  parsedData: null,
  normalizedData: null,
  selectedConditionIndex: null,
  calcResults: null,
}

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_PARSED_DATA':
      return { ...initialState, parsedData: action.payload }
    case 'SET_NORMALIZED_DATA':
      return { ...state, normalizedData: action.payload }
    case 'SET_SELECTED_CONDITION':
      return { ...state, selectedConditionIndex: action.payload, calcResults: null }
    case 'SET_CALC_RESULTS':
      return { ...state, calcResults: action.payload }
    case 'SET_STEP':
      return { ...state, currentStep: action.payload }
    case 'RESET':
      return initialState
    default:
      return state
  }
}

interface AppContextValue {
  state: AppState
  dispatch: React.Dispatch<AppAction>
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
