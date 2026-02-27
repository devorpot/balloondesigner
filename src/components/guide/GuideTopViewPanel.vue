<template>
  <div class="card border-0 shadow-sm panel-card guide-panel">
    <div class="card-body panel-body">
      <div class="panel-head">
        <div class="panel-title"><i class="bi bi-eye me-2"></i>Vista arriba</div>
        <button
          class="btn btn-sm btn-outline-secondary icon-btn"
          type="button"
          @click="collapsed = !collapsed"
          :title="collapsed ? 'Expandir' : 'Contraer'"
        >
          <i class="bi" :class="collapsed ? 'bi-chevron-down' : 'bi-chevron-up'"></i>
        </button>
      </div>

      <div v-show="!collapsed" class="panel-content">
        <div class="text-muted panel-subtitle">Vista superior de la columna seleccionada.</div>
        <div v-if="groupName" class="text-muted panel-subtitle">
          <i class="bi bi-collection me-1"></i>{{ groupName }}
        </div>

        <div class="form-check form-switch mt-2">
          <input
            id="guide-top-view-toggle"
            class="form-check-input"
            type="checkbox"
            :checked="showTopView"
            @change="toggleTopView($event.target.checked)"
          />
          <label class="form-check-label" for="guide-top-view-toggle">Mostrar vista arriba</label>
        </div>

        <div v-if="showTopView" class="form-check form-switch mt-2">
          <input
            id="guide-top-view-click-drag"
            class="form-check-input"
            type="checkbox"
            :checked="clickDragEnabled"
            @change="toggleClickDrag($event.target.checked)"
          />
          <label class="form-check-label" for="guide-top-view-click-drag">Arrastrar con clic</label>
        </div>
        <div v-if="showTopView && clickDragEnabled" class="text-muted xsmall mt-1">
          Click en un globo para moverlo, click de nuevo para soltar.
        </div>

        <div v-if="showTopView" class="top-view-wrap mt-2">
          <div ref="canvasRef" class="top-view-canvas">
            <div
              v-for="bubble in layout"
              :key="bubble.key"
              class="top-view-bubble"
              :style="bubble.style"
              draggable="false"
            >
              {{ bubble.label }}
            </div>
          </div>
        </div>
        <div v-if="showTopView" class="d-flex flex-wrap gap-2 mt-2">
          <button class="btn btn-sm btn-outline-secondary" type="button" @click="openModal">
            <i class="bi bi-arrows-fullscreen me-1"></i>Vista grande
          </button>
        </div>
        <div v-if="showTopView && extraLabel" class="text-muted xsmall mt-1">
          {{ extraLabel }}
        </div>
      </div>
    </div>
  </div>

  <Teleport to="body">
    <div v-if="showModal" class="top-view-modal">
      <div class="top-view-modal__backdrop" @click="closeModal"></div>
      <div
        ref="modalDialogRef"
        class="top-view-modal__dialog"
        role="dialog"
        aria-modal="true"
        :style="{ transform: modalTransform }"
      >
        <div ref="modalHeaderRef" class="top-view-modal__header" @pointerdown="onModalHeaderDown">
          <div class="fw-bold">Vista arriba</div>
          <div class="d-flex gap-2">
            <button class="btn btn-sm btn-outline-secondary" type="button" @click="centerModal">
              Centrar
            </button>
            <button class="btn btn-sm btn-outline-secondary" type="button" @click="closeModal">
              Cerrar
            </button>
          </div>
        </div>
        <div class="top-view-modal__body">
          <div
            ref="modalCanvasRef"
            class="top-view-canvas top-view-canvas--modal"
            :class="{ 'is-dragging': dragState.active }"
            @pointermove="onModalMove"
            @pointerup="onModalUp"
            @pointerleave="onModalLeave"
            @mousemove="onModalMove"
            @mouseup="onModalUp"
            @mouseleave="onModalLeave"
            @click="onModalClick"
          >
            <div
              v-for="bubble in layoutModal"
              :key="bubble.key"
              class="top-view-bubble"
              :style="bubble.style"
              draggable="false"
              @pointerdown="onModalBubbleDown(bubble, $event)"
              @mousedown="onModalBubbleDown(bubble, $event)"
              @touchstart="onModalBubbleDown(bubble, $event)"
              @click.stop
            >
              {{ bubble.label }}
            </div>
          </div>
          <div class="text-muted xsmall mt-2">Arrastra los globos para acomodarlos.</div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'

