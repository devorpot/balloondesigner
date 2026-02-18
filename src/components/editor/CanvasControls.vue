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
      <button class="control-btn" type="button" title="Zoom in" @click="zoom(1)">
        <i class="bi bi-zoom-in"></i>
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
import { useEditorStore } from '@/stores/editor.store'

const store = useEditorStore()

const panMode = computed(() => !!store.ui?.panMode)
const zoomLabel = computed(() => `${Math.round((store.view?.scale || 1) * 100)}%`)

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
    x: (cx - store.view.x) / currentScale,
    y: (cy - store.view.y) / currentScale,
  }

  scheduleView({
    scale: nextScale,
    x: cx - pointTo.x * nextScale,
    y: cy - pointTo.y * nextScale,
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

  scheduleView({
    scale,
    x: -box.x * scale + (w - box.width * scale) / 2,
    y: -box.y * scale + (h - box.height * scale) / 2,
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

.zoom-indicator {
  min-width: 52px;
  text-align: center;
  font-size: 0.75rem;
  font-weight: 600;
  color: #5a6573;
  align-self: center;
}
</style>
