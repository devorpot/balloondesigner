export const PX_PER_CM = 10
export const MIN_CANVAS_CM = 10
export const MAX_CANVAS_CM = 500
export const MIN_DISPLAY_SCALE = 0.3
export const MAX_DISPLAY_SCALE = 1.5
export const DEFAULT_DISPLAY_SCALE = 1

export function createDefaultCanvasSettings() {
  return {
    widthCm: 160,
    heightCm: 90,
    offsetXcm: 0,
    offsetYcm: 0,
    lockRatio: true,
    backgroundColor: '#ffffff',
    displayScale: DEFAULT_DISPLAY_SCALE,
  }
}
