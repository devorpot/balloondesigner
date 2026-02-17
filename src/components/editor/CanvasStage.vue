<template>
  <div v-if="store.pasteSession?.active" class="paste-hint">
    Modo pegar activo · Ctrl/Cmd+V para repetir · ESC para salir
  </div>

  <!-- Toggle Pan (útil en móvil) -->
  <button
    type="button"
    class="pan-toggle"
    :class="{ active: panMode }"
    @click="togglePanMode"
    title="Modo Pan"
  >
    Pan
  </button>

  <div class="canvas card border-0 shadow-sm">
    <div class="card-body p-0 h-100">
      <div ref="wrap" class="stage-wrap">
        <ContextMenu
          :show="menu.show"
          :pos="menu.pos"
          :canCopy="!!store.selectedId"
          :canPaste="!!store.clipboard?.node"
          @action="onMenuAction"
          @close="closeMenu"
        />

        <v-stage
          ref="stageRef"
          :config="stageConfig"
          @wheel="onWheel"

          @mousedown="onStagePointerDown"
          @mousemove="onStagePointerMove"
          @click="onStageClick"
          @contextmenu="onStageContextMenu"

          @touchstart="onStageTouchStart"
          @touchmove="onStageTouchMove"
          @touchend="onStageTouchEnd"
          @touchcancel="onStageTouchEnd"
          @tap="onStageClick"
        >
          <!-- BG + GRID -->
          <v-layer>
            <v-rect :config="bgConfig" />
            <template v-if="store.settings.grid">
              <v-line v-for="l in gridLines" :key="l.key" :config="l.cfg" />
            </template>
          </v-layer>

          <!-- NODES -->
          <v-layer ref="layerRef">
            <v-line v-for="g in guidesLines" :key="g.key" :config="g.cfg" />

            <template v-for="node in store.visibleNodes" :key="node.id">
              <v-group
                :config="groupConfig(node)"
                @mousedown="onNodePointerDown(node, $event)"
                @touchstart="onNodePointerDown(node, $event)"
                @dragstart="onDragStart(node, $event)"
                @dragmove="onDragMove(node, $event)"
                @dragend="onDragEnd(node, $event)"
                @transformend="onTransformEnd(node, $event)"
              >
                <v-ellipse :config="ellipseConfig(node)" />
                <v-ellipse :config="shineConfig(node)" />
                <v-circle :config="knotConfig(node)" />
              </v-group>
            </template>

            <v-rect v-if="marquee.active" :config="marqueeRectConfig" />
            <v-transformer ref="trRef" :config="transformerConfig" />
          </v-layer>
        </v-stage>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useEditorStore } from '@/stores/editor.store'
import ContextMenu from '@/components/editor/ContextMenu.vue'

const store = useEditorStore()

const wrap = ref(null)
const stageRef = ref(null)
const layerRef = ref(null)
const trRef = ref(null)

const canvasWidth = 1600
const canvasHeight = 900

const size = ref({ w: 300, h: 300 })
let ro = null

/* ================== STAGE CONFIG ================== */
const stageConfig = computed(() => ({
  width: size.value.w,
  height: size.value.h,
  x: store.view.x,
  y: store.view.y,
  scaleX: store.view.scale,
  scaleY: store.view.scale,
}))

const bgConfig = computed(() => ({
  x: 0,
  y: 0,
  width: canvasWidth,
  height: canvasHeight,
  fill: '#ffffff',
  id: 'bg',
  name: 'bg',
  listening: true,
}))

const transformerConfig = {
  rotateEnabled: true,
  enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
  boundBoxFunc: (oldBox, newBox) => {
    if (newBox.width < 20 || newBox.height < 20) return oldBox
    return newBox
  },
}

function getStage() {
  return stageRef.value?.getStage?.() ?? null
}

function getTransformer() {
  return trRef.value?.getNode?.() ?? null
}

function setCursor(mode) {
  const stage = getStage()
  const el = stage?.container?.()
  if (!el) return
  el.style.cursor = mode
}

/* ================== PAN MODE (móvil) ================== */
const panMode = ref(false)
function togglePanMode() {
  panMode.value = !panMode.value
  if (panMode.value) setCursor('grab')
  else if (!panning.value && !spaceDown.value) setCursor('default')
}