const collapsed = ref(false)
const showTopView = ref(false)
const canvasRef = ref(null)
const modalCanvasRef = ref(null)
const canvasSize = ref(200)
const modalCanvasSize = ref(360)
const showModal = ref(false)
const clickDragEnabled = ref(false)
const modalDialogRef = ref(null)
const modalHeaderRef = ref(null)
const modalDrag = reactive({
  active: false,
  startX: 0,
  startY: 0,
  originX: 0,
  originY: 0,
  offsetX: 0,
  offsetY: 0,
})
const dragState = reactive({
  active: false,
  mode: 'hold',
  id: null,
  base: 0,
  radius: 0,
})
const TOP_VIEW_RANGE = 3
const MIN_RADIUS = 0.2
let resizeObserver = null
let modalResizeObserver = null
let keyHandler = null
let windowResizeHandler = null

const props = defineProps({
  groupName: { type: String, default: '' },
  nodes: { type: Array, default: () => [] },
  totalCount: { type: Number, default: 0 },
  viewSide: { type: String, default: 'front' },
})

const emit = defineEmits(['drag-start', 'drag-move', 'drag-end'])

const maxRadius = computed(() => {
  let maxValue = 0
  for (const node of props.nodes || []) {
    const rx = scaledRadiusX(node)
    const ry = scaledRadiusY(node)
    maxValue = Math.max(maxValue, rx, ry)
  }
  return maxValue || 1
})

const layout = computed(() => buildLayout(canvasSize.value, { baseScale: 0.12 }))
const layoutModal = computed(() => buildLayout(modalCanvasSize.value, { baseScale: 0.18 }))
const modalTransform = computed(() => `translate(${modalDrag.offsetX}px, ${modalDrag.offsetY}px)`)

const extraLabel = computed(() => {
  const total = Number(props.totalCount || 0)
  if (total > 0) return `Total: ${total}`
  return ''
})

function toggleTopView(value) {
  showTopView.value = !!value
}

