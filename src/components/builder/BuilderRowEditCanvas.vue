<template>
  <div class="row-edit-canvas-wrap">
    <div ref="canvasRef" class="row-edit-canvas">
      <div
        v-for="bubble in layout"
        :key="bubble.key"
        class="row-edit-bubble"
        :class="{ 'is-selected': String(bubble.id) === String(selectedBubbleId) }"
        :style="bubble.style"
        @click="emitSelect(bubble.id)"
      >
        {{ bubble.label }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps({
  nodes: { type: Array, default: () => [] },
  viewSide: { type: String, default: 'front' },
  layout: { type: String, default: 'wall' },
  selectedBubbleId: { type: [String, Number], default: '' },
})

const emit = defineEmits(['select-bubble'])

const canvasRef = ref(null)
const canvasSize = ref({ width: 420, height: 420 })
const TOP_VIEW_RANGE = 3
const MIN_RADIUS = 0.2
let resizeObserver = null

const maxRadius = computed(() => {
  let maxValue = 0
  for (const node of props.nodes || []) {
    const rx = scaledRadiusX(node)
    const ry = scaledRadiusY(node)
    maxValue = Math.max(maxValue, rx, ry)
  }
  return maxValue || 1
})

const layout = computed(() =>
  buildLayout(canvasSize.value, {
    baseScale: 0.2,
    useNodePositions: props.layout !== 'circle',
  }),
)

function emitSelect(id) {
  if (!id) return
  emit('select-bubble', String(id))
}

function scaledRadiusX(node) {
  const scaleX = Math.abs(Number(node?.scaleX ?? 1)) || 1
  return Math.max(0, Number(node?.meta?.radiusX || 0) * scaleX)
}

function scaledRadiusY(node) {
  const scaleY = Math.abs(Number(node?.scaleY ?? 1)) || 1
  return Math.max(0, Number(node?.meta?.radiusY || 0) * scaleY)
}

function scaledRadius(node) {
  return Math.max(scaledRadiusX(node), scaledRadiusY(node))
}

function parseRgb(color) {
  const raw = String(color || '').trim()
  if (!raw) return null
  if (raw.startsWith('#')) {
    let hex = raw.slice(1)
    if (hex.length === 3) {
      hex = `${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`
    }
    if (hex.length >= 6) {
      const r = parseInt(hex.slice(0, 2), 16)
      const g = parseInt(hex.slice(2, 4), 16)
      const b = parseInt(hex.slice(4, 6), 16)
      if (Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b)) return { r, g, b }
    }
  }

  const match = raw.match(/rgba?\(([^)]+)\)/i)
  if (match) {
    const parts = match[1].split(',').map((v) => Number(v.trim()))
    if (parts.length >= 3) {
      const [r, g, b] = parts
      if (Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b)) return { r, g, b }
    }
  }

  return null
}

function isDarkColor(color) {
  const rgb = parseRgb(color)
  if (!rgb) return false
  const lum = rgb.r * 0.2126 + rgb.g * 0.7152 + rgb.b * 0.0722
  return lum < 140
}

function withAlpha(color, alpha = 1) {
  const a = clamp(alpha, 0, 1)
  if (!color) return `rgba(255,255,255,${a})`
  const raw = String(color).trim()
  if (raw.startsWith('#')) {
    let hex = raw.slice(1)
    if (hex.length === 3) {
      hex = `${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`
    }
    if (hex.length >= 6) {
      const r = parseInt(hex.slice(0, 2), 16)
      const g = parseInt(hex.slice(2, 4), 16)
      const b = parseInt(hex.slice(4, 6), 16)
      if (Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b)) {
        return `rgba(${r}, ${g}, ${b}, ${a})`
      }
    }
  }

  const match = raw.match(/rgba?\(([^)]+)\)/i)
  if (match) {
    const parts = match[1].split(',').map((v) => Number(v.trim()))
    if (parts.length >= 3) {
      const [r, g, b] = parts
      if (Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b)) {
        return `rgba(${r}, ${g}, ${b}, ${a})`
      }
    }
  }

  return raw
}

function resolveBubbleColors(node, strokeColor) {
  if (node?.meta?.guideLine) {
    const alphaRaw = Number(node?.meta?.guideFillAlpha)
    const alpha = Number.isFinite(alphaRaw) ? clamp(alphaRaw, 0, 100) / 100 : 1
    const fillBase = String(node?.meta?.guideFillColor || '#ffffff')
    const fill = withAlpha(fillBase, alpha)
    return {
      fill,
      text: isDarkColor(fillBase) ? '#fff' : '#111',
      border: '#111',
    }
  }

  const fill = strokeColor
  return {
    fill,
    text: isDarkColor(fill) ? '#fff' : '#111',
    border: strokeColor,
  }
}

