
export const TEX = {
  T2: String.raw`T_2 = \int I_{\mathrm{OLED}}(\lambda)\,d\lambda`,
  T1: String.raw`T_1 = \int I_{\mathrm{OLED}}(\lambda)\,V(\lambda)\,d\lambda`,
  T0: String.raw`T_0 = \int I_{\mathrm{OLED}}(\lambda)\,PD(\lambda)\,d\lambda`,
  Kr: String.raw`K_r = 683\,\dfrac{T_1}{T_2}`,
  FF: String.raw`FF = \dfrac{T_0}{T_2}`,
  Lv: String.raw`L_v = K_r\cdot\dfrac{a\cdot 10^{-4}}{b\cdot c\cdot 10^{-7}\cdot FF}`,

  A: String.raw`A = V_1`,
  B: String.raw`B = \dfrac{I_1\cdot 1000}{S}`,
  C: String.raw`C = I_2\cdot k\cdot L_v - C_0`,
  D: String.raw`D = B`,
  E: String.raw`E = \dfrac{C}{D}\cdot 0{,}1`,
  F: String.raw`F = \dfrac{E\cdot\pi}{A}`,
  G: String.raw`G = \dfrac{\pi\,E\,e\,\lambda\cdot 100}{K_r\,h\,c}`,

  X: String.raw`X = \int S(\lambda)\,\bar x(\lambda)\,d\lambda`,
  Ytri: String.raw`Y = \int S(\lambda)\,\bar y(\lambda)\,d\lambda`,
  Ztri: String.raw`Z = \int S(\lambda)\,\bar z(\lambda)\,d\lambda`,
  cx: String.raw`x = \dfrac{X}{X+Y+Z}`,
  cy: String.raw`y = \dfrac{Y}{X+Y+Z}`,
  uv: String.raw`u' = \dfrac{4X}{X+15Y+3Z},\quad v' = \dfrac{9Y}{X+15Y+3Z}`,
  purity: String.raw`p_e = \dfrac{\left|(x,y)-(x_w,y_w)\right|}{\left|(x_\lambda,y_\lambda)-(x_w,y_w)\right|}`,
  cct: String.raw`CCT = 449n^3 + 3525n^2 + 6823{,}3\,n + 5520{,}33,\quad n = \dfrac{x-0{,}3320}{0{,}1858-y}`,
} as const

export const SYMBOL = {
  T2: 'T_2',
  T1: 'T_1',
  T0: 'T_0',
  Kr: 'K_r',
  FF: 'FF',
  Lv: 'L_v',
} as const