function toggleClickDrag(value) {
  clickDragEnabled.value = !!value
  if (!clickDragEnabled.value && dragState.mode === 'click') stopDrag()
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

function onModalBubbleDown(bubble, event) {
  if (!bubble?.id) return
  if (event?.cancelable) event.preventDefault()
  if (event?.stopPropagation) event.stopPropagation()

  if (clickDragEnabled.value) {
    if (dragState.active && String(dragState.id) === String(bubble.id)) {
      stopDrag()
      return
    }
    startDrag(bubble, 'click')
    return
  }

  if (dragState.active) return
  startDrag(bubble, 'hold')
}

function onModalMove(event) {
  if (!dragState.active) return
  if (event?.cancelable) event.preventDefault()
  applyMoveFromEvent(event)
}

function onModalUp() {
  if (!dragState.active) return
  if (dragState.mode === 'hold') stopDrag()
}

function onModalLeave() {
  if (!dragState.active) return
  if (dragState.mode === 'hold') stopDrag()
}

function onModalClick(event) {
  if (!dragState.active) return
  if (dragState.mode !== 'click') return
  if (event?.target !== event?.currentTarget) return
  stopDrag()
}

function startDrag(bubble, mode) {
  const host = modalCanvasRef.value
  if (!host) return
  const rect = host.getBoundingClientRect()
  const base = bubble.base || Math.max(140, Math.min(rect.width, rect.height)) * 0.18
  dragState.active = true
  dragState.mode = mode
  dragState.id = bubble.id
  dragState.base = base
  dragState.radius = bubble.radius || base
  emit('drag-start')
}

function stopDrag() {
  if (!dragState.active) return
  dragState.active = false
  dragState.id = null
  emit('drag-end')
}

function applyMoveFromEvent(event) {
  const point = getEventPoint(event)
  if (!point) return
  const host = modalCanvasRef.value
  if (!host || !dragState.id) return
  const rect = host.getBoundingClientRect()
  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2
  const limitX = rect.width / 2 - dragState.radius
  const limitY = rect.height / 2 - dragState.radius
  const dx = point.x - centerX
  const dy = point.y - centerY
  const clampedX = clamp(dx, -limitX, limitX)
  const clampedY = clamp(dy, -limitY, limitY)
  let nextX = dragState.base ? clampedX / dragState.base : 0
  if (props.viewSide === 'back') nextX = -nextX
  const nextY = dragState.base ? clampedY / dragState.base : 0
  emit('drag-move', { id: dragState.id, x: nextX, y: nextY })
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function updateCanvasSize() {
  if (!canvasRef.value) return
  const rect = canvasRef.value.getBoundingClientRect()
  const size = Math.min(rect.width, rect.height)
  if (Number.isFinite(size) && size > 0) canvasSize.value = size
}

function updateModalCanvasSize() {
  if (!modalCanvasRef.value) return
  const rect = modalCanvasRef.value.getBoundingClientRect()
  const size = Math.min(rect.width, rect.height)
  if (Number.isFinite(size) && size > 0) modalCanvasSize.value = size
}

function openModal() {
  showModal.value = true
}

function closeModal() {
  showModal.value = false
}

function centerModal() {
  modalDrag.offsetX = 0
  modalDrag.offsetY = 0
}

function getModalDragBounds() {
  const dialog = modalDialogRef.value
  if (!dialog) return null
  const rect = dialog.getBoundingClientRect()
  const headerRect = modalHeaderRef.value?.getBoundingClientRect?.()
  const headerHeight = Number(headerRect?.height || 0) || 42
  const margin = 12
  const centerX = window.innerWidth / 2
  const centerY = window.innerHeight / 2
  const halfW = rect.width / 2
  const halfH = rect.height / 2
  const maxX = Math.max(0, centerX - margin - halfW)
  const minY = halfH - centerY + margin
  const maxY = centerY - margin - headerHeight + halfH
  return { maxX, minY, maxY: Math.max(minY, maxY) }
}

function clampModalOffset(nextX, nextY) {
  const bounds = getModalDragBounds()
  if (!bounds) return { x: nextX, y: nextY }
  return {
    x: clamp(nextX, -bounds.maxX, bounds.maxX),
    y: clamp(nextY, bounds.minY, bounds.maxY),
  }
}

function onModalHeaderDown(event) {
  if (!event) return
  if (typeof event.button === 'number' && event.button !== 0) return
  const target = event.target
  if (target && target.closest && target.closest('button')) return
  event.preventDefault()
  modalDrag.active = true
  modalDrag.startX = event.clientX
  modalDrag.startY = event.clientY
  modalDrag.originX = modalDrag.offsetX
  modalDrag.originY = modalDrag.offsetY
  window.addEventListener('pointermove', onModalHeaderMove, { passive: false })
  window.addEventListener('pointerup', onModalHeaderUp, { passive: true })
}

function onModalHeaderMove(event) {
  if (!modalDrag.active || !event) return
  if (event.cancelable) event.preventDefault()
  const dx = event.clientX - modalDrag.startX
  const dy = event.clientY - modalDrag.startY
  const nextX = modalDrag.originX + dx
  const nextY = modalDrag.originY + dy
  const clamped = clampModalOffset(nextX, nextY)
  modalDrag.offsetX = clamped.x
  modalDrag.offsetY = clamped.y
}

function onModalHeaderUp() {
  if (!modalDrag.active) return
  modalDrag.active = false
  window.removeEventListener('pointermove', onModalHeaderMove)
  window.removeEventListener('pointerup', onModalHeaderUp)
}

function buildLayout(sizeInput, options = {}) {
  const list = Array.isArray(props.nodes) ? props.nodes : []
  const size = Math.max(140, Number(sizeInput || 0))
  const center = size / 2
  const baseScale = Number(options.baseScale ?? 0.18)
  const base = size * baseScale
  const maxR = maxRadius.value || 1
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
  let centerX = countX ? sumX / countX : 0
  if (Number.isFinite(minLeft) && Number.isFinite(maxRight)) {
    centerX = (minLeft + maxRight) / 2
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
      : (nodeX - centerX) / circleScale
    if (props.viewSide === 'back') resolvedX = -resolvedX
    return {
      node,
      index,
      radius,
      ratio,
      topView: { x: resolvedX, y: resolvedY },
    }
  })

  let maxRatio = 0
  let maxDist = 0
  let minDist = Infinity
  for (const entry of entries) {
    maxRatio = Math.max(maxRatio, entry.ratio)
    const dist = Math.hypot(entry.topView.x, entry.topView.y)
    maxDist = Math.max(maxDist, dist)
  }

  if (entries.length > 1) {
    for (let i = 0; i < entries.length; i += 1) {
      for (let j = i + 1; j < entries.length; j += 1) {
        const dx = entries[i].topView.x - entries[j].topView.x
        const dy = entries[i].topView.y - entries[j].topView.y
        const dist = Math.hypot(dx, dy)
        if (dist > 0) minDist = Math.min(minDist, dist)
      }
    }
  }

  const positionScale =
    Number.isFinite(minDist) && minDist > 0 ? Math.min(1, (2 * maxRatio) / minDist) : 1
  const padding = 10
  const maxExtent = maxDist * positionScale + maxRatio
  const fitBase = maxExtent > 0 ? (size / 2 - padding) / maxExtent : base
  const finalBase = Math.min(base, fitBase)
  const scaledBase = finalBase * positionScale

  return entries.map((entry) => {
    const bubbleRadius = finalBase * entry.ratio
    const x = center + entry.topView.x * scaledBase
    const y = center + entry.topView.y * scaledBase
    const strokeColor = String(entry.node?.color || '#111111')
    const bubbleColors = resolveBubbleColors(entry.node, strokeColor)
    return {
      id: entry.node?.id,
      key: entry.node?.id || `pos_${entry.index}`,
      label: entry.index + 1,
      color: strokeColor,
      centerX: x,
      centerY: y,
      radius: bubbleRadius,
      base: scaledBase,
      topView: entry.topView,
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

function getEventPoint(event) {
  if (!event) return null
  if (event.touches && event.touches.length) {
    return { x: event.touches[0].clientX, y: event.touches[0].clientY }
  }
  if (event.changedTouches && event.changedTouches.length) {
    return { x: event.changedTouches[0].clientX, y: event.changedTouches[0].clientY }
  }
  if (Number.isFinite(event.clientX) && Number.isFinite(event.clientY)) {
    return { x: event.clientX, y: event.clientY }
  }
  return null
}

onMounted(() => {
  updateCanvasSize()
  if (canvasRef.value && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => updateCanvasSize())
    resizeObserver.observe(canvasRef.value)
  }
  keyHandler = (event) => {
    if (event?.key === 'Escape') stopDrag()
  }
  window.addEventListener('keydown', keyHandler, { passive: true })
  windowResizeHandler = () => {
    if (!showModal.value) return
    const clamped = clampModalOffset(modalDrag.offsetX, modalDrag.offsetY)
    modalDrag.offsetX = clamped.x
    modalDrag.offsetY = clamped.y
  }
  window.addEventListener('resize', windowResizeHandler, { passive: true })
  try {
    const saved = localStorage.getItem('guide_panel_top_view_collapsed')
    if (saved !== null) collapsed.value = saved === 'true'
  } catch {
    // ignore
  }
  try {
    const savedShow = localStorage.getItem('guide_panel_top_view_show')
    if (savedShow !== null) showTopView.value = savedShow === 'true'
  } catch {
    // ignore
  }
  try {
    const savedClick = localStorage.getItem('guide_panel_top_view_click_drag')
    if (savedClick !== null) clickDragEnabled.value = savedClick === 'true'
  } catch {
    // ignore
  }
})

onBeforeUnmount(() => {
  stopDrag()
  if (resizeObserver && canvasRef.value) resizeObserver.unobserve(canvasRef.value)
  resizeObserver = null
  if (modalResizeObserver && modalCanvasRef.value)
    modalResizeObserver.unobserve(modalCanvasRef.value)
  modalResizeObserver = null
  if (keyHandler) window.removeEventListener('keydown', keyHandler)
  keyHandler = null
  if (windowResizeHandler) window.removeEventListener('resize', windowResizeHandler)
  windowResizeHandler = null
  window.removeEventListener('pointermove', onModalHeaderMove)
  window.removeEventListener('pointerup', onModalHeaderUp)
})

watch(collapsed, (value) => {
  try {
    localStorage.setItem('guide_panel_top_view_collapsed', String(value))
  } catch {
    // ignore
  }
})

watch(clickDragEnabled, (value) => {
  try {
    localStorage.setItem('guide_panel_top_view_click_drag', String(value))
  } catch {
    // ignore
  }
  if (!value && dragState.mode === 'click') stopDrag()
})

watch(showTopView, (value) => {
  try {
    localStorage.setItem('guide_panel_top_view_show', String(value))
  } catch {
    // ignore
  }
  if (!value) {
    showModal.value = false
    stopDrag()
  }
  if (value) {
    requestAnimationFrame(() => {
      updateCanvasSize()
      if (canvasRef.value && typeof ResizeObserver !== 'undefined' && !resizeObserver) {
        resizeObserver = new ResizeObserver(() => updateCanvasSize())
        resizeObserver.observe(canvasRef.value)
      }
    })
  }
})

watch(showModal, (value) => {
  if (!value) {
    if (modalResizeObserver && modalCanvasRef.value)
      modalResizeObserver.unobserve(modalCanvasRef.value)
    modalResizeObserver = null
    if (dragState.active) stopDrag()
    if (modalDrag.active) onModalHeaderUp()
    return
  }
  requestAnimationFrame(() => {
    updateModalCanvasSize()
    if (modalCanvasRef.value && typeof ResizeObserver !== 'undefined' && !modalResizeObserver) {
      modalResizeObserver = new ResizeObserver(() => updateModalCanvasSize())
      modalResizeObserver.observe(modalCanvasRef.value)
    }
    const clamped = clampModalOffset(modalDrag.offsetX, modalDrag.offsetY)
    modalDrag.offsetX = clamped.x
    modalDrag.offsetY = clamped.y
  })
})
</script>

<style scoped>
.top-view-wrap {
  display: flex;
  justify-content: center;
}

.top-view-canvas {
  position: relative;
  width: 100%;
  max-width: 220px;
  aspect-ratio: 1 / 1;
  border: 2px solid #111;
  border-radius: 10px;
  background: #fff;
  touch-action: none;
}

.top-view-canvas--modal {
  max-width: 680px;
  width: min(86vw, 680px);
  height: min(70vh, 680px);
}

.top-view-canvas.is-dragging {
  cursor: grabbing;
}

.top-view-bubble {
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
  cursor: grab;
}

.top-view-bubble:active {
  cursor: grabbing;
}

@media (max-width: 600px) {
  .top-view-canvas {
    max-width: 180px;
  }
  .top-view-canvas--modal {
    width: min(90vw, 420px);
  }
  .top-view-bubble {
    font-size: 0.9rem;
  }
}

.top-view-modal {
  position: fixed;
  inset: 0;
  z-index: 2005;
  display: flex;
  align-items: center;
  justify-content: center;
}

.top-view-modal__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
}

.top-view-modal__dialog {
  position: relative;
  z-index: 1;
  width: min(94vw, 860px);
  height: min(86vh, 820px);
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.25);
  padding: 16px 18px 20px;
  display: flex;
  flex-direction: column;
}

.top-view-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  cursor: move;
  user-select: none;
}

.top-view-modal__body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  flex: 1 1 auto;
  min-height: 0;
}
</style>