function resolveFallbackTopView(index, total) {
  const base = [
    { x: -1, y: 0 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
  ]
  if (index < base.length) return base[index]
  const rest = Math.max(1, total - base.length)
  const angle = ((index - base.length) / rest) * Math.PI * 2
  const ring = 1.6
  return { x: Math.cos(angle) * ring, y: Math.sin(angle) * ring }
}

function buildLayout(sizeInput, options = {}) {
  const list = Array.isArray(props.nodes) ? props.nodes : []
  const width = Math.max(140, Number(sizeInput?.width || 0))
  const height = Math.max(140, Number(sizeInput?.height || 0))
  const sizeMin = Math.min(width, height)
  const centerX = width / 2
  const centerY = height / 2
  const baseScale = Number(options.baseScale ?? 0.18)
  const base = sizeMin * baseScale
  const maxR = maxRadius.value || 1
  const isCircle = props.layout === 'circle'
  let circleScaleFactor = 1

  if (isCircle) {
    const xValues = []
    let sumRadius = 0
    let countRadius = 0
    for (const node of list) {
      const x = Number(node?.x)
      if (Number.isFinite(x)) xValues.push(x)
      const r = scaledRadius(node)
      if (Number.isFinite(r) && r > 0) {
        sumRadius += r
        countRadius += 1
      }
    }
    const avgRadius = countRadius ? sumRadius / countRadius : 0
    if (avgRadius > 0 && xValues.length) {
      const minX = Math.min(...xValues)
      const maxX = Math.max(...xValues)
      const centerX = (minX + maxX) / 2
      const ringRadius = xValues.reduce((sum, x) => sum + Math.abs(x - centerX), 0) / xValues.length
      if (Number.isFinite(ringRadius) && ringRadius > 0) {
        circleScaleFactor = ringRadius / (avgRadius * 2)
        circleScaleFactor = Math.min(2, Math.max(0.5, circleScaleFactor))
      }
    }
  }

  if (options.useNodePositions) {
    let minLeft = Infinity
    let maxRight = -Infinity
    let minTop = Infinity
    let maxBottom = -Infinity
    for (const node of list) {
      const x = Number(node?.x)
      const y = Number(node?.y)
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue
      const r = scaledRadius(node)
      minLeft = Math.min(minLeft, x - r)
      maxRight = Math.max(maxRight, x + r)
      minTop = Math.min(minTop, y - r)
      maxBottom = Math.max(maxBottom, y + r)
    }

    if (Number.isFinite(minLeft) && Number.isFinite(minTop)) {
      const centerX = (minLeft + maxRight) / 2
      const centerY = (minTop + maxBottom) / 2
      const halfW = Math.max(1, (maxRight - minLeft) / 2)
      const halfH = Math.max(1, (maxBottom - minTop) / 2)
      const padding = 12
      const maxExtent = Math.max(halfW, halfH)
      const scale = (sizeMin / 2 - padding) / maxExtent

      return list.map((node, index) => {
        const radius = Math.max(scaledRadius(node), MIN_RADIUS)
        const dx = Number(node?.x) - centerX
        const dy = Number(node?.y) - centerY
        const flipX = props.viewSide === 'back' ? -1 : 1
        const x = centerX + dx * scale * flipX
        const y = centerY + dy * scale
        const bubbleRadius = radius * scale
        const strokeColor = String(node?.color || '#111111')
        const bubbleColors = resolveBubbleColors(node, strokeColor)
        return {
          id: node?.id,
          key: node?.id || `pos_${index}`,
          label: index + 1,
          centerX: x,
          centerY: y,
          radius: bubbleRadius,
          style: {
            left: `${x}px`,
            top: `${y}px`,
            width: `${bubbleRadius * 2}px`,
            height: `${bubbleRadius * 2}px`,
            borderColor: bubbleColors.border,
            backgroundColor: bubbleColors.fill,
            color: bubbleColors.text,
          },
        }
      })
    }
  }
  let sumX = 0
  let countX = 0
  let minLeft = Infinity
  let maxRight = -Infinity
  for (const node of list) {
    const x = Number(node?.x)
    if (!Number.isFinite(x)) continue
    const r = scaledRadius(node)
    sumX += x
    countX += 1
    minLeft = Math.min(minLeft, x - r)
    maxRight = Math.max(maxRight, x + r)
  }
  let nodesCenterX = countX ? sumX / countX : 0
  if (Number.isFinite(minLeft) && Number.isFinite(maxRight)) {
    nodesCenterX = (minLeft + maxRight) / 2
  }
  const circleScale = Math.max(1, Number(maxR || 1))
  const entries = list.map((node, index) => {
    const radius = Math.max(scaledRadius(node), MIN_RADIUS)
    const ratio = radius / circleScale
    const fallback = resolveFallbackTopView(index, list.length)
    const topViewMeta = node?.meta?.topView
    const metaX = Number(topViewMeta?.x)
    const metaY = Number(topViewMeta?.y)
    const isGuideLine = !!node?.meta?.guideLine
    const hasCustomTopView =
      Number.isFinite(metaX) &&
      Number.isFinite(metaY) &&
      (Math.abs(metaX) > 0.001 || Math.abs(metaY) > 0.001)
    const resolvedY = isGuideLine
      ? hasCustomTopView
        ? metaY
        : 0
      : Number.isFinite(metaY)
        ? metaY
        : fallback.y
    const nodeX = Number(node?.x)
    const useMeta = hasCustomTopView || !Number.isFinite(nodeX)
    let resolvedX = useMeta
      ? clamp(metaX, -TOP_VIEW_RANGE, TOP_VIEW_RANGE)
      : (nodeX - nodesCenterX) / circleScale
    if (props.viewSide === 'back') resolvedX = -resolvedX
    const adjustedTopView = isCircle
      ? { x: resolvedX * circleScaleFactor, y: resolvedY * circleScaleFactor }
      : { x: resolvedX, y: resolvedY }
    return {
      node,
      index,
      radius,
      ratio,
      topView: adjustedTopView,
    }
  })

  let maxRatio = 0
  let maxDist = 0
  for (const entry of entries) {
    maxRatio = Math.max(maxRatio, entry.ratio)
    const dist = Math.hypot(entry.topView.x, entry.topView.y)
    maxDist = Math.max(maxDist, dist)
  }

  const positionScale = 1
  const padding = 10
  const maxExtent = maxDist * positionScale + maxRatio
  const fitBase = maxExtent > 0 ? (sizeMin / 2 - padding) / maxExtent : base
  const finalBase = Math.min(base, fitBase)
  const scaledBase = finalBase * positionScale

  return entries.map((entry) => {
    const bubbleRadius = finalBase * entry.ratio
    const x = centerX + entry.topView.x * scaledBase
    const y = centerY + entry.topView.y * scaledBase
    const strokeColor = String(entry.node?.color || '#111111')
    const bubbleColors = resolveBubbleColors(entry.node, strokeColor)
    return {
      id: entry.node?.id,
      key: entry.node?.id || `pos_${entry.index}`,
      label: entry.index + 1,
      centerX: x,
      centerY: y,
      radius: bubbleRadius,
      style: {
        left: `${x}px`,
        top: `${y}px`,
        width: `${bubbleRadius * 2}px`,
        height: `${bubbleRadius * 2}px`,
        borderColor: bubbleColors.border,
        backgroundColor: bubbleColors.fill,
        color: bubbleColors.text,
      },
    }
  })
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function updateCanvasSize() {
  if (!canvasRef.value) return
  const rect = canvasRef.value.getBoundingClientRect()
  const width = Number(rect.width || 0)
  const height = Number(rect.height || 0)
  if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
    canvasSize.value = { width, height }
  }
}

onMounted(() => {
  updateCanvasSize()
  if (canvasRef.value && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => updateCanvasSize())
    resizeObserver.observe(canvasRef.value)
  }
})

onBeforeUnmount(() => {
  if (resizeObserver && canvasRef.value) resizeObserver.unobserve(canvasRef.value)
  resizeObserver = null
})
</script>

<style scoped>
.row-edit-canvas-wrap {
  display: flex;
  justify-content: center;
  width: 100%;
}

.row-edit-canvas {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 520px;
  border: 2px solid #111;
  border-radius: 12px;
  background: #fff;
}

.row-edit-bubble {
  position: absolute;
  border: 2px solid #111;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1rem;
  color: #111;
  background: rgba(255, 255, 255, 0.92);
  transform: translate(-50%, -50%);
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.08);
  user-select: none;
  cursor: pointer;
}

.row-edit-bubble.is-selected {
  box-shadow: 0 0 0 3px rgba(13, 110, 253, 0.35);
}

@media (max-width: 600px) {
  .row-edit-canvas {
    min-height: 360px;
  }
  .row-edit-bubble {
    font-size: 0.9rem;
  }
}
</style>
