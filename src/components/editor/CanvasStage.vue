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
        <div v-if="groupEditMode && groupEditGroup" class="group-edit-hint">
          Editando grupo: <span class="fw-semibold">{{ groupEditGroup.name }}</span>
          <span class="text-muted">· Esc para salir</span>
        </div>
        <div v-if="symbolEditActive" class="symbol-edit-hint">
          Editando simbolo: <span class="fw-semibold">{{ symbolEditName }}</span>
          <button class="btn btn-sm btn-light ms-2" type="button" @click="store.exitSymbolEdit()">
            Salir
          </button>
        </div>
        <div v-if="toolbarVisible" class="float-toolbar" :style="toolbarStyle">
          <button
            class="btn btn-sm btn-light icon-btn"
            type="button"
            title="Duplicar"
            @click="onToolbarDuplicate"
          >
            <i class="bi bi-files"></i>
          </button>
          <button
            class="btn btn-sm btn-light icon-btn"
            type="button"
            title="Girar izquierda"
            :disabled="toolbarAngle <= -180"
            @click="onToolbarRotate(-10)"
          >
            <i class="bi bi-arrow-counterclockwise"></i>
          </button>
          <div
            class="angle-chip"
            :class="{ limit: Math.abs(toolbarAngle) >= 180 }"
            :title="`Rotacion ${toolbarAngle}°`"
          >
            {{ toolbarAngle }}°
          </div>
          <button
            class="btn btn-sm btn-light icon-btn"
            type="button"
            title="Girar derecha"
            :disabled="toolbarAngle >= 180"
            @click="onToolbarRotate(10)"
          >
            <i class="bi bi-arrow-clockwise"></i>
          </button>
          <button
            class="btn btn-sm btn-light icon-btn"
            type="button"
            title="Enviar atras"
            @click="onToolbarSendBackward"
          >
            <i class="bi bi-layer-backward"></i>
          </button>
          <button
            class="btn btn-sm btn-light icon-btn"
            type="button"
            title="Traer al frente"
            @click="onToolbarBringForward"
          >
            <i class="bi bi-layer-forward"></i>
          </button>
          <button
            class="btn btn-sm btn-light icon-btn text-danger"
            type="button"
            title="Eliminar"
            @click="onToolbarDelete"
          >
            <i class="bi bi-trash"></i>
          </button>
        </div>
        <ContextMenu
          :show="menu.show"
          :pos="menu.pos"
          :canCopy="!!store.selectedId"
          :canPaste="!symbolEditActive && (store.clipboard?.nodes?.length || 0) > 0"
          :canGroup="canGroup"
          :canUngroup="canUngroup"
          :canCreateSymbol="canCreateSymbol"
          :canEditSymbol="canEditSymbol"
          :canExitSymbol="canExitSymbol"
          :canDetachSymbol="canDetachSymbol"
          @action="onMenuAction"
          @close="closeMenu"
        />

        <v-stage
          ref="stageRef"
          :config="stageConfig"
          @wheel="onWheel"
          @mousedown="onStagePointerDown"
          @mousemove="onStagePointerMove"
          @pointerdown="onStageClick"
          @contextmenu="onStageContextMenu"
          @touchstart="onStageTouchStart"
          @touchmove="onStageTouchMove"
          @touchend="onStageTouchEnd"
          @touchcancel="onStageTouchEnd"
          @mouseleave="onStagePointerLeave"
          @dblclick="onStageDoubleClick"
          @dbltap="onStageDoubleClick"
        >
          <!-- BG -->
          <v-layer :config="{ listening: false }">
            <v-rect :config="bgConfig" />
          </v-layer>

          <!-- GRID (fast layer) -->
          <v-fast-layer v-if="store.settings.grid" :config="{ listening: false }">
            <v-line v-for="l in gridLines" :key="l.key" :config="l.cfg" />
          </v-fast-layer>

          <!-- STACK GRID PREVIEW -->
          <v-layer v-if="stackGridPreview" :config="{ listening: false }">
            <v-ellipse :config="stackGridPreview" />
          </v-layer>

          <!-- STACK SELECTION PREVIEW -->
          <v-layer v-if="stackSelectionPreview.length" :config="{ listening: false }">
            <v-rect
              v-for="item in stackSelectionPreview"
              :key="item.id"
              :config="{
                x: item.x - item.width / 2,
                y: item.y - item.height / 2,
                width: item.width,
                height: item.height,
                stroke: '#12a4b7',
                strokeWidth: 1,
                dash: [6, 4],
                fill: 'rgba(18, 164, 183, 0.05)',
                listening: false,
              }"
            />
          </v-layer>

          <!-- NODES -->
          <v-layer ref="layerRef">
            <v-line v-for="g in guidesLines" :key="g.key" :config="g.cfg" />

            <template v-for="node in renderNodes" :key="node.id">
              <template v-if="isSymbolNode(node)">
                <v-group
                  :config="symbolInstanceConfig(node)"
                  @mousedown="onNodePointerDown(node, $event)"
                  @touchstart="onNodePointerDown(node, $event)"
                  @dragstart="onDragStart(node, $event)"
                  @dragmove="onDragMove(node, $event)"
                  @dragend="onDragEnd(node, $event)"
                  @dblclick="onSymbolInstanceDoubleClick(node, $event)"
                  @dbltap="onSymbolInstanceDoubleClick(node, $event)"
                >
                  <template v-for="child in symbolNodesForInstance(node)" :key="child.id">
                    <v-group
                      :config="symbolChildGroupConfig(child, node.id)"
                      @mousedown="onSymbolNodePointerDown(node, child, $event)"
                      @touchstart="onSymbolNodePointerDown(node, child, $event)"
                      @dragstart="onSymbolDragStart(node, child, $event)"
                      @dragmove="onSymbolDragMove(node, $event)"
                      @dragend="onSymbolDragEnd(node, $event)"
                      @transformend="onSymbolTransformEnd(node)"
                    >
                      <template v-if="isTextNode(child)">
                        <v-text :config="textConfig(child, { listening: true })" />
                      </template>
                      <template v-else-if="isImageNode(child)">
                        <v-image :config="imageConfig(child, { listening: true })" />
                      </template>
                      <template v-else-if="isSymbolNode(child)">
                        <v-group
                          :config="nestedSymbolInstanceConfig(child)"
                          @dblclick="onNestedSymbolDoubleClick(child, $event)"
                          @dbltap="onNestedSymbolDoubleClick(child, $event)"
                        >
                          <template
                            v-for="nested in symbolNodesForSymbolId(child.symbolId)"
                            :key="nested.id"
                          >
                            <v-group :config="nestedSymbolChildConfig(nested)">
                              <template v-if="isTextNode(nested)">
                                <v-text :config="textConfig(nested, { listening: false })" />
                              </template>
                              <template v-else-if="isImageNode(nested)">
                                <v-image :config="imageConfig(nested, { listening: false })" />
                              </template>
                              <template v-else>
                                <v-ellipse :config="ellipseConfig(nested, { listening: false })" />
                                <v-ellipse
                                  v-if="renderQuality !== 'low'"
                                  :config="innerShadeConfig(nested)"
                                />
                                <v-ellipse
                                  v-if="renderQuality !== 'low'"
                                  :config="shineConfig(nested)"
                                />
                                <v-circle
                                  v-if="renderQuality === 'high'"
                                  :config="knotConfig(nested)"
                                />
                              </template>
                            </v-group>
                          </template>
                        </v-group>
                      </template>
                      <template v-else>
                        <v-ellipse :config="ellipseConfig(child, { listening: true })" />
                        <v-ellipse
                          v-if="renderQuality !== 'low'"
                          :config="innerShadeConfig(child)"
                        />
                        <v-ellipse v-if="renderQuality !== 'low'" :config="shineConfig(child)" />
                        <v-circle v-if="renderQuality === 'high'" :config="knotConfig(child)" />
                      </template>
                    </v-group>
                  </template>
                </v-group>
              </template>
              <template v-else>
                <v-group
                  :config="groupConfig(node)"
                  @mousedown="onNodePointerDown(node, $event)"
                  @touchstart="onNodePointerDown(node, $event)"
                  @dragstart="onDragStart(node, $event)"
                  @dragmove="onDragMove(node, $event)"
                  @dragend="onDragEnd(node, $event)"
                  @transformend="onTransformEnd"
                  @dblclick="onNodeDoubleClick(node, $event)"
                  @dbltap="onNodeDoubleClick(node, $event)"
                >
                  <template v-if="isTextNode(node)">
                    <v-text :config="textConfig(node)" />
                  </template>
                  <template v-else-if="isImageNode(node)">
                    <v-image :config="imageConfig(node)" />
                  </template>
                  <template v-else>
                    <v-ellipse :config="ellipseConfig(node)" />
                    <v-ellipse v-if="renderQuality !== 'low'" :config="innerShadeConfig(node)" />
                    <v-ellipse v-if="renderQuality !== 'low'" :config="shineConfig(node)" />
                    <v-circle v-if="renderQuality === 'high'" :config="knotConfig(node)" />
                  </template>
                </v-group>
              </template>
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