/* ================== NODE CONFIGS ================== */
function groupConfig(n) {
  return {
    id: n.id,
    x: n.x,
    y: n.y,
    rotation: n.rotation,
    scaleX: n.scaleX,
    scaleY: n.scaleY,
    opacity: n.opacity,
    draggable: !n.locked && !panning.value && !panMode.value && !spaceDown.value, // evita drag de nodos mientras paneas
  }
}

function ellipseConfig(n) {
  const rx = Number(n?.meta?.radiusX ?? 46)
  const ry = Number(n?.meta?.radiusY ?? 60)

  return {
    x: 0,
    y: 0,
    radiusX: rx,
    radiusY: ry,
    fill: n.color,
    stroke: 'rgba(0,0,0,.10)',
    strokeWidth: 1,
    listening: true,
    perfectDrawEnabled: false,
  }
}

function shineConfig() {
  return {
    x: -14,
    y: -18,
    radiusX: 10,
    radiusY: 18,
    fill: 'rgba(255,255,255,0.35)',
    listening: false,
    perfectDrawEnabled: false,
  }
}

function knotConfig(n) {
  const ry = Number(n?.meta?.radiusY ?? 60)
  const show = n?.meta?.knot !== false

  return {
    x: 0,
    y: ry + 6,
    radius: 6,
    fill: 'rgba(0,0,0,0.18)',
    listening: false,
    visible: show,
    perfectDrawEnabled: false,
  }
}

/* ================== GRID ================== */
const gridSize = 50
const gridLines = computed(() => {
  const lines = []
  for (let x = 0; x <= canvasWidth; x += gridSize) {
    lines.push({
      key: `v-${x}`,
      cfg: { points: [x, 0, x, canvasHeight], stroke: 'rgba(0,0,0,0.10)', strokeWidth: 1, listening: false },
    })
  }
  for (let y = 0; y <= canvasHeight; y += gridSize) {
    lines.push({
      key: `h-${y}`,
      cfg: { points: [0, y, canvasWidth, y], stroke: 'rgba(0,0,0,0.10)', strokeWidth: 1, listening: false },
    })
  }
  return lines
})

/* ================== SNAP HELPERS ================== */
function snapValue(v) {
  if (!store.settings?.snap) return v
  const step = Number(store.settings?.snapStep || 10)
  if (!Number.isFinite(step) || step <= 0) return v
  return Math.round(v / step) * step
}

function getTolerance() {
  const t = Number(store.settings?.snapTolerance ?? 8)
  return Number.isFinite(t) && t >= 0 ? t : 8
}

function nodeHalfSize(n) {
  const rx = Number(n?.meta?.radiusX ?? 46) * Math.abs(Number(n?.scaleX ?? 1))
  const ry = Number(n?.meta?.radiusY ?? 60) * Math.abs(Number(n?.scaleY ?? 1))
  return { rx, ry }
}

function nodeBoxAt(n, cx, cy) {
  const { rx, ry } = nodeHalfSize(n)
  const left = cx - rx
  const right = cx + rx
  const top = cy - ry
  const bottom = cy + ry
  return { left, right, top, bottom, centerX: cx, centerY: cy, rx, ry, width: rx * 2, height: ry * 2 }
}

/* ================== GUIDES ================== */
const guides = ref({ x: null, y: null })

const guidesLines = computed(() => {
  const lines = []
  if (guides.value.x && Number.isFinite(guides.value.x.value)) {
    const x = guides.value.x.value
    lines.push({ key: 'gx', cfg: { points: [x, 0, x, canvasHeight], stroke: 'rgba(13,110,253,.85)', strokeWidth: 1, dash: [6, 4], listening: false } })
  }
  if (guides.value.y && Number.isFinite(guides.value.y.value)) {
    const y = guides.value.y.value
    lines.push({ key: 'gy', cfg: { points: [0, y, canvasWidth, y], stroke: 'rgba(13,110,253,.85)', strokeWidth: 1, dash: [6, 4], listening: false } })
  }
  return lines
})

function clearGuides() {
  guides.value = { x: null, y: null }
}

