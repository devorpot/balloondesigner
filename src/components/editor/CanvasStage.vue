<template>
  <div v-if="store.pasteSession?.active" class="paste-hint">
    Modo pegar activo · Ctrl/Cmd+V para repetir · ESC para salir
  </div>

  <div class="canvas card border-0 shadow-sm">
    <div class="card-body p-0 h-100">
      <div ref="wrap" class="stage-wrap">
        <div v-if="store.ui?.guideBoxMode?.active" class="guide-hint">
          <span v-if="store.ui?.guideBoxMode?.action === 'convert'">
            Modo area · convertir guia
          </span>
          <span v-else>Modo area · rellenar guia</span>
        </div>
        <ContextMenu
          :show="menu.show"
          :pos="menu.pos"
          :canCopy="!!store.selectedId"
          :canPaste="(store.clipboard?.nodes?.length || 0) > 0"
          :canGroup="canGroup"
          :canUngroup="canUngroup"
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

            <template v-for="node in renderNodes" :key="node.id">
              <v-group
                :config="groupConfig(node)"
                @mousedown="onNodePointerDown(node, $event)"
                @touchstart="onNodePointerDown(node, $event)"
                @dragstart="onDragStart(node, $event)"
                @dragmove="onDragMove(node, $event)"
                @dragend="onDragEnd(node, $event)"
                @transformend="onTransformEnd"
              >
                <template v-if="isTextNode(node)">
                  <v-text :config="textConfig(node)" />
                </template>
                <template v-else-if="isImageNode(node)">
                  <v-image :config="imageConfig(node)" />
                </template>
                <template v-else>
                  <v-ellipse :config="ellipseConfig(node)" />
                  <v-ellipse v-if="renderQuality !== 'low'" :config="shineConfig(node)" />
                  <v-circle v-if="renderQuality === 'high'" :config="knotConfig(node)" />
                </template>
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
import { useCatalogStore } from '@/stores/catalog.store'
import { MAX_DISPLAY_SCALE, MIN_CANVAS_CM, MIN_DISPLAY_SCALE, PX_PER_CM } from '@/constants/canvas'
import ContextMenu from '@/components/editor/ContextMenu.vue'

const store = useEditorStore()
const catalog = useCatalogStore()

const canGroup = computed(() => {
  const sel = store.selectedNodes || []
  const unlocked = sel.filter((n) => !n.locked)
  return unlocked.length >= 2
})

const canUngroup = computed(() => {
  const sel = store.selectedNodes || []
  return sel.some((n) => !!n.groupId)
})

const wrap = ref(null)
const stageRef = ref(null)
const layerRef = ref(null)
const trRef = ref(null)
const rasterActive = ref(false)

const displayScale = computed(() => {
  const n = Number(store.canvas?.displayScale || 1)
  return Math.min(MAX_DISPLAY_SCALE, Math.max(MIN_DISPLAY_SCALE, n))
})
const renderScale = computed(() => store.view.scale * displayScale.value)

const canvasSpecs = computed(() => {
  const widthCm = Math.max(MIN_CANVAS_CM, Number(store.canvas.widthCm ?? 160))
  const heightCm = Math.max(MIN_CANVAS_CM, Number(store.canvas.heightCm ?? 90))
  return {
    width: widthCm * PX_PER_CM,
    height: heightCm * PX_PER_CM,
  }
})

const canvasWidth = computed(() => canvasSpecs.value.width)
const canvasHeight = computed(() => canvasSpecs.value.height)

const viewportRect = computed(() => {
  const rs = renderScale.value
  if (!rs) return { x: 0, y: 0, width: canvasWidth.value, height: canvasHeight.value }
  const dx = store.view.x * displayScale.value
  const dy = store.view.y * displayScale.value
  const left = -dx / rs
  const top = -dy / rs
  const width = size.value.w / rs
  const height = size.value.h / rs
  const margin = 260
  return {
    x: left - margin,
    y: top - margin,
    width: width + margin * 2,
    height: height + margin * 2,
  }
})

const size = ref({ w: 300, h: 300 })
let ro = null

/* ================== STAGE CONFIG ================== */
const stageConfig = computed(() => ({
  width: size.value.w,
  height: size.value.h,
  x: store.view.x * displayScale.value,
  y: store.view.y * displayScale.value,
  scaleX: renderScale.value,
  scaleY: renderScale.value,
}))