const symbolEdit = computed(() => store.ui?.symbolEdit || { active: false })
const symbolEditActive = computed(() => !!symbolEdit.value?.active)
const activeSymbolInstanceId = computed(() => symbolEdit.value?.instanceId || null)
const symbolsById = computed(() => new Map((store.symbols || []).map((s) => [String(s.id), s])))
const symbolEditName = computed(() => {
  if (!symbolEditActive.value) return ''
  const symbol = (store.symbols || []).find(
    (s) => String(s.id) === String(symbolEdit.value?.symbolId),
  )
  return symbol?.name || 'Simbolo'
})

const canGroup = computed(() => {
  if (symbolEditActive.value) return false
  const sel = store.selectedNodes || []
  const unlocked = sel.filter((n) => !n.locked)
  return unlocked.length >= 2
})

const canUngroup = computed(() => {
  if (symbolEditActive.value) return false
  const sel = store.selectedNodes || []
  return sel.some((n) => !!n.groupId)
})

const canCreateSymbol = computed(() => {
  const sel = store.selectedNodes || []
  if (sel.length < 2) return false
  return sel.every((n) => !n?.meta?.guide)
})
const canEditSymbol = computed(
  () => !symbolEditActive.value && store.selectedNode?.kind === 'symbol',
)
const canDetachSymbol = computed(
  () => !symbolEditActive.value && store.selectedNode?.kind === 'symbol',
)
const canExitSymbol = computed(() => symbolEditActive.value)