function buildSnapCandidates(excludeIds = []) {
  const exclude = new Set(excludeIds)
  const xs = []
  const ys = []

  xs.push({ value: 0, type: 'canvas-left' })
  xs.push({ value: canvasWidth / 2, type: 'canvas-center-x' })
  xs.push({ value: canvasWidth, type: 'canvas-right' })

  ys.push({ value: 0, type: 'canvas-top' })
  ys.push({ value: canvasHeight / 2, type: 'canvas-center-y' })
  ys.push({ value: canvasHeight, type: 'canvas-bottom' })

  for (const n of store.nodes) {
    if (n.visible === false) continue
    if (exclude.has(n.id)) continue
    const b = nodeBoxAt(n, Number(n.x ?? 0), Number(n.y ?? 0))

    xs.push({ value: b.left, type: 'node-left' })
    xs.push({ value: b.centerX, type: 'node-center-x' })
    xs.push({ value: b.right, type: 'node-right' })

    ys.push({ value: b.top, type: 'node-top' })
    ys.push({ value: b.centerY, type: 'node-center-y' })
    ys.push({ value: b.bottom, type: 'node-bottom' })
  }

  return { xs, ys }
}

function guideSourceWeight(type) {
  const t = String(type || '')
  if (t.startsWith('node-')) return 0
  if (t.startsWith('canvas-')) return 1
  return 2
}

function featureWeightX(featureKey) {
  const mode = String(store.settings?.snapGuidePriority || 'center-first')
  if (mode === 'edges-first') {
    if (featureKey === 'left' || featureKey === 'right') return 0
    if (featureKey === 'center') return 1
    return 2
  }
  if (featureKey === 'center') return 0
  if (featureKey === 'left' || featureKey === 'right') return 1
  return 2
}

function featureWeightY(featureKey) {
  const mode = String(store.settings?.snapGuidePriority || 'center-first')
  if (mode === 'edges-first') {
    if (featureKey === 'top' || featureKey === 'bottom') return 0
    if (featureKey === 'center') return 1
    return 2
  }
  if (featureKey === 'center') return 0
  if (featureKey === 'top' || featureKey === 'bottom') return 1
  return 2
}

function snapBoxToGuides(box, candidates) {
  if (!store.settings?.snapGuides) return { dx: 0, dy: 0, gx: null, gy: null }
  const tol = getTolerance()

  const fx = [
    { value: box.left, key: 'left' },
    { value: box.centerX, key: 'center' },
    { value: box.right, key: 'right' },
  ]
  const fy = [
    { value: box.top, key: 'top' },
    { value: box.centerY, key: 'center' },
    { value: box.bottom, key: 'bottom' },
  ]

  let bestX = null
  for (const f of fx) {
    const p = featureWeightX(f.key)
    for (const g of candidates.xs) {
      const diff = g.value - f.value
      const ad = Math.abs(diff)
      if (ad > tol) continue
      const srcW = guideSourceWeight(g.type)
      const cand = { p, ad, diff, guide: g, srcW }
      if (!bestX) bestX = cand
      else if (cand.p < bestX.p) bestX = cand
      else if (cand.p === bestX.p && cand.ad < bestX.ad) bestX = cand
      else if (cand.p === bestX.p && cand.ad === bestX.ad && cand.srcW < bestX.srcW) bestX = cand
    }
  }

  let bestY = null
  for (const f of fy) {
    const p = featureWeightY(f.key)
    for (const g of candidates.ys) {
      const diff = g.value - f.value
      const ad = Math.abs(diff)
      if (ad > tol) continue
      const srcW = guideSourceWeight(g.type)
      const cand = { p, ad, diff, guide: g, srcW }
      if (!bestY) bestY = cand
      else if (cand.p < bestY.p) bestY = cand
      else if (cand.p === bestY.p && cand.ad < bestY.ad) bestY = cand
      else if (cand.p === bestY.p && cand.ad === bestY.ad && cand.srcW < bestY.srcW) bestY = cand
    }
  }

  return { dx: bestX ? bestX.diff : 0, dy: bestY ? bestY.diff : 0, gx: bestX ? bestX.guide : null, gy: bestY ? bestY.guide : null }
}

/* ================== POINTER (canvas coords) ================== */
function getCanvasPointer(stage) {
  const p = stage.getPointerPosition()
  if (!p) return null
  const x = (p.x - store.view.x) / store.view.scale
  const y = (p.y - store.view.y) / store.view.scale
  return { x, y }
}

function onStagePointerMove() {
  // solo para mantener pointer actualizado si luego lo ocupas
}

