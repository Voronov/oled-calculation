import { createContext, useContext, useReducer, type ReactNode } from 'react'
import type { AppState, AppAction } from '../types'
import { DEFAULT_LV_PARAMS } from '../utils/calculate'
import { DEFAULT_IV_PARAMS } from '../utils/ivCalc'

const initialState: AppState = {
  currentStep: 1,
  parsedData: null,
  normalizedData: null,
  selectedConditionIndex: null,
  calcResults: null,
  lvParams: DEFAULT_LV_PARAMS,
  ivData: null,
  ivParams: DEFAULT_IV_PARAMS,
  ivBaselines: {},
}

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_PARSED_DATA':
      return {
        ...initialState,
        lvParams: state.lvParams,
        ivData: state.ivData,
        ivParams: state.ivParams,
        ivBaselines: state.ivBaselines,
        parsedData: action.payload,
      }
    case 'SET_NORMALIZED_DATA':
      return { ...state, normalizedData: action.payload }
    case 'SET_SELECTED_CONDITION':
      return { ...state, selectedConditionIndex: action.payload, calcResults: null }
    case 'SET_CALC_RESULTS':
      return { ...state, calcResults: action.payload }
    case 'SET_LV_PARAMS':
      return { ...state, lvParams: action.payload }
    case 'SET_IV_DATA':
      return { ...state, ivData: action.payload }
    case 'SET_IV_PARAMS':
      return { ...state, ivParams: action.payload }
    case 'SET_IV_BASELINE': {
      const next = { ...state.ivBaselines }
      if (action.payload.baseline === null) delete next[action.payload.index]
      else next[action.payload.index] = action.payload.baseline
      return { ...state, ivBaselines: next }
    }
    case 'CLEAR_PARSED_DATA':
      return {
        ...initialState,
        lvParams: state.lvParams,
        ivData: state.ivData,
        ivParams: state.ivParams,
        ivBaselines: state.ivBaselines,
      }
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