const groupEditMode = computed(() => !!store.ui?.groupEditMode)
const groupEditGroup = computed(() => {
  const gid = store.selectedGroupId
  if (!gid) return null
  const groups = Array.isArray(store.groups) ? store.groups : []
  return groups.find((g) => String(g.id) === String(gid)) || null
})
const toolbarVisible = computed(() => (store.selectedIds?.length || 0) === 1 && !!store.selectedId)
const toolbarStyle = computed(() => {
  const node = store.selectedNode
  if (!node) return {}
  const rs = renderScale.value
  const dx = store.view.x * displayScale.value
  const dy = store.view.y * displayScale.value
  const { ry } = nodeHalfSize(node)
  const rawX = node.x * rs + dx
  const rawY = (node.y - ry) * rs + dy - 44
  const maxW = size.value?.w || 0
  const maxH = size.value?.h || 0
  const toolbarW = 220
  const toolbarH = 44
  const x = clamp(rawX, 8, Math.max(8, maxW - toolbarW - 8))
  const y = clamp(rawY, 8, Math.max(8, maxH - toolbarH - 8))
  return {
    transform: `translate(${Math.round(x)}px, ${Math.round(y)}px)`,
  }
})
const toolbarAngle = computed(() => Math.round(Number(store.selectedNode?.rotation || 0)))

const wrap = ref(null)
const stageRef = ref(null)
const layerRef = ref(null)
const trRef = ref(null)
const rasterActive = ref(false)
const pointerActive = ref(false)

const displayScale = computed(() => {
  const n = Number(store.canvas?.displayScale || 1)
  return Math.min(MAX_DISPLAY_SCALE, Math.max(MIN_DISPLAY_SCALE, n))
})
const renderScale = computed(() => store.view.scale * displayScale.value)

const stackGridPreview = computed(() => {
  if (!pointerActive.value) return null
  const grid = store.ui?.stackGrid
  if (!grid?.enabled || grid?.pickOrigin) return null

  const startX = Number.isFinite(Number(grid.startX)) ? Number(grid.startX) : 200
  const startY = Number.isFinite(Number(grid.startY)) ? Number(grid.startY) : 200
  const gapX = Math.max(0, Math.round(Number(grid.gapX ?? grid.gap ?? 0) || 0))
  const gapY = Math.max(0, Math.round(Number(grid.gapY ?? grid.gap ?? 0) || 0))

  const cursor = store.stackGridCursor || { col: 0, row: 0 }
  const col = Math.max(0, Math.round(Number(cursor.col || 0)))
  const row = Math.max(0, Math.round(Number(cursor.row || 0)))

  const meta = store.selectedNode?.meta || {}
  const rx = Number(meta?.radiusX ?? 46)
  const ry = Number(meta?.radiusY ?? 60)
  const cellW = rx * 2 + gapX
  const cellH = ry * 2 + gapY

  const x = startX + col * cellW
  const y = startY + row * cellH

  return {
    x,
    y,
    radiusX: rx,
    radiusY: ry,
    fill: 'rgba(18, 164, 183, 0.08)',
    stroke: '#12a4b7',
    strokeWidth: 1,
    dash: [4, 4],
    opacity: 0.7,
    listening: false,
  }
})