const bgConfig = computed(() => ({
  x: 0,
  y: 0,
  width: canvasWidth.value,
  height: canvasHeight.value,
  fill: store.canvas?.backgroundColor || '#ffffff',
  id: 'bg',
  name: 'bg',
  listening: true,
}))

const transformerConfig = {
  rotateEnabled: true,
  enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
  boundBoxFunc: (oldBox, newBox) => {
    if (newBox.width < 20 || newBox.height < 20) return oldBox
    const node = store.selectedNode
    if (!node || node.kind === 'text') return newBox

    const range = getInflationScaleRange(node)
    if (!range) return newBox

    const scaleX = newBox.width / oldBox.width
    const scaleY = newBox.height / oldBox.height
    const clampedScaleX = clamp(scaleX, range.minScale, range.maxScale)
    const clampedScaleY = clamp(scaleY, range.minScale, range.maxScale)

    if (clampedScaleX === scaleX && clampedScaleY === scaleY) return newBox

    const nextWidth = oldBox.width * clampedScaleX
    const nextHeight = oldBox.height * clampedScaleY
    const cx = oldBox.x + oldBox.width / 2
    const cy = oldBox.y + oldBox.height / 2

    return {
      ...newBox,
      width: nextWidth,
      height: nextHeight,
      x: cx - nextWidth / 2,
      y: cy - nextHeight / 2,
    }
  },
}

function getStage() {
  return stageRef.value?.getStage?.() ?? null
}

function getTransformer() {
  return trRef.value?.getNode?.() ?? null
}

function setRasterMode(enabled) {
  const layer = layerRef.value?.getNode?.() ?? null
  if (!layer) return
  if (enabled) {
    if (rasterActive.value) return
    try {
      layer.cache()
      rasterActive.value = true
      layer.getLayer()?.batchDraw()
    } catch {
      rasterActive.value = false
    }
  } else if (rasterActive.value) {
    try {
      layer.clearCache()
    } finally {
      rasterActive.value = false
      layer.getLayer()?.batchDraw()
    }
  }
}

function setCursor(mode) {
  const stage = getStage()
  const el = stage?.container?.()
  if (!el) return
  el.style.cursor = mode
}

/* ================== PAN MODE ================== */
const panMode = computed(() => !!store.ui?.panMode)
const renderQuality = computed(() => store.ui?.renderQuality || 'high')
const maxRenderNodes = computed(() => Number(store.ui?.maxVisibleNodes || 2500))

watch(panMode, (value) => {
  if (panning.value || spaceDown.value) return
  setCursor(value ? 'grab' : 'default')
})

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
    listening: !n?.meta?.guide,
  }
}

function isTextNode(n) {
  return n?.kind === 'text'
}

