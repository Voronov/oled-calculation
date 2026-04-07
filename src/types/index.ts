export interface DataRow {
  wavelengths: number[]
  values: number[]
}

export interface ParsedData {
  fileName: string
  conditions: number[]
  rows: DataRow[]
}

export interface NormalizedData {
  conditions: number[]
  rows: Array<{
    wavelength: number
    normalizedValues: number[]
  }>
  stats: Array<{ min: number; max: number }>
}

export interface XYPoint {
  x: number
  y: number
}

export interface ReferenceData {
  eye: XYPoint[]       // col3, col4 — V(λ) eye sensitivity
  photodiode: XYPoint[] // col5, col6 — photodiode response
}

export interface CalcResults {
  T2: number  // ∫ OLED dλ
  T1: number  // ∫ (OLED × eye) dλ
  T0: number  // ∫ (OLED × photodiode) dλ
  Kr: number  // 683 × T1/T2
  FF: number  // T0/T2
  oledPoints: XYPoint[]
  eyeRef: XYPoint[]        // raw eye sensitivity curve (col3,col4)
  photoRef: XYPoint[]      // raw photodiode response curve (col5,col6)
  oledEyePoints: XYPoint[] // OLED × eye product
  oledPhotoPoints: XYPoint[] // OLED × photodiode product
}

export interface AppState {
  currentStep: number
  parsedData: ParsedData | null
  normalizedData: NormalizedData | null
  /** Index into conditions array selected for calculation */
  selectedConditionIndex: number | null
  calcResults: CalcResults | null
}

export type AppAction =
  | { type: 'SET_PARSED_DATA'; payload: ParsedData }
  | { type: 'SET_NORMALIZED_DATA'; payload: NormalizedData }
  | { type: 'SET_SELECTED_CONDITION'; payload: number | null }
  | { type: 'SET_CALC_RESULTS'; payload: CalcResults }
  | { type: 'SET_STEP'; payload: number }
  | { type: 'RESET' }