/* ================== SELECTION ================== */
function onNodePointerDown(node, e) {
  // si estamos en pan, no seleccionar
  if (panning.value || panMode.value || spaceDown.value) return

  if (e?.cancelBubble !== undefined) e.cancelBubble = true
  if (e?.evt?.cancelBubble !== undefined) e.evt.cancelBubble = true

  const evt = e?.evt
  const isMac = navigator.platform.toLowerCase().includes('mac')
  const mod = isMac ? !!evt?.metaKey : !!evt?.ctrlKey
  const append = !!evt?.shiftKey

  if (mod || append) {
    store.toggleSelect(node.id)
    closeMenu()
    return
  }

  store.select(node.id, { append: false })
  closeMenu()
}

/* ================== TRANSFORMER ================== */
watch(
  () => store.selectedIds,
  async (ids) => {
    await nextTick()
    const stage = getStage()
    const tr = getTransformer()
    if (!stage || !tr) return

    const list = Array.isArray(ids) ? ids : []
    if (!list.length) {
      tr.nodes([])
      tr.getLayer()?.batchDraw()
      return
    }

    const konvaNodes = []
    for (const id of list) {
      const n = stage.findOne('#' + String(id))
      if (n) konvaNodes.push(n)
    }

    const anyLocked = store.selectedNodes?.some?.(n => !!n.locked) || false
    tr.enabledAnchors(anyLocked ? [] : transformerConfig.enabledAnchors)

    tr.nodes(konvaNodes)
    tr.getLayer()?.batchDraw()
  },
  { immediate: true, deep: true }
)

/* ================== MULTI-DRAG + SNAP ================== */
let dragSession = null

function onDragStart(node, e) {
  // si panMode está activo, no arrastrar nodos
  if (panMode.value || spaceDown.value || panning.value) {
    e?.cancelBubble && (e.cancelBubble = true)
    return
  }

  const t = e.target
  if (!t) return

  const ids = Array.isArray(store.selectedIds) ? store.selectedIds : []
  if (!ids.includes(node.id)) store.select(node.id, { append: false })

  const stage = getStage()
  if (!stage) return

  const selected = store.selectedNodes.filter(n => !n.locked)
  const groupIds = selected.map(n => n.id)

  dragSession = {
    anchorId: node.id,
    startAnchor: { x: t.x(), y: t.y() },
    ids: groupIds,
    startPos: new Map(),
    candidates: buildSnapCandidates(groupIds),
    anchorModel: store.nodes.find(n => n.id === node.id) || node,
  }

  for (const id of groupIds) {
    const g = stage.findOne('#' + String(id))
    if (g) dragSession.startPos.set(id, { x: g.x(), y: g.y() })
  }

  clearGuides()
  store.beginHistoryBatch()
}

function onDragMove(node, e) {
  if (!dragSession) return
  const t = e.target
  if (!t) return

  const stage = getStage()
  if (!stage) return

  const startA = dragSession.startAnchor

  let ax = snapValue(t.x())
  let ay = snapValue(t.y())

  const anchorModel = dragSession.anchorModel
  const box = nodeBoxAt(anchorModel, ax, ay)
  const snapped = snapBoxToGuides(box, dragSession.candidates)

  if (snapped.dx || snapped.dy) {
    ax += snapped.dx
    ay += snapped.dy
  }

  t.position({ x: ax, y: ay })

  guides.value = {
    x: snapped.gx ? { value: snapped.gx.value, type: snapped.gx.type } : null,
    y: snapped.gy ? { value: snapped.gy.value, type: snapped.gy.type } : null,
  }

  const dx = ax - startA.x
  const dy = ay - startA.y

  for (const id of dragSession.ids) {
    if (id === dragSession.anchorId) continue
    const start = dragSession.startPos.get(id)
    if (!start) continue
    const g = stage.findOne('#' + String(id))
    if (!g) continue
    g.position({ x: start.x + dx, y: start.y + dy })
  }

  stage.batchDraw()
}

function onDragEnd(node, e) {
  const stage = getStage()
  const t = e.target

  if (!dragSession || !stage || !t) {
    if (t) store.updateNode(node.id, { x: snapValue(t.x()), y: snapValue(t.y()) })
    clearGuides()
    return
  }

  try {
    const anchor = stage.findOne('#' + String(dragSession.anchorId))
    if (anchor) store.updateNode(dragSession.anchorId, { x: anchor.x(), y: anchor.y() })

    for (const id of dragSession.ids) {
      if (id === dragSession.anchorId) continue
      const g = stage.findOne('#' + String(id))
      if (!g) continue
      store.updateNode(id, { x: g.x(), y: g.y() })
    }
  } finally {
    dragSession = null
    clearGuides()
    store.endHistoryBatch()
  }
}