function isImageNode(n) {
  return n?.kind === 'image'
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

function textConfig(n) {
  const meta = n?.meta || {}
  const fontSize = Number(meta.fontSize || 24)
  return {
    x: 0,
    y: 0,
    text: String(meta.text || 'New text'),
    fontSize: Number.isFinite(fontSize) ? fontSize : 24,
    fontFamily: String(meta.fontFamily || 'Times New Roman'),
    fill: String(meta.fill || n.color || '#222222'),
    align: String(meta.align || 'left'),
    width: Number.isFinite(Number(meta.width)) ? Number(meta.width) : 220,
  }
}

const imageCache = new Map()

function imageConfig(n) {
  const meta = n?.meta || {}
  const src = String(meta.src || '')
  if (src && !imageCache.has(src)) {
    const img = new Image()
    img.src = src
    imageCache.set(src, img)
  }

  const img = src ? imageCache.get(src) : null
  const width = Number(meta.width || 160)
  const height = Number(meta.height || 120)

  return {
    x: -width / 2,
    y: -height / 2,
    image: img || null,
    width,
    height,
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
  const maxWidth = canvasWidth.value
  const maxHeight = canvasHeight.value
  const rs = renderScale.value
  if (!rs) return lines

  let step = gridSize
  if (rs < 0.35) step = gridSize * 4
  else if (rs < 0.6) step = gridSize * 2

  const dx = store.view.x * displayScale.value
  const dy = store.view.y * displayScale.value
  const left = Math.max(0, -dx / rs)
  const top = Math.max(0, -dy / rs)
  const right = Math.min(maxWidth, (size.value.w - dx) / rs)
  const bottom = Math.min(maxHeight, (size.value.h - dy) / rs)

  const startX = Math.max(0, Math.floor(left / step) * step)
  const endX = Math.min(maxWidth, Math.ceil(right / step) * step)
  const startY = Math.max(0, Math.floor(top / step) * step)
  const endY = Math.min(maxHeight, Math.ceil(bottom / step) * step)

  for (let x = startX; x <= endX; x += step) {
    lines.push({
      key: `v-${x}`,
      cfg: {
        points: [x, 0, x, maxHeight],
        stroke: 'rgba(0,0,0,0.10)',
        strokeWidth: 1,
        listening: false,
      },
    })
  }
  for (let y = startY; y <= endY; y += step) {
    lines.push({
      key: `h-${y}`,
      cfg: {
        points: [0, y, maxWidth, y],
        stroke: 'rgba(0,0,0,0.10)',
        strokeWidth: 1,
        listening: false,
      },
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
  if (isImageNode(n)) {
    const width = Number(n?.meta?.width || 160)
    const height = Number(n?.meta?.height || 120)
    const rx = (width / 2) * Math.abs(Number(n?.scaleX ?? 1))
    const ry = (height / 2) * Math.abs(Number(n?.scaleY ?? 1))
    return { rx, ry }
  }

  if (isTextNode(n)) {
    const fontSize = Number(n?.meta?.fontSize || 24)
    const width = Number(n?.meta?.width || 220)
    const height = fontSize * 1.2
    const rx = (width / 2) * Math.abs(Number(n?.scaleX ?? 1))
    const ry = (height / 2) * Math.abs(Number(n?.scaleY ?? 1))
    return { rx, ry }
  }

  const rx = Number(n?.meta?.radiusX ?? 46) * Math.abs(Number(n?.scaleX ?? 1))
  const ry = Number(n?.meta?.radiusY ?? 60) * Math.abs(Number(n?.scaleY ?? 1))
  return { rx, ry }
}

function clamp(v, min, max) {
  if (!Number.isFinite(v)) return min
  return Math.min(max, Math.max(min, v))
}

function getInflationScaleRange(node) {
  const type = catalog.typeById?.(node.typeId)
  if (!type) return null

  const inflation = type.inflation || {}
  const minScale = Number(inflation.minScale ?? 0.7)
  const maxScale = Number(inflation.maxScale ?? 1.0)
  if (!Number.isFinite(minScale) || !Number.isFinite(maxScale)) return null

  return {
    minScale: minScale,
    maxScale: maxScale,
  }
}

function nodeBoxAt(n, cx, cy) {
  const { rx, ry } = nodeHalfSize(n)
  const left = cx - rx
  const right = cx + rx
  const top = cy - ry
  const bottom = cy + ry
  return {
    left,
    right,
    top,
    bottom,
    centerX: cx,
    centerY: cy,
    rx,
    ry,
    width: rx * 2,
    height: ry * 2,
  }
}

function nodeBoundingBox(n) {
  const { rx, ry } = nodeHalfSize(n)
  const cx = Number(n?.x ?? 0)
  const cy = Number(n?.y ?? 0)
  return {
    x: cx - rx,
    y: cy - ry,
    width: rx * 2,
    height: ry * 2,
  }
}

function rectIntersects(a, b) {
  return !(
    a.x + a.width < b.x ||
    a.x > b.x + b.width ||
    a.y + a.height < b.y ||
    a.y > b.y + b.height
  )
}

const renderNodes = computed(() => {
  const nodes = store.visibleNodes || []
  if (!nodes.length) return []
  const rect = viewportRect.value
  const selected = new Set(store.selectedIds || [])

  const filtered = []
  for (const n of nodes) {
    if (selected.has(n.id)) {
      filtered.push(n)
      continue
    }
    const box = nodeBoundingBox(n)
    if (rectIntersects(rect, box)) filtered.push(n)
  }

  if (filtered.length <= maxRenderNodes.value) return filtered

  const selectedList = filtered.filter((n) => selected.has(n.id))
  const rest = filtered.filter((n) => !selected.has(n.id))
  const limit = Math.max(0, maxRenderNodes.value - selectedList.length)
  return [...selectedList, ...rest.slice(0, limit)]
})

/* ================== GUIDES ================== */
const guides = ref({ x: null, y: null })

const guidesLines = computed(() => {
  if (renderQuality.value === 'low') return []
  if (!store.settings?.snapGuides) return []
  const lines = []
  if (guides.value.x && Number.isFinite(guides.value.x.value)) {
    const x = guides.value.x.value
    lines.push({
      key: 'gx',
      cfg: {
        points: [x, 0, x, canvasHeight.value],
        stroke: 'rgba(13,110,253,.85)',
        strokeWidth: 1,
        dash: [6, 4],
        listening: false,
      },
    })
  }
  if (guides.value.y && Number.isFinite(guides.value.y.value)) {
    const y = guides.value.y.value
    lines.push({
      key: 'gy',
      cfg: {
        points: [0, y, canvasWidth.value, y],
        stroke: 'rgba(13,110,253,.85)',
        strokeWidth: 1,
        dash: [6, 4],
        listening: false,
      },
    })
  }
  return lines
})

function clearGuides() {
  guides.value = { x: null, y: null }
}

function buildSnapCandidates(excludeIds = []) {
  if (renderQuality.value === 'low') return { xs: [], ys: [] }
  if (!store.settings?.snapGuides) return { xs: [], ys: [] }
  const exclude = new Set(excludeIds)
  const xs = []
  const ys = []

  const cw = canvasWidth.value
  const ch = canvasHeight.value
  xs.push({ value: 0, type: 'canvas-left' })
  xs.push({ value: cw / 2, type: 'canvas-center-x' })
  xs.push({ value: cw, type: 'canvas-right' })

  ys.push({ value: 0, type: 'canvas-top' })
  ys.push({ value: ch / 2, type: 'canvas-center-y' })
  ys.push({ value: ch, type: 'canvas-bottom' })

  const rect = viewportRect.value
  for (const n of store.nodes) {
    if (n.visible === false) continue
    if (exclude.has(n.id)) continue
    if (n?.meta?.guide) continue
    if (!rectIntersects(rect, nodeBoundingBox(n))) continue
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
  if (!candidates?.xs?.length && !candidates?.ys?.length) {
    return { dx: 0, dy: 0, gx: null, gy: null }
  }
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

  return {
    dx: bestX ? bestX.diff : 0,
    dy: bestY ? bestY.diff : 0,
    gx: bestX ? bestX.guide : null,
    gy: bestY ? bestY.guide : null,
  }
}

/* ================== POINTER (canvas coords) ================== */
function getCanvasPointer(stage) {
  const p = stage.getPointerPosition()
  if (!p) return null
  const rs = renderScale.value
  const dx = store.view.x * displayScale.value
  const dy = store.view.y * displayScale.value
  const x = (p.x - dx) / rs
  const y = (p.y - dy) / rs
  return { x, y }
}

function onStagePointerMove() {
  // solo para mantener pointer actualizado si luego lo ocupas
}

/* ================== SELECTION ================== */
function onNodePointerDown(node, e) {
  // si estamos en pan, no seleccionar
  if (panning.value || panMode.value || spaceDown.value) return

  // locked = intocable desde el canvas
  if (node?.locked) return
  if (node?.meta?.guide) return

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

  if (!append && !mod && node.groupId) {
    store.selectGroup(node.groupId)
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
      const model = store.nodes.find((x) => x.id === id)
      if (n && model && !model.locked && !model?.meta?.guide) konvaNodes.push(n)
    }

    // si alguno está locked, lo ignoramos (intocable) y dejamos anchors normales
    tr.enabledAnchors(transformerConfig.enabledAnchors)

    tr.nodes(konvaNodes)
    tr.getLayer()?.batchDraw()
  },
  { immediate: true, deep: true },
)

/* ================== MULTI-DRAG + SNAP ================== */
let dragSession = null
let dragRaf = null
let pendingDrag = null

function onDragStart(node, e) {
  // si panMode está activo, no arrastrar nodos
  if (panMode.value || spaceDown.value || panning.value) {
    if (e?.cancelBubble) e.cancelBubble = true
    return
  }

  // locked = intocable desde el canvas
  if (node?.locked) return
  if (node?.meta?.guide) return

  const t = e.target
  if (!t) return

  const ids = Array.isArray(store.selectedIds) ? store.selectedIds : []
  if (!ids.includes(node.id)) store.select(node.id, { append: false })

  const stage = getStage()
  if (!stage) return

  const selected = store.selectedNodes.filter((n) => !n.locked)
  const groupIds = selected.map((n) => n.id)

  dragSession = {
    anchorId: node.id,
    startAnchor: { x: t.x(), y: t.y() },
    ids: groupIds,
    startPos: new Map(),
    candidates: buildSnapCandidates(groupIds),
    anchorModel: store.nodes.find((n) => n.id === node.id) || node,
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
  if (renderQuality.value === 'low') {
    pendingDrag = { node, e }
    if (!dragRaf) {
      dragRaf = requestAnimationFrame(() => {
        const payload = pendingDrag
        pendingDrag = null
        dragRaf = null
        if (payload) handleDragMove(payload.node, payload.e)
      })
    }
    return
  }

  handleDragMove(node, e)
}

function handleDragMove(node, e) {
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
  if (dragRaf) cancelAnimationFrame(dragRaf)
  dragRaf = null
  pendingDrag = null
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

function onTransformEnd() {
  const stage = getStage()
  if (!stage) return

  const ids = Array.isArray(store.selectedIds) ? store.selectedIds : []
  if (!ids.length) return

  // locked = no se transforma
  const unlockedIds = ids.filter((id) => {
    const n = store.nodes.find((x) => x.id === id)
    return n && !n.locked
  })
  if (!unlockedIds.length) return

  const patchById = {}
  for (const id of unlockedIds) {
    const g = stage.findOne('#' + String(id))
    if (!g) continue
    patchById[id] = {
      x: snapValue(g.x()),
      y: snapValue(g.y()),
      scaleX: g.scaleX(),
      scaleY: g.scaleY(),
      rotation: g.rotation(),
    }
  }

  if (Object.keys(patchById).length) store.updateNodes(patchById)
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
    x: (pointer.x - store.view.x * displayScale.value) / renderScale.value,
    y: (pointer.y - store.view.y * displayScale.value) / renderScale.value,
  }

  store.setView({
    scale: newScale,
    x: pointer.x / displayScale.value - mousePointTo.x * newScale,
    y: pointer.y / displayScale.value - mousePointTo.y * newScale,
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
  if (renderQuality.value === 'low' || store.ui?.rasterOnPan) setRasterMode(true)
}

function movePan(clientX, clientY) {
  if (!panning.value) return

  const dx = clientX - panStart.value.x
  const dy = clientY - panStart.value.y
  const ds = displayScale.value || 1
  store.setView({ x: panStart.value.vx + dx / ds, y: panStart.value.vy + dy / ds })

  // calcular velocidad (px por frame aprox)
  const now = performance.now()
  const dt = Math.max(1, now - panLast.value.t)
  const vx = (((clientX - panLast.value.x) / dt) * 16) / ds
  const vy = (((clientY - panLast.value.y) / dt) * 16) / ds
  panVel.value = { vx, vy }
  panLast.value = { x: clientX, y: clientY, t: now }
}

function endPan() {
  if (!panning.value) return
  panning.value = false
  setCursor(spaceDown.value || panMode.value ? 'grab' : 'default')
  if (renderQuality.value === 'low' || store.ui?.rasterOnPan) setRasterMode(false)

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
  const guideBox = store.ui?.guideBoxMode
  marquee.value.append = guideBox?.active ? false : !!evt.shiftKey

  if (!marquee.value.append && !guideBox?.active) store.clearSelection()
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

    const guideBox = store.ui?.guideBoxMode
    if (guideBox?.active) {
      if (rect.width > 6 && rect.height > 6) {
        if (guideBox.action === 'convert') {
          store.convertGuidesInRect?.(rect)
        } else {
          store.fillGuidesInRect?.(rect, { removeGuides: !!guideBox.removeGuides })
        }
      }
      store.endGuideBoxMode?.()
    } else {
      if (rect.width > 6 && rect.height > 6) {
        store.boxSelect(rect, { append: marquee.value.append })
      } else if (!marquee.value.append) {
        store.clearSelection()
      }
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
    store.pasteFromClipboard({
      x: menu.value.canvas.x,
      y: menu.value.canvas.y,
      offset: 18,
      multi: false,
    })
  }

  if (action === 'paste-multi') {
    store.endPasteSession()
    store.pasteFromClipboard({
      x: menu.value.canvas.x,
      y: menu.value.canvas.y,
      offset: 18,
      multi: true,
    })
  }

  if (action === 'duplicate') store.duplicateSelected({ offset: 18 })
  if (action === 'group') store.groupSelection()
  if (action === 'ungroup') store.ungroupSelected()

  if (action === 'toggle-lock') {
    if (typeof store.toggleLockSelection === 'function') store.toggleLockSelection()
    else {
      const ids = Array.isArray(store.selectedIds) ? store.selectedIds : []
      for (const id of ids) store.toggleLock?.(id)
    }
  }

  if (action === 'bring-forward') store.bringForwardSelected?.()
  if (action === 'send-backward') store.sendBackwardSelected?.()
  if (action === 'bring-front') store.bringToFrontSelected?.()
  if (action === 'send-back') store.sendToBackSelected?.()

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
    if (id) {
      const model = store.nodes.find((n) => String(n.id) === String(id))
      if (model && !model.locked) store.select(String(id))
    }
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

  // Pan con Space
  if (e.code === 'Space') {
    e.preventDefault()
    if (!spaceDown.value) {
      spaceDown.value = true
      setCursor('grab')
    }
    return
  }

  // Esc: cerrar menú y salir de modo pegar
  if (e.key === 'Escape') {
    if (menu.value.show) closeMenu()
    if (store.pasteSession?.active) store.endPasteSession()
    return
  }

  // Delete: borrar selección
  if (e.key === 'Delete' || e.key === 'Backspace') {
    if ((store.selectedIds?.length || 0) > 0) {
      e.preventDefault()
      store.deleteSelected()
    }
    return
  }

  const isMac = navigator.platform.toLowerCase().includes('mac')
  const mod = isMac ? !!e.metaKey : !!e.ctrlKey
  if (!mod) return

  const k = String(e.key || '').toLowerCase()
  const stage = getStage()
  const cp = stage ? getCanvasPointer(stage) : null
  const pasteX = cp ? cp.x : 200
  const pasteY = cp ? cp.y : 200

  if (k === 'c') {
    e.preventDefault()
    store.copySelected()
    return
  }

  if (k === 'v') {
    e.preventDefault()
    store.pasteFromClipboard({ x: pasteX, y: pasteY, offset: 18, multi: !!e.shiftKey })
    return
  }

  if (k === 'd') {
    e.preventDefault()
    store.duplicateSelected({ offset: 18 })
    return
  }

  if (k === 'g') {
    e.preventDefault()
    if (e.shiftKey) store.ungroupSelected()
    else store.groupSelection()
    return
  }

  // Z-Order
  // Ctrl/Cmd + ]  -> bring forward
  // Ctrl/Cmd + [  -> send backward
  // Ctrl/Cmd + Shift + ] -> bring to front
  // Ctrl/Cmd + Shift + [ -> send to back
  if (k === ']' || k === '[') {
    e.preventDefault()
    if (k === ']') {
      if (e.shiftKey) store.bringToFrontSelected?.()
      else store.bringForwardSelected?.()
    } else {
      if (e.shiftKey) store.sendToBackSelected?.()
      else store.sendBackwardSelected?.()
    }
    return
  }

  // Lock toggle (Ctrl/Cmd+L)
  if (k === 'l') {
    e.preventDefault()
    if (typeof store.toggleLockSelection === 'function') {
      store.toggleLockSelection()
    } else {
      const ids = Array.isArray(store.selectedIds) ? store.selectedIds : []
      for (const id of ids) store.toggleLock?.(id)
    }
    return
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

  nextTick(() => {
    const stage = getStage()
    if (stage) store.setStage(stage)
  })
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
  position: relative;
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

.guide-hint {
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(245, 158, 11, 0.92);
  color: #1f2937;
  padding: 6px 10px;
  border-radius: 10px;
  font-size: 0.72rem;
  font-weight: 600;
  z-index: 10;
}
</style>
