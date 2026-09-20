const DEFAULT_COLOR = '#0f8a7a'

function rgb(hex: string) {
  const safe = /^#[0-9a-f]{6}$/i.test(hex) ? hex : DEFAULT_COLOR
  return [1, 3, 5].map(index => Number.parseInt(safe.slice(index, index + 2), 16))
}

function mix(color: number[], target: number[], amount: number) {
  return color.map((channel, index) => Math.round(channel + (target[index] - channel) * amount)).join(' ')
}

export function applyCabinetTheme(primaryColor?: string | null) {
  const color = rgb(primaryColor || DEFAULT_COLOR)
  const root = document.documentElement.style
  root.setProperty('--atlas-teal', color.join(' '))
  root.setProperty('--atlas-petrol', mix(color, [8, 36, 45], .58))
  root.setProperty('--atlas-aqua', mix(color, [255, 255, 255], .18))
  root.setProperty('--atlas-sage', mix(color, [255, 255, 255], .55))
  root.setProperty('--atlas-mist', mix(color, [255, 255, 255], .91))
  root.setProperty('--atlas-line', mix(color, [255, 255, 255], .82))
}

export { DEFAULT_COLOR }