function onTransformEnd(node, e) {
  const t = e.target
  store.updateNode(node.id, {
    x: snapValue(t.x()),
    y: snapValue(t.y()),
    scaleX: t.scaleX(),
    scaleY: t.scaleY(),
    rotation: t.rotation(),
  })
}

/* ================== CLICK EMPTY ================== */
function onStageClick(e) {
  const stage = getStage()
  if (!stage) return

  const target = e.target
  const clickedOnStage = target === stage
  const clickedOnBg = typeof target?.hasName === 'function' && target.hasName('bg')

  if (clickedOnStage || clickedOnBg) {
    clearGuides()
    store.clearSelection()
  }
}

/* ================== ZOOM (wheel) ================== */
function onWheel(e) {
  e.evt.preventDefault()

  const stage = getStage()
  if (!stage) return

  const oldScale = store.view.scale
  const pointer = stage.getPointerPosition()
  if (!pointer) return

  const scaleBy = 1.06
  const dir = e.evt.deltaY > 0 ? -1 : 1
  const newScale = dir > 0 ? oldScale * scaleBy : oldScale / scaleBy

  const mousePointTo = {
    x: (pointer.x - store.view.x) / oldScale,
    y: (pointer.y - store.view.y) / oldScale,
  }

  store.setView({
    scale: newScale,
    x: pointer.x - mousePointTo.x * newScale,
    y: pointer.y - mousePointTo.y * newScale,
  })
}

/* ================== PAN + INERCIA ================== */
const panning = ref(false)
const spaceDown = ref(false)

const panStart = ref({ x: 0, y: 0, vx: 0, vy: 0 })
const panLast = ref({ x: 0, y: 0, t: 0 })
const panVel = ref({ vx: 0, vy: 0 })

let inertiaRaf = null

function stopInertia() {
  if (inertiaRaf) cancelAnimationFrame(inertiaRaf)
  inertiaRaf = null
  panVel.value = { vx: 0, vy: 0 }
}

function startInertia() {
  stopInertia()
  const friction = 0.92
  const minSpeed = 0.05

  const step = () => {
    const { vx, vy } = panVel.value
    const speed = Math.hypot(vx, vy)
    if (speed < minSpeed) {
      stopInertia()
      return
    }

    store.setView({
      x: store.view.x + vx,
      y: store.view.y + vy,
    })

    panVel.value = { vx: vx * friction, vy: vy * friction }
    inertiaRaf = requestAnimationFrame(step)
  }

  inertiaRaf = requestAnimationFrame(step)
}

function beginPan(clientX, clientY) {
  stopInertia()
  panning.value = true
  panStart.value = { x: clientX, y: clientY, vx: store.view.x, vy: store.view.y }
  panLast.value = { x: clientX, y: clientY, t: performance.now() }
  panVel.value = { vx: 0, vy: 0 }
  setCursor('grabbing')
}

function movePan(clientX, clientY) {
  if (!panning.value) return

  const dx = clientX - panStart.value.x
  const dy = clientY - panStart.value.y
  store.setView({ x: panStart.value.vx + dx, y: panStart.value.vy + dy })

  // calcular velocidad (px por frame aprox)
  const now = performance.now()
  const dt = Math.max(1, now - panLast.value.t)
  const vx = (clientX - panLast.value.x) / dt * 16
  const vy = (clientY - panLast.value.y) / dt * 16
  panVel.value = { vx, vy }
  panLast.value = { x: clientX, y: clientY, t: now }
}

function endPan() {
  if (!panning.value) return
  panning.value = false
  setCursor((spaceDown.value || panMode.value) ? 'grab' : 'default')

  // si hay velocidad, aplica inercia
  const speed = Math.hypot(panVel.value.vx, panVel.value.vy)
  if (speed > 0.6) startInertia()
}

function isPanShortcut(evt) {
  // Space + click izq o middle mouse
  if (evt?.button === 1) return true
  if (spaceDown.value && evt?.button === 0) return true
  return false
}

