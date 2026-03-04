<template>
  <div class="canvas-controls">
    <div class="control-group">
      <button
        class="control-btn"
        type="button"
        :class="{ active: !panMode }"
        title="Seleccionar"
        @click="setPan(false)"
      >
        <i class="bi bi-cursor"></i>
      </button>
      <button
        class="control-btn"
        type="button"
        :class="{ active: cropMode }"
        title="Recortar area"
        @click="toggleCrop"
      >
        <i class="bi bi-crop"></i>
      </button>
      <button
        class="control-btn"
        type="button"
        :class="{ active: panMode }"
        title="Mover lienzo"
        @click="setPan(true)"
      >
        <i class="bi bi-hand"></i>
      </button>
    </div>

    <div class="control-group">
      <button class="control-btn" type="button" title="Zoom out" @click="zoom(-1)">
        <i class="bi bi-zoom-out"></i>
      </button>
      <button class="control-btn" type="button" title="Zoom to fit" @click="zoomToFit">
        <i class="bi bi-arrows-fullscreen"></i>
      </button>
      <div class="zoom-indicator" title="Nivel de zoom">{{ zoomLabel }}</div>
      <div class="zoom-indicator" title="Escala visual">{{ displayScaleLabel }}</div>
      <button class="control-btn" type="button" title="Zoom in" @click="zoom(1)">
        <i class="bi bi-zoom-in"></i>
      </button>
    </div>

    <div class="control-group">
      <button
        class="control-btn wide"
        type="button"
        :class="{ active: !isBackView }"
        title="Vista frente"
        @click="setViewSide('front')"
      >
        Frente
      </button>
      <button
        class="control-btn wide"
        type="button"
        :class="{ active: isBackView }"
        title="Vista atras"
        @click="setViewSide('back')"
      >
        Atras
      </button>
    </div>

    <div class="control-group">
      <button class="control-btn" type="button" title="Reset view" @click="store.resetView()">
        <i class="bi bi-arrow-counterclockwise"></i>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { PX_PER_CM } from '@/constants/canvas'
import { useActiveEditorStore } from '@/stores/editor-context'

const store = useActiveEditorStore()

const panMode = computed(() => !!store.ui?.panMode)
const cropMode = computed(() => !!store.ui?.cropMode)
const zoomLabel = computed(() => `${Math.round((store.view?.scale || 1) * 100)}%`)
const displayScale = computed(() => Number(store.canvas?.displayScale || 1))
const displayScaleLabel = computed(() => `${Math.round(displayScale.value * 100)}%`)
const isBackView = computed(() => store.ui?.viewSide === 'back')
const renderScale = computed(() => (store.view?.scale || 1) * displayScale.value)
const viewOffsetX = computed(() => (store.view?.x || 0) * displayScale.value)
const viewOffsetY = computed(() => (store.view?.y || 0) * displayScale.value)
const canvasWidth = computed(() => Number(store.canvas?.widthCm || 0) * PX_PER_CM)

function toCanvasX(screenX) {
  const rs = renderScale.value
  if (!rs) return 0
  const raw = (screenX - viewOffsetX.value) / rs
  return isBackView.value ? canvasWidth.value - raw : raw
}

function toCanvasY(screenY) {
  const rs = renderScale.value
  if (!rs) return 0
  return (screenY - viewOffsetY.value) / rs
}

function viewXForCanvasPoint(screenX, canvasX, scale) {
  const base = screenX / displayScale.value
  if (isBackView.value) return base - (canvasWidth.value - canvasX) * scale
  return base - canvasX * scale
}

let zoomRaf = null
let zoomTarget = null

function scheduleView(target) {
  zoomTarget = target
  if (!zoomRaf) zoomRaf = requestAnimationFrame(stepZoom)
}

function stepZoom() {
  if (!zoomTarget) {
    zoomRaf = null
    return
  }

  const current = store.view
  const dx = zoomTarget.x - current.x
  const dy = zoomTarget.y - current.y
  const ds = zoomTarget.scale - current.scale

  const done = Math.abs(dx) < 0.25 && Math.abs(dy) < 0.25 && Math.abs(ds) < 0.0015
  if (done) {
    store.setView(zoomTarget)
    zoomTarget = null
    zoomRaf = null
    return
  }

  const ease = 0.18
  store.setView({
    x: current.x + dx * ease,
    y: current.y + dy * ease,
    scale: current.scale + ds * ease,
  })

  zoomRaf = requestAnimationFrame(stepZoom)
}

function setPan(value) {
  store.setPanMode(!!value)
  if (store.ui) store.ui.cropMode = false
}

function toggleCrop() {
  if (!store.ui) return
  const next = !store.ui.cropMode
  store.ui.cropMode = next
  store.setPanMode(false)
  if (next) {
    store.clearSelection?.()
    store.ui.cropRect = null
  }
}

function setViewSide(side) {
  if (typeof store.setViewSide === 'function') store.setViewSide(side)
}

function zoom(direction) {
  const stage = store.stage
  if (!stage) return

  const scaleBy = 1.12
  const currentScale = Number(store.view?.scale || 1)
  const nextScale = Math.min(
    4,
    Math.max(0.2, direction > 0 ? currentScale * scaleBy : currentScale / scaleBy),
  )

  const width = typeof stage.width === 'function' ? stage.width() : stage.width
  const height = typeof stage.height === 'function' ? stage.height() : stage.height

  const cx = Number(width || 0) / 2
  const cy = Number(height || 0) / 2

  const pointTo = {
    x: toCanvasX(cx),
    y: toCanvasY(cy),
  }

  scheduleView({
    scale: nextScale,
    x: viewXForCanvasPoint(cx, pointTo.x, nextScale),
    y: cy / displayScale.value - pointTo.y * nextScale,
  })
}

function zoomToFit() {
  const stage = store.stage
  if (!stage) return

  const box = store.getContentBoundingBox(60)
  if (!box) {
    store.resetView()
    return
  }

  const width = typeof stage.width === 'function' ? stage.width() : stage.width
  const height = typeof stage.height === 'function' ? stage.height() : stage.height

  const w = Number(width || 0)
  const h = Number(height || 0)
  if (!w || !h) return

  const scale = Math.min(w / box.width, h / box.height)

  const centerX = box.x + box.width / 2
  const centerY = box.y + box.height / 2
  const targetX = viewXForCanvasPoint(w / 2, centerX, scale)
  const targetY = h / (2 * displayScale.value) - centerY * scale

  scheduleView({
    scale,
    x: targetX,
    y: targetY,
  })
}
</script>

<style lang="less" scoped>
.canvas-controls {
  display: inline-flex;
  gap: 10px;
  background: #f5f7fb;
  padding: 6px;
  border-radius: 14px;
  box-shadow: 0 8px 18px -12px rgba(0, 0, 0, 0.25);
  align-self: center;
}

.control-group {
  display: inline-flex;
  gap: 6px;
  background: #fff;
  border-radius: 12px;
  padding: 4px;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.08);
}

.control-btn {
  border: none;
  background: transparent;
  border-radius: 10px;
  width: 32px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #5a6573;
}

.control-btn.active {
  background: #12a4b7;
  color: #fff;
  box-shadow: 0 6px 12px -10px rgba(18, 164, 183, 0.6);
}

.control-btn.wide {
  width: auto;
  padding: 0 10px;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.2px;
}

.zoom-indicator {
  min-width: 52px;
  text-align: center;
  font-size: 0.75rem;
  font-weight: 600;
  color: #5a6573;
  align-self: center;
}
</style>