const stackSelectionPreview = computed(() => {
  if (!store.ui?.stackSelection?.preview) return []
  return store.stackSelectionLayout || []
})

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
  listening: false,
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
const maxRenderNodes = computed(() => {
  const base = Number(store.ui?.maxVisibleNodes || 2500)
  const scale = renderScale.value
  if (scale <= 0.35) return Math.max(300, Math.round(base * 0.25))
  if (scale <= 0.6) return Math.max(600, Math.round(base * 0.45))
  if (scale <= 0.9) return Math.max(1000, Math.round(base * 0.7))
  return base
})

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
    opacity: baseOpacity(n.opacity) * dimFactorForNode(n),
    draggable: !n.locked && !panning.value && !panMode.value && !spaceDown.value, // evita drag de nodos mientras paneas
    listening: !n?.meta?.guide,
  }
}

function symbolInstanceConfig(n) {
  return {
    id: n.id,
    x: n.x,
    y: n.y,
    rotation: n.rotation,
    scaleX: n.scaleX,
    scaleY: n.scaleY,
    opacity: baseOpacity(n.opacity) * dimFactorForNode(n),
    draggable:
      !symbolEditActive.value && !n.locked && !panning.value && !panMode.value && !spaceDown.value,
    listening: !n?.meta?.guide,
  }
}

function symbolChildId(instanceId, childId) {
  return `symbol-${instanceId}-${childId}`
}

function parseSymbolChildId(id) {
  if (typeof id !== 'string' || !id.startsWith('symbol-')) return null
  const raw = id.slice('symbol-'.length)
  const splitIndex = raw.indexOf('-')
  if (splitIndex <= 0) return null
  return {
    instanceId: raw.slice(0, splitIndex),
    childId: raw.slice(splitIndex + 1),
  }
}

function symbolChildGroupConfig(child, instanceId) {
  const active =
    symbolEditActive.value && String(instanceId) === String(activeSymbolInstanceId.value)
  return {
    id: symbolChildId(instanceId, child.id),
    x: child.x,
    y: child.y,
    rotation: child.rotation,
    scaleX: child.scaleX,
    scaleY: child.scaleY,
    opacity: child.opacity,
    visible: child.visible !== false,
    draggable: active && !child.locked && !panning.value && !panMode.value && !spaceDown.value,
    listening: !child?.meta?.guide,
  }
}

function isTextNode(n) {
  return n?.kind === 'text'
}

function isImageNode(n) {
  return n?.kind === 'image'
}

function isSymbolNode(n) {
  return n?.kind === 'symbol'
}

function isActiveSymbolInstance(n) {
  return symbolEditActive.value && String(n?.id) === String(activeSymbolInstanceId.value)
}

function ellipseConfig(n, { listening = true } = {}) {
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
    hitStrokeWidth: 0,
    listening,
    perfectDrawEnabled: false,
  }
}

function textConfig(n, { listening = false } = {}) {
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
    listening,
  }
}

const imageCache = new Map()

function imageConfig(n, { listening = false } = {}) {
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
    listening,
  }
}

function symbolNodesForInstance(n) {
  const symbol = symbolsById.value.get(String(n?.symbolId))
  if (!symbol || !Array.isArray(symbol.nodes)) return []
  return symbol.nodes
}

function symbolNodesForSymbolId(symbolId) {
  const symbol = symbolsById.value.get(String(symbolId))
  if (!symbol || !Array.isArray(symbol.nodes)) return []
  return symbol.nodes
}

function nestedSymbolChildConfig(child) {
  return {
    id: `nested-${child.id}-${child.symbolId || 'node'}`,
    x: child.x,
    y: child.y,
    rotation: child.rotation,
    scaleX: child.scaleX,
    scaleY: child.scaleY,
    opacity: child.opacity,
    listening: false,
  }
}