/* mouse pan */
function onStagePointerDown(e) {
  const evt = e.evt
  const stage = getStage()
  if (!stage) return

  // si estás en panMode, pan con click izquierdo también
  const canPan = isPanShortcut(evt) || (panMode.value && evt?.button === 0)
  if (canPan) {
    evt.preventDefault()
    beginPan(evt.clientX, evt.clientY)
    return
  }

  // si no paneas, aquí va marquee (solo bg/stage)
  const target = e.target
  const isBg = typeof target?.hasName === 'function' && target.hasName('bg')
  const isStage = target === stage
  if (!(isBg || isStage)) return

  const cp = getCanvasPointer(stage)
  if (!cp) return

  clearGuides()
  marquee.value.active = true
  marquee.value.start = { ...cp }
  marquee.value.end = { ...cp }
  marquee.value.append = !!evt.shiftKey

  if (!marquee.value.append) store.clearSelection()
}

function onDocMouseMove(e) {
  if (marquee.value.active) {
    const stage = getStage()
    if (!stage) return
    const cp = getCanvasPointer(stage)
    if (!cp) return
    marquee.value.end = { ...cp }
    return
  }

  if (!panning.value) return
  movePan(e.clientX, e.clientY)
}

function onDocMouseUp() {
  if (marquee.value.active) {
    const x1 = marquee.value.start.x
    const y1 = marquee.value.start.y
    const x2 = marquee.value.end.x
    const y2 = marquee.value.end.y

    const rect = {
      x: Math.min(x1, x2),
      y: Math.min(y1, y2),
      width: Math.abs(x2 - x1),
      height: Math.abs(y2 - y1),
    }

    if (rect.width > 6 && rect.height > 6) {
      store.boxSelect(rect, { append: marquee.value.append })
    } else if (!marquee.value.append) {
      store.clearSelection()
    }

    marquee.value.active = false
  }

  endPan()
}

/* touch pan */
let touchPanMode = null
function onStageTouchStart(e) {
  const evt = e.evt
  const touches = evt?.touches
  if (!touches || !touches.length) return

  const stage = getStage()
  if (!stage) return

  // 2 dedos: pan siempre
  if (touches.length >= 2) {
    evt.preventDefault()
    touchPanMode = 'two'
    const t0 = touches[0]
    const t1 = touches[1]
    const cx = (t0.clientX + t1.clientX) / 2
    const cy = (t0.clientY + t1.clientY) / 2
    beginPan(cx, cy)
    return
  }

  // 1 dedo: pan solo si panMode está activo
  if (touches.length === 1 && panMode.value) {
    evt.preventDefault()
    touchPanMode = 'one'
    const t0 = touches[0]
    beginPan(t0.clientX, t0.clientY)
    return
  }

  touchPanMode = null
}

function onStageTouchMove(e) {
  if (!panning.value) return
  const evt = e.evt
  const touches = evt?.touches
  if (!touches || !touches.length) return

  if (touchPanMode === 'two' && touches.length >= 2) {
    evt.preventDefault()
    const t0 = touches[0]
    const t1 = touches[1]
    const cx = (t0.clientX + t1.clientX) / 2
    const cy = (t0.clientY + t1.clientY) / 2
    movePan(cx, cy)
    return
  }

  if (touchPanMode === 'one' && touches.length === 1) {
    evt.preventDefault()
    const t0 = touches[0]
    movePan(t0.clientX, t0.clientY)
  }
}

function onStageTouchEnd(e) {
  if (touchPanMode) {
    e?.evt?.preventDefault?.()
    touchPanMode = null
    endPan()
  }
}

/* ================== MARQUEE ================== */
const marquee = ref({
  active: false,
  start: { x: 0, y: 0 },
  end: { x: 0, y: 0 },
  append: false,
})

const marqueeRectConfig = computed(() => {
  const x1 = marquee.value.start.x
  const y1 = marquee.value.start.y
  const x2 = marquee.value.end.x
  const y2 = marquee.value.end.y

  const x = Math.min(x1, x2)
  const y = Math.min(y1, y2)
  const w = Math.abs(x2 - x1)
  const h = Math.abs(y2 - y1)

  return {
    x,
    y,
    width: w,
    height: h,
    fill: 'rgba(13,110,253,.12)',
    stroke: 'rgba(13,110,253,.55)',
    strokeWidth: 1,
    listening: false,
  }
})

/* ================== CONTEXT MENU ================== */
const menu = ref({
  show: false,
  pos: { x: 0, y: 0 },
  canvas: { x: 0, y: 0 },
})

function closeMenu() {
  menu.value.show = false
}

function openMenu(screenX, screenY, canvasX, canvasY) {
  menu.value = { show: true, pos: { x: screenX, y: screenY }, canvas: { x: canvasX, y: canvasY } }
}

function onMenuAction(action) {
  if (action === 'copy') store.copySelected()

  if (action === 'paste') {
    store.endPasteSession()
    store.pasteFromClipboard({ x: menu.value.canvas.x, y: menu.value.canvas.y, offset: 18, multi: false })
  }

  if (action === 'paste-multi') {
    store.endPasteSession()
    store.pasteFromClipboard({ x: menu.value.canvas.x, y: menu.value.canvas.y, offset: 18, multi: true })
  }

  if (action === 'duplicate') store.duplicateSelected({ offset: 18 })
  if (action === 'delete') store.deleteSelected()
}

function onDocMouseDown() {
  if (menu.value.show) closeMenu()
}

function onStageContextMenu(e) {
  e.evt.preventDefault()
  const stage = getStage()
  if (!stage) return

  const target = e.target
  const isBg = typeof target?.hasName === 'function' && target.hasName('bg')
  const isStage = target === stage

  if (!isBg && !isStage) {
    const group = target?.getParent?.()
    const id = group?.id?.() || target?.id?.()
    if (id) store.select(String(id))
  } else {
    store.clearSelection()
  }

  const cp = getCanvasPointer(stage)
  if (!cp) return
  openMenu(e.evt.clientX, e.evt.clientY, cp.x, cp.y)
}

/* ================== KEYBOARD (Space pan) ================== */
function isTypingTarget(e) {
  const el = e?.target
  if (!el) return false
  const tag = (el.tagName || '').toLowerCase()
  return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable
}

function onDocKeyDown(e) {
  if (isTypingTarget(e)) return

  if (e.code === 'Space') {
    e.preventDefault()
    if (!spaceDown.value) {
      spaceDown.value = true
      setCursor('grab')
    }
  }
}

function onDocKeyUp(e) {
  if (e.code === 'Space') {
    spaceDown.value = false
    if (!panning.value && !panMode.value) setCursor('default')
    if (!panning.value && panMode.value) setCursor('grab')
  }
}

/* ================== LIFECYCLE ================== */
onMounted(() => {
  ro = new ResizeObserver((entries) => {
    const cr = entries[0]?.contentRect
    if (!cr) return
    size.value = { w: Math.max(320, Math.floor(cr.width)), h: Math.max(320, Math.floor(cr.height)) }
  })
  if (wrap.value) ro.observe(wrap.value)

  document.addEventListener('mousemove', onDocMouseMove)
  document.addEventListener('mouseup', onDocMouseUp)
  document.addEventListener('mousedown', onDocMouseDown)
  document.addEventListener('keydown', onDocKeyDown)
  document.addEventListener('keyup', onDocKeyUp)
})

onBeforeUnmount(() => {
  if (ro && wrap.value) ro.unobserve(wrap.value)
  ro = null

  document.removeEventListener('mousemove', onDocMouseMove)
  document.removeEventListener('mouseup', onDocMouseUp)
  document.removeEventListener('mousedown', onDocMouseDown)
  document.removeEventListener('keydown', onDocKeyDown)
  document.removeEventListener('keyup', onDocKeyUp)
  store.setStage(null)
  stopInertia()
  setCursor('default')
})
</script>

<style lang="less" scoped>
.canvas {
  height: 100%;
  border-radius: 16px;
  overflow: hidden;
}

.stage-wrap {
  width: 100%;
  height: 100%;
}

.paste-hint {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.75);
  color: #fff;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 0.75rem;
  z-index: 10;
}

.pan-toggle {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 20;
  border: 1px solid rgba(0,0,0,.12);
  background: rgba(255,255,255,.92);
  border-radius: 12px;
  padding: 6px 10px;
  font-size: 0.85rem;
  line-height: 1;
  box-shadow: 0 6px 20px rgba(0,0,0,.08);
}

.pan-toggle.active {
  border-color: rgba(13,110,253,.35);
  box-shadow: 0 8px 24px rgba(13,110,253,.18);
}
</style>