function nestedSymbolInstanceConfig(child) {
  return {
    id: `nested-instance-${child.id}`,
    x: child.x,
    y: child.y,
    rotation: child.rotation,
    scaleX: child.scaleX,
    scaleY: child.scaleY,
    opacity: child.opacity,
    listening: true,
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

function innerShadeConfig(n) {
  const rx = Number(n?.meta?.radiusX ?? 46)
  const ry = Number(n?.meta?.radiusY ?? 60)
  const maxR = Math.max(rx, ry)

  return {
    x: 0,
    y: 0,
    radiusX: rx,
    radiusY: ry,
    fillRadialGradientStartPoint: { x: 0, y: 0 },
    fillRadialGradientEndPoint: { x: 0, y: 0 },
    fillRadialGradientStartRadius: 0,
    fillRadialGradientEndRadius: maxR,
    fillRadialGradientColorStops: [0, 'rgba(0,0,0,0)', 0.6, 'rgba(0,0,0,0)', 1, 'rgba(0,0,0,0.22)'],
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
  if (renderScale.value <= 0.35) return []
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

function baseOpacity(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 1
}

function dimFactorForNode(n) {
  if (symbolEditActive.value) {
    if (n?.kind === 'symbol') {
      return String(n.id) === String(activeSymbolInstanceId.value) ? 1 : 0.2
    }
    return 0.15
  }

  if (groupEditMode.value && store.selectedGroupId) {
    const same = n?.groupId && String(n.groupId) === String(store.selectedGroupId)
    return same ? 1 : 0.25
  }

  return 1
}

function symbolBounds(symbol, depth = 0) {
  const nodes = Array.isArray(symbol?.nodes) ? symbol.nodes : []
  if (!nodes.length) {
    return { left: 0, right: 0, top: 0, bottom: 0, width: 0, height: 0 }
  }
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const n of nodes) {
    let box = null
    if (n?.kind === 'symbol' && depth < 4) {
      const nested = symbolsById.value.get(String(n.symbolId))
      if (nested) {
        const nestedBounds = symbolBounds(nested, depth + 1)
        const sx = Math.abs(Number(n.scaleX ?? 1))
        const sy = Math.abs(Number(n.scaleY ?? 1))
        const left = Number(n.x || 0) + nestedBounds.left * sx
        const right = Number(n.x || 0) + nestedBounds.right * sx
        const top = Number(n.y || 0) + nestedBounds.top * sy
        const bottom = Number(n.y || 0) + nestedBounds.bottom * sy
        box = { x: left, y: top, width: right - left, height: bottom - top }
      }
    }

    if (!box) box = nodeBoundingBox(n)
    minX = Math.min(minX, box.x)
    minY = Math.min(minY, box.y)
    maxX = Math.max(maxX, box.x + box.width)
    maxY = Math.max(maxY, box.y + box.height)
  }
  if (!Number.isFinite(minX) || !Number.isFinite(minY)) {
    return { left: 0, right: 0, top: 0, bottom: 0, width: 0, height: 0 }
  }
  return {
    left: minX,
    right: maxX,
    top: minY,
    bottom: maxY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

function nodeHalfSize(n) {
  if (isSymbolNode(n)) {
    const symbol = symbolsById.value.get(String(n.symbolId))
    if (!symbol) return { rx: 0, ry: 0 }
    const bounds = symbolBounds(symbol)
    const sx = Math.abs(Number(n?.scaleX ?? 1))
    const sy = Math.abs(Number(n?.scaleY ?? 1))
    return { rx: (bounds.width / 2) * sx, ry: (bounds.height / 2) * sy }
  }

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
  pointerActive.value = true
}

function onStagePointerLeave() {
  pointerActive.value = false
}

/* ================== SELECTION ================== */
function onNodePointerDown(node, e) {
  if (symbolEditActive.value) return
  // si estamos en pan, no seleccionar
  if (panning.value || panMode.value || spaceDown.value) return

  // locked = intocable desde el canvas
  if (node?.locked) return
  if (node?.meta?.guide) return

  if (groupEditMode.value && store.selectedGroupId) {
    if (!node.groupId || String(node.groupId) !== String(store.selectedGroupId)) return
  }

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

  if (!append && !mod && node.groupId && !store.ui?.groupEditMode) {
    store.selectGroup(node.groupId)
    closeMenu()
    return
  }

  store.select(node.id, { append: false })
  closeMenu()
}

function onSymbolNodePointerDown(instance, node, e) {
  if (!symbolEditActive.value) {
    if (instance?.kind === 'symbol') store.select(instance.id, { append: false })
    closeMenu()
    return
  }
  if (!isActiveSymbolInstance(instance)) return
  if (node?.locked) return
  if (node?.meta?.guide) return

  if (e?.cancelBubble !== undefined) e.cancelBubble = true
  if (e?.evt?.cancelBubble !== undefined) e.evt.cancelBubble = true

  const evt = e?.evt
  const isMac = navigator.platform.toLowerCase().includes('mac')
  const mod = isMac ? !!evt?.metaKey : !!evt?.ctrlKey
  const append = !!evt?.shiftKey

  if (mod || append) {
    store.toggleSelectSymbolNode(node.id)
    closeMenu()
    return
  }

  store.selectSymbolNode(node.id, { append: false })
  closeMenu()
}

/* ================== TRANSFORMER ================== */
const activeSelectionIds = computed(() =>
  symbolEditActive.value ? store.ui?.symbolEdit?.selectedIds || [] : store.selectedIds || [],
)

watch(
  () => [activeSelectionIds.value, symbolEditActive.value, activeSymbolInstanceId.value],
  async ([ids]) => {
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
    if (symbolEditActive.value) {
      const symbol = symbolsById.value.get(String(symbolEdit.value.symbolId))
      const nodeById = new Map((symbol?.nodes || []).map((n) => [String(n.id), n]))
      for (const id of list) {
        const model = nodeById.get(String(id))
        if (!model || model.locked || model?.meta?.guide) continue
        const n = stage.findOne('#' + symbolChildId(activeSymbolInstanceId.value, id))
        if (n) konvaNodes.push(n)
      }
    } else {
      for (const id of list) {
        const n = stage.findOne('#' + String(id))
        const model = store.nodes.find((x) => x.id === id)
        if (n && model && !model.locked && !model?.meta?.guide) konvaNodes.push(n)
      }
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

let symbolDragSession = null
let symbolDragRaf = null
let pendingSymbolDrag = null

function onDragStart(node, e) {
  if (symbolEditActive.value) return
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

  let selected = store.selectedNodes.filter((n) => !n.locked)

  if (store.selectedGroupId && !groupEditMode.value) {
    const group = (store.groups || []).find((g) => String(g.id) === String(store.selectedGroupId))
    if (group && Array.isArray(group.childIds)) {
      const nodeById = new Map(store.nodes.map((n) => [String(n.id), n]))
      selected = group.childIds.map((id) => nodeById.get(String(id))).filter((n) => n && !n.locked)
    }
  }

  const groupIds = selected.map((n) => n.id)

  const isGroupDrag = !!store.selectedGroupId && !groupEditMode.value
  dragSession = {
    anchorId: node.id,
    startAnchor: { x: t.x(), y: t.y() },
    ids: groupIds,
    startPos: new Map(),
    candidates: isGroupDrag ? { xs: [], ys: [] } : buildSnapCandidates(groupIds),
    anchorModel: store.nodes.find((n) => n.id === node.id) || node,
    disableSnap: isGroupDrag,
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
  pendingDrag = { node, e }
  if (!dragRaf) {
    dragRaf = requestAnimationFrame(() => {
      const payload = pendingDrag
      pendingDrag = null
      dragRaf = null
      if (payload) handleDragMove(payload.node, payload.e)
    })
  }
}

function handleDragMove(node, e) {
  if (!dragSession) return
  const t = e.target
  if (!t) return

  const stage = getStage()
  if (!stage) return

  const startA = dragSession.startAnchor

  let ax = dragSession.disableSnap ? t.x() : snapValue(t.x())
  let ay = dragSession.disableSnap ? t.y() : snapValue(t.y())

  const anchorModel = dragSession.anchorModel
  const box = nodeBoxAt(anchorModel, ax, ay)
  const snapped = dragSession.disableSnap
    ? { dx: 0, dy: 0, gx: null, gy: null }
    : snapBoxToGuides(box, dragSession.candidates)

  if (snapped.dx || snapped.dy) {
    ax += snapped.dx
    ay += snapped.dy
  }

  t.position({ x: ax, y: ay })

  if (!dragSession.disableSnap) {
    guides.value = {
      x: snapped.gx ? { value: snapped.gx.value, type: snapped.gx.type } : null,
      y: snapped.gy ? { value: snapped.gy.value, type: snapped.gy.type } : null,
    }
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

function onSymbolDragStart(instance, node, e) {
  if (!symbolEditActive.value || !isActiveSymbolInstance(instance)) return
  if (node?.locked || node?.meta?.guide) return
  const t = e.target
  if (!t) return

  const selected = Array.isArray(store.ui?.symbolEdit?.selectedIds)
    ? store.ui.symbolEdit.selectedIds
    : []
  if (!selected.includes(node.id)) store.selectSymbolNode(node.id, { append: false })

  const ids = Array.isArray(store.ui?.symbolEdit?.selectedIds)
    ? store.ui.symbolEdit.selectedIds
    : []

  symbolDragSession = {
    instanceId: instance.id,
    anchorId: node.id,
    startAnchor: { x: t.x(), y: t.y() },
    ids,
    startPos: new Map(),
  }

  const stage = getStage()
  if (stage) {
    for (const id of ids) {
      const g = stage.findOne('#' + symbolChildId(instance.id, id))
      if (g) symbolDragSession.startPos.set(id, { x: g.x(), y: g.y() })
    }
  }

  store.beginHistoryBatch()
}

function onSymbolDragMove(instance, e) {
  if (!symbolDragSession || !symbolEditActive.value) return
  pendingSymbolDrag = { instance, e }
  if (!symbolDragRaf) {
    symbolDragRaf = requestAnimationFrame(() => {
      const payload = pendingSymbolDrag
      pendingSymbolDrag = null
      symbolDragRaf = null
      if (payload) handleSymbolDragMove(payload.instance, payload.e)
    })
  }
}

function handleSymbolDragMove(instance, e) {
  if (!symbolDragSession || !symbolEditActive.value) return
  const t = e.target
  if (!t) return

  const stage = getStage()
  if (!stage) return

  const startA = symbolDragSession.startAnchor
  const dx = t.x() - startA.x
  const dy = t.y() - startA.y

  for (const id of symbolDragSession.ids) {
    const start = symbolDragSession.startPos.get(id)
    if (!start) continue
    const g = stage.findOne('#' + symbolChildId(instance.id, id))
    if (!g) continue
    g.position({ x: start.x + dx, y: start.y + dy })
  }

  stage.batchDraw()
}

function onSymbolDragEnd(instance, e) {
  if (symbolDragRaf) cancelAnimationFrame(symbolDragRaf)
  symbolDragRaf = null
  pendingSymbolDrag = null

  const stage = getStage()
  if (!symbolDragSession || !stage || !symbolEditActive.value) {
    symbolDragSession = null
    store.endHistoryBatch()
    return
  }

  try {
    const patchById = {}
    for (const id of symbolDragSession.ids) {
      const g = stage.findOne('#' + symbolChildId(instance.id, id))
      if (!g) continue
      patchById[id] = { x: g.x(), y: g.y() }
    }

    if (Object.keys(patchById).length) {
      store.updateSymbolNodes(symbolEdit.value.symbolId, patchById)
    }
  } finally {
    symbolDragSession = null
    store.endHistoryBatch()
  }
}

function onTransformEnd() {
  if (symbolEditActive.value) return
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

function onSymbolTransformEnd(instance) {
  if (!symbolEditActive.value || !isActiveSymbolInstance(instance)) return
  const stage = getStage()
  if (!stage) return

  const ids = Array.isArray(store.ui?.symbolEdit?.selectedIds)
    ? store.ui.symbolEdit.selectedIds
    : []
  if (!ids.length) return

  const symbol = symbolsById.value.get(String(symbolEdit.value.symbolId))
  if (!symbol) return

  const nodeById = new Map((symbol.nodes || []).map((n) => [String(n.id), n]))
  const patchById = {}
  for (const id of ids) {
    const model = nodeById.get(String(id))
    if (!model || model.locked || model?.meta?.guide) continue
    const g = stage.findOne('#' + symbolChildId(instance.id, id))
    if (!g) continue
    patchById[id] = {
      x: g.x(),
      y: g.y(),
      scaleX: g.scaleX(),
      scaleY: g.scaleY(),
      rotation: g.rotation(),
    }
  }

  if (Object.keys(patchById).length) store.updateSymbolNodes(symbol.id, patchById)
}

/* ================== CLICK EMPTY ================== */
function onStageClick(e) {
  const stage = getStage()
  if (!stage) return

  if (store.ui?.stackGrid?.pickOrigin) {
    const pointer = stage.getPointerPosition()
    const scale = renderScale.value
    if (pointer && scale) {
      const dx = store.view.x * displayScale.value
      const dy = store.view.y * displayScale.value
      const x = (pointer.x - dx) / scale
      const y = (pointer.y - dy) / scale
      store.setStackGridOrigin?.({ x, y })
      store.setStackGridPickOrigin?.(false)
    }
    if (e?.cancelBubble !== undefined) e.cancelBubble = true
    if (e?.evt?.cancelBubble !== undefined) e.evt.cancelBubble = true
    return
  }

  const target = e.target
  const clickedOnStage = target === stage
  const clickedOnBg = typeof target?.hasName === 'function' && target.hasName('bg')

  if (clickedOnStage || clickedOnBg) {
    clearGuides()
    if (symbolEditActive.value) {
      store.clearSymbolSelection()
      return
    }
    if (!groupEditMode.value) store.clearSelection()
  }
}

function onNodeDoubleClick(node, e) {
  if (!node?.groupId) return
  if (e?.cancelBubble !== undefined) e.cancelBubble = true
  if (e?.evt?.cancelBubble !== undefined) e.evt.cancelBubble = true
  store.setGroupEditMode({ enabled: true, groupId: node.groupId })
}

function onSymbolInstanceDoubleClick(node, e) {
  if (symbolEditActive.value) return
  if (!node || node.kind !== 'symbol') return
  if (e?.cancelBubble !== undefined) e.cancelBubble = true
  if (e?.evt?.cancelBubble !== undefined) e.evt.cancelBubble = true
  store.enterSymbolEdit(node.id)
}

function onNestedSymbolDoubleClick(child, e) {
  if (!symbolEditActive.value) return
  if (!child || child.kind !== 'symbol') return
  if (e?.cancelBubble !== undefined) e.cancelBubble = true
  if (e?.evt?.cancelBubble !== undefined) e.evt.cancelBubble = true
  store.enterNestedSymbolEdit?.(child.id)
}

function onStageDoubleClick() {
  if (symbolEditActive.value) {
    store.exitSymbolEdit({ selectInstance: true })
    return
  }
  if (!groupEditMode.value) return
  store.setGroupEditMode({ enabled: false })
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

  if (groupEditMode.value) return

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

  if (action === 'create-symbol') store.createSymbolFromSelection?.()
  if (action === 'edit-symbol' && store.selectedId) store.enterSymbolEdit?.(store.selectedId)
  if (action === 'exit-symbol') store.exitSymbolEdit?.({ selectInstance: true })
  if (action === 'detach-symbol' && store.selectedId) store.detachSymbolInstance?.(store.selectedId)

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

  if (symbolEditActive.value) {
    if (!isBg && !isStage) {
      const group = target?.getParent?.()
      const id = group?.id?.() || target?.id?.()
      const parsed = parseSymbolChildId(id)
      if (parsed && String(parsed.instanceId) === String(activeSymbolInstanceId.value)) {
        store.selectSymbolNode(parsed.childId, { append: false })
      }
    } else {
      store.clearSymbolSelection()
    }

    const cp = getCanvasPointer(stage)
    if (!cp) return
    openMenu(e.evt.clientX, e.evt.clientY, cp.x, cp.y)
    return
  }

  if (!isBg && !isStage) {
    const group = target?.getParent?.()
    const id = group?.id?.() || target?.id?.()
    if (id) {
      const parsed = parseSymbolChildId(id)
      if (parsed) {
        store.select(parsed.instanceId)
        return
      }
      const model = store.nodes.find((n) => String(n.id) === String(id))
      if (
        model &&
        !model.locked &&
        (!groupEditMode.value ||
          (model.groupId && String(model.groupId) === String(store.selectedGroupId)))
      ) {
        if (model.groupId && !groupEditMode.value) {
          store.selectGroup(model.groupId)
        } else {
          store.select(String(id))
        }
      }
    }
  } else {
    if (!groupEditMode.value) store.clearSelection()
  }

  const cp = getCanvasPointer(stage)
  if (!cp) return
  openMenu(e.evt.clientX, e.evt.clientY, cp.x, cp.y)
}

function onToolbarDuplicate() {
  if (!store.selectedId) return
  store.duplicateSelected({ offset: 18 })
}

function onToolbarDelete() {
  if (!store.selectedId) return
  store.deleteSelected()
}

function onToolbarRotate(delta) {
  const node = store.selectedNode
  if (!node) return
  const next = clamp(Number(node.rotation || 0) + delta, -180, 180)
  store.updateNode(node.id, { rotation: next })
}

function onToolbarBringForward() {
  store.bringForwardSelected?.()
}

function onToolbarSendBackward() {
  store.sendBackwardSelected?.()
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
    if (symbolEditActive.value) store.exitSymbolEdit({ selectInstance: true })
    return
  }

  // Delete: borrar selección
  if (e.key === 'Delete' || e.key === 'Backspace') {
    const hasSelection = symbolEditActive.value
      ? (store.ui?.symbolEdit?.selectedIds?.length || 0) > 0
      : (store.selectedIds?.length || 0) > 0
    if (hasSelection) {
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

.group-edit-hint {
  position: absolute;
  top: 10px;
  left: 10px;
  background: rgba(37, 99, 235, 0.9);
  color: #fff;
  padding: 6px 10px;
  border-radius: 10px;
  font-size: 0.72rem;
  font-weight: 600;
  z-index: 10;
}

.symbol-edit-hint {
  position: absolute;
  top: 10px;
  left: 10px;
  background: rgba(17, 24, 39, 0.92);
  color: #f8fafc;
  padding: 6px 10px;
  border-radius: 10px;
  font-size: 0.72rem;
  font-weight: 600;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 6px;
}

.symbol-edit-hint .btn {
  padding: 2px 8px;
  font-size: 0.7rem;
}

.float-toolbar {
  position: absolute;
  display: flex;
  gap: 6px;
  padding: 4px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.98);
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 10px 18px -12px rgba(0, 0, 0, 0.3);
  z-index: 11;
}

.float-toolbar .icon-btn {
  width: 30px;
  height: 30px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.angle-chip {
  min-width: 44px;
  height: 30px;
  padding: 0 8px;
  border-radius: 999px;
  background: rgba(13, 110, 253, 0.1);
  color: #1f3b7a;
  font-size: 0.72rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(13, 110, 253, 0.2);
}

.angle-chip.limit {
  background: rgba(220, 53, 69, 0.15);
  color: #8b1e2d;
  border-color: rgba(220, 53, 69, 0.35);
}
</style>
