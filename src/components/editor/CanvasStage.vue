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
          <button
            class="btn btn-sm btn-light ms-2"
            type="button"
            title="Salir de edicion"
            @click="store.setGroupEditMode({ enabled: false })"
          >
            <i class="bi bi-box-arrow-left"></i>
          </button>
        </div>
        <div v-if="symbolEditActive" class="symbol-edit-hint">
          Editando simbolo: <span class="fw-semibold">{{ symbolEditName }}</span>
          <button class="btn btn-sm btn-light ms-2" type="button" @click="store.exitSymbolEdit()">
            Salir
          </button>
        </div>
        <div v-if="toolbarVisible" class="float-toolbar" :style="toolbarStyle">
          <button
            v-if="canClusterConfig"
            class="btn btn-sm btn-light icon-btn"
            type="button"
            title="Editar elementos"
            @click="onToolbarEditElements"
          >
            <i class="bi bi-grid-3x3-gap"></i>
          </button>
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
            v-if="canClusterConfig"
            class="btn btn-sm btn-light icon-btn"
            type="button"
            title="Desinflar"
            @click="onToolbarInflate(-0.5)"
          >
            <i class="bi bi-dash-lg"></i>
          </button>
          <button
            v-if="canClusterConfig"
            class="btn btn-sm btn-light icon-btn"
            type="button"
            title="Inflar"
            @click="onToolbarInflate(0.5)"
          >
            <i class="bi bi-plus-lg"></i>
          </button>
          <button
            v-if="canClusterConfig"
            class="btn btn-sm btn-light icon-btn"
            type="button"
            title="Rotacion (grados)"
            @click="onToolbarRotateCluster"
          >
            <i class="bi bi-compass"></i>
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
            v-if="canClusterConfig"
            class="btn btn-sm btn-light icon-btn"
            type="button"
            title="Copiar configuracion de cluster"
            @click="onToolbarCopyClusterConfig"
          >
            <i class="bi bi-clipboard"></i>
          </button>
          <button
            v-if="canClusterConfig"
            class="btn btn-sm btn-light icon-btn"
            type="button"
            title="Pegar configuracion de cluster"
            :disabled="!canPasteClusterConfig"
            @click="onToolbarPasteClusterConfig"
          >
            <i class="bi bi-clipboard-plus"></i>
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
          :can-cluster-config="canClusterConfig"
          :can-paste-cluster-config="canPasteClusterConfig"
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
            <v-rect v-if="guideWallRect" :config="guideWallRect" />
            <v-line v-for="tick in guideWallTicks" :key="tick.key" :config="tick" />
            <v-text v-for="mark in guideWallMarks" :key="mark.key" :config="mark" />
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
                                  v-if="effectiveQuality !== 'low'"
                                  :config="innerShadeConfig(nested)"
                                />
                                <v-ellipse
                                  v-if="effectiveQuality !== 'low'"
                                  :config="shineConfig(nested)"
                                />
                                <v-circle
                                  v-if="effectiveQuality === 'high'"
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
                          v-if="effectiveQuality !== 'low'"
                          :config="innerShadeConfig(child)"
                        />
                        <v-ellipse v-if="effectiveQuality !== 'low'" :config="shineConfig(child)" />
                        <v-circle v-if="effectiveQuality === 'high'" :config="knotConfig(child)" />
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
                    <v-ellipse v-if="effectiveQuality !== 'low'" :config="innerShadeConfig(node)" />
                    <v-ellipse v-if="effectiveQuality !== 'low'" :config="shineConfig(node)" />
                    <v-circle v-if="effectiveQuality === 'high'" :config="knotConfig(node)" />
                    <v-text v-if="guideNumberConfig(node)" :config="guideNumberConfig(node)" />
                  </template>
                </v-group>
              </template>
            </template>

            <v-rect v-if="marquee.active" :config="marqueeRectConfig" />
            <v-rect v-if="cropRectConfig" :config="cropRectConfig" />
            <v-group v-if="selectionLabel" :config="{ listening: false }">
              <v-rect :config="selectionLabelBg" />
              <v-text :config="selectionLabel" />
            </v-group>
            <v-group v-if="selectionMeasureLabel" :config="{ listening: false }">
              <v-rect :config="selectionMeasureLabelBg" />
              <v-text :config="selectionMeasureLabel" />
            </v-group>
            <v-transformer ref="trRef" :config="transformerConfig" />
          </v-layer>
        </v-stage>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useActiveEditorStore } from '@/stores/editor-context'
import { useCatalogStore } from '@/stores/catalog.store'
import { MAX_DISPLAY_SCALE, MIN_CANVAS_CM, MIN_DISPLAY_SCALE, PX_PER_CM } from '@/constants/canvas'
import ContextMenu from '@/components/editor/ContextMenu.vue'

const store = useActiveEditorStore()
const isGuideStore = computed(() => store?.$id === 'guide-editor' || !!store?.ui?.isGuideStore)
const catalog = useCatalogStore()
const emit = defineEmits([
  'guide-paint',
  'guide-inflate',
  'toolbar-inflate',
  'toolbar-rotate-cluster',
])

const symbolEdit = computed(() => store.ui?.symbolEdit || { active: false })
const symbolEditActive = computed(() => !!symbolEdit.value?.active)
const activeSymbolInstanceId = computed(() => symbolEdit.value?.instanceId || null)
const symbolsById = computed(() => new Map((store.symbols || []).map((s) => [String(s.id), s])))
const cropMode = computed(() => !!store.ui?.cropMode)
const selectedGroup = computed(() => {
  const gid = store.selectedGroupId
  if (!gid) return null
  return (store.groups || []).find((g) => String(g.id) === String(gid)) || null
})
const canClusterConfig = computed(() => {
  if (!isGuideStore.value) return false
  return !!(selectedGroup.value && Array.isArray(selectedGroup.value.childIds))
})
const canPasteClusterConfig = computed(() => {
  if (!isGuideStore.value) return false
  return !!store.ui?.clusterConfigClipboard
})
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
  if (sel.length < 1) return false
  return sel.every((n) => !n?.meta?.guide)
})
const selectedSymbolInstanceId = computed(() => {
  if (symbolEditActive.value) return null
  const list = store.selectedNodes || []
  const symbol = list.find((n) => n?.kind === 'symbol')
  return symbol?.id || null
})
const canEditSymbol = computed(() => !symbolEditActive.value && !!selectedSymbolInstanceId.value)
const canDetachSymbol = computed(() => !symbolEditActive.value && !!selectedSymbolInstanceId.value)
const canExitSymbol = computed(() => symbolEditActive.value)

const groupEditMode = computed(() => !!store.ui?.groupEditMode)
const groupEditGroup = computed(() => {
  const gid = store.selectedGroupId
  if (!gid) return null
  const groups = Array.isArray(store.groups) ? store.groups : []
  return groups.find((g) => String(g.id) === String(gid)) || null
})
const selectionKind = computed(() => {
  if (symbolEditActive.value) return null
  const list = store.selectedNodes || []
  if (!list.length) return null
  const allGuides = list.every((n) => !!n?.meta?.guideLine)
  if (allGuides) return 'guide'
  if (store.selectedGroupId) return 'group'
  if (list.length === 1 && list[0]?.kind === 'symbol') return 'symbol'
  return 'object'
})
const guideNumberById = computed(() => {
  if (!isGuideStore.value) return new Map()
  const map = new Map()
  let count = 1
  for (const node of store.visibleNodes || []) {
    if (!node?.meta?.guideLine) continue
    map.set(String(node.id), count)
    count += 1
  }
  return map
})
const selectionAccent = computed(() => {
  if (selectionKind.value === 'guide') return '#0d6efd'
  if (selectionKind.value === 'symbol') return '#f59e0b'
  if (selectionKind.value === 'group') return '#6c757d'
  if (selectionKind.value === 'object') return '#198754'
  return '#12a4b7'
})
const selectionLabelText = computed(() => {
  if (selectionKind.value === 'guide') return ''
  if (selectionKind.value === 'group') {
    const group = groupEditGroup.value
    return group?.name ? `Grupo: ${group.name}` : 'Grupo'
  }
  if (selectionKind.value === 'symbol') {
    const node = store.selectedNode
    const symbol = symbolsById.value.get(String(node?.symbolId))
    return symbol?.name ? `Simbolo: ${symbol.name}` : 'Simbolo'
  }
  return ''
})
const selectionBounds = computed(() => {
  const list = store.selectedNodes || []
  if (!list.length) return null
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const n of list) {
    const box = nodeBoundingBox(n)
    minX = Math.min(minX, box.x)
    minY = Math.min(minY, box.y)
    maxX = Math.max(maxX, box.x + box.width)
    maxY = Math.max(maxY, box.y + box.height)
  }
  if (!Number.isFinite(minX) || !Number.isFinite(minY)) return null
  return { left: minX, top: minY, width: maxX - minX, height: maxY - minY }
})
const selectionLabel = computed(() => {
  const text = selectionLabelText.value
  if (!text) return null
  const bounds = selectionBounds.value
  if (!bounds) return null
  const fontSize = 28
  const padding = 18
  const textWidth = Math.max(120, Math.round(text.length * fontSize * 0.6))
  const width = textWidth + padding * 2
  const height = fontSize + padding * 2
  const x = clamp(bounds.left, 6, Math.max(6, canvasWidth.value - width - 6))
  const y = clamp(bounds.top - height - 6, 6, Math.max(6, canvasHeight.value - height - 6))
  return {
    x,
    y,
    width,
    height,
    text,
    fontSize,
    fontFamily: 'Space Grotesk, sans-serif',
    fill: selectionAccent.value,
    padding,
    listening: false,
    verticalAlign: 'middle',
  }
})
const selectionMeasureText = computed(() => {
  if (!store.ui?.showObjectMeasures) return ''
  const bounds = selectionBounds.value
  if (!bounds) return ''
  const widthCm = Math.round((bounds.width / PX_PER_CM) * 10) / 10
  const heightCm = Math.round((bounds.height / PX_PER_CM) * 10) / 10
  const widthIn = Math.round((widthCm / 2.54) * 100) / 100
  const heightIn = Math.round((heightCm / 2.54) * 100) / 100
  return `W ${widthCm} cm (${widthIn} in) · H ${heightCm} cm (${heightIn} in)`
})
const selectionMeasureLabel = computed(() => {
  const text = selectionMeasureText.value
  if (!text) return null
  const bounds = selectionBounds.value
  if (!bounds) return null
  const fontSize = 9
  const padding = 4
  const textWidth = Math.max(30, Math.round(text.length * fontSize * 0.6))
  const width = textWidth + padding * 2
  const height = fontSize + padding * 2
  const x = clamp(bounds.left + bounds.width - width, 6, Math.max(6, canvasWidth.value - width - 6))
  const y = clamp(bounds.top - height - 12, 6, Math.max(6, canvasHeight.value - height - 6))
  return {
    x,
    y,
    width,
    height,
    text,
    fontSize,
    fill: '#ffffff',
    align: 'center',
    verticalAlign: 'middle',
  }
})
const selectionMeasureLabelBg = computed(() => {
  const label = selectionMeasureLabel.value
  if (!label) return null
  return {
    x: label.x,
    y: label.y,
    width: label.width,
    height: label.height,
    fill: '#0b0f14',
    stroke: '#0b0f14',
    strokeWidth: 2,
    cornerRadius: 10,
    shadowColor: 'rgba(0,0,0,0.45)',
    shadowBlur: 10,
    shadowOffsetX: 0,
    shadowOffsetY: 4,
    shadowOpacity: 0.6,
    shadowEnabled: true,
  }
})
const selectionLabelBg = computed(() => {
  const label = selectionLabel.value
  if (!label) return null
  return {
    x: label.x,
    y: label.y,
    width: label.width,
    height: label.height,
    fill: 'rgba(255, 255, 255, 0.9)',
    stroke: selectionAccent.value,
    strokeWidth: 1,
    cornerRadius: 4,
    listening: false,
  }
})
const backgroundSelected = computed(() => {
  const ids = Array.isArray(store.selectedIds) ? store.selectedIds : []
  if (ids.length !== 1) return false
  const node = store.selectedNode
  return !!node?.meta?.background
})
const symbolToolbarId = computed(() => {
  if (!symbolEditActive.value) return null
  const ids = store.ui?.symbolEdit?.selectedIds || []
  if (ids.length !== 1) return null
  return ids[0]
})
const toolbarNode = computed(() => {
  if (symbolEditActive.value) return null
  const node = store.selectedNode
  if (node) return node
  const ids = store.selectedIds || []
  if (!ids.length) return null
  const fallbackId = ids[ids.length - 1]
  return store.nodes.find((n) => String(n.id) === String(fallbackId)) || null
})
const toolbarVisible = computed(() => {
  if (symbolEditActive.value) return !!symbolToolbarId.value
  if (store.selectedGroupId && isGuideStore.value && !groupEditMode.value) return true
  return (store.selectedIds?.length || 0) === 1 && !!toolbarNode.value
})
const toolbarStyle = computed(() => {
  if (symbolEditActive.value) {
    return { transform: 'translate(12px, 12px)' }
  }
  if (store.selectedGroupId && isGuideStore.value && !groupEditMode.value) {
    const bounds = selectionBounds.value
    if (!bounds) return {}
    const rawX = toScreenX(bounds.left + bounds.width / 2)
    const rawY = toScreenY(bounds.top) - 44
    const maxW = size.value?.w || 0
    const maxH = size.value?.h || 0
    const toolbarW = 220
    const toolbarH = 44
    const x = clamp(rawX - toolbarW / 2, 8, Math.max(8, maxW - toolbarW - 8))
    const y = clamp(rawY, 8, Math.max(8, maxH - toolbarH - 8))
    return {
      transform: `translate(${Math.round(x)}px, ${Math.round(y)}px)`,
    }
  }
  const node = toolbarNode.value
  if (!node) return {}
  const { ry } = nodeHalfSize(node)
  const rawX = toScreenX(node.x)
  const rawY = toScreenY(node.y - ry) - 44
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
const toolbarAngle = computed(() => {
  if (symbolEditActive.value && symbolToolbarId.value) {
    const symbol = symbolsById.value.get(String(symbolEdit.value?.symbolId))
    const node = symbol?.nodes?.find((n) => String(n.id) === String(symbolToolbarId.value))
    return Math.round(Number(node?.rotation || 0))
  }
  return Math.round(Number(toolbarNode.value?.rotation || 0))
})

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
const isBackView = computed(() => store.ui?.viewSide === 'back')
const viewOffsetX = computed(() => store.view.x * displayScale.value)
const viewOffsetY = computed(() => store.view.y * displayScale.value)

function toScreenX(x) {
  const rs = renderScale.value
  if (!rs) return 0
  const base = isBackView.value ? canvasWidth.value - x : x
  return viewOffsetX.value + base * rs
}

function toScreenY(y) {
  const rs = renderScale.value
  if (!rs) return 0
  return viewOffsetY.value + y * rs
}

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
  const leftEdge = toCanvasX(0)
  const rightEdge = toCanvasX(size.value.w)
  const topEdge = toCanvasY(0)
  const bottomEdge = toCanvasY(size.value.h)
  const left = Math.min(leftEdge, rightEdge)
  const top = Math.min(topEdge, bottomEdge)
  const width = Math.abs(rightEdge - leftEdge)
  const height = Math.abs(bottomEdge - topEdge)
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
  x: viewOffsetX.value + (isBackView.value ? canvasWidth.value * renderScale.value : 0),
  y: viewOffsetY.value,
  scaleX: isBackView.value ? -renderScale.value : renderScale.value,
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

const guideWallRect = computed(() => {
  if (!guideWallPx.value || guideWall.value?.enabled === false) return null
  return {
    x: 0,
    y: 0,
    width: guideWallPx.value.width,
    height: guideWallPx.value.height,
    stroke: '#9aa2a6',
    strokeWidth: 2,
    dash: [8, 6],
    fillEnabled: false,
    listening: false,
  }
})

const guideWallMarks = computed(() => {
  if (!guideWallPx.value || guideWall.value?.enabled === false) return []
  const marks = []
  const scale = renderScale.value
  const width = guideWallPx.value.width
  const height = guideWallPx.value.height
  const fontSize = guideLabelSize()
  const color = '#56606a'

  if (scale < 0.5) {
    const widthCm = Math.round((width / PX_PER_CM) * 10) / 10
    const heightCm = Math.round((height / PX_PER_CM) * 10) / 10

    marks.push({
      key: 'x-total',
      x: width / 2,
      y: -18,
      text: `${widthCm} cm`,
      fontSize,
      fill: color,
      align: 'center',
    })
    marks.push({
      key: 'y-total',
      x: -6,
      y: height / 2,
      text: `${heightCm} cm`,
      fontSize,
      fill: color,
      rotation: -90,
      align: 'center',
    })
    return marks
  }
  const stepIn = guideStepIn()
  if (!stepIn) return []
  const stepPx = stepIn * 2.54 * PX_PER_CM

  for (let x = stepPx; x < width + 0.5; x += stepPx) {
    const inches = Math.round((x / PX_PER_CM / 2.54) * 10) / 10
    const cm = Math.round((x / PX_PER_CM) * 10) / 10
    marks.push({
      key: `x-${x}`,
      x,
      y: -18,
      text: `${inches} in / ${cm} cm`,
      fontSize,
      fill: color,
    })
  }

  for (let y = stepPx; y < height + 0.5; y += stepPx) {
    const inches = Math.round((y / PX_PER_CM / 2.54) * 10) / 10
    const cm = Math.round((y / PX_PER_CM) * 10) / 10
    marks.push({
      key: `y-${y}`,
      x: -6,
      y,
      text: `${inches} in / ${cm} cm`,
      fontSize,
      fill: color,
      rotation: -90,
    })
  }

  return marks
})

const guideWallTicks = computed(() => {
  if (!guideWallPx.value || guideWall.value?.enabled === false) return []
  const ticks = []
  const scale = renderScale.value
  const width = guideWallPx.value.width
  const height = guideWallPx.value.height
  const stepIn = guideStepIn()
  if (!stepIn) return []
  const stepPx = stepIn * 2.54 * PX_PER_CM
  const color = '#74808b'
  const len = guideTickSize()

  if (scale < 0.5) return ticks

  for (let x = stepPx; x < width + 0.5; x += stepPx) {
    ticks.push({ key: `tx-${x}`, points: [x, 0, x, -len], stroke: color, strokeWidth: 1 })
  }

  for (let y = stepPx; y < height + 0.5; y += stepPx) {
    ticks.push({ key: `ty-${y}`, points: [0, y, -len, y], stroke: color, strokeWidth: 1 })
  }

  return ticks
})

function guideStepIn() {
  const scale = renderScale.value
  if (scale >= 1.2) return 5
  if (scale >= 0.8) return 10
  if (scale >= 0.6) return 20
  if (isGuideStore.value) return 40
  return 0
}

function guideLabelSize() {
  const scale = renderScale.value
  if (scale >= 1.2) return 12
  if (scale >= 0.8) return 11
  if (isGuideStore.value) return 16
  return 10
}

function guideTickSize() {
  const scale = renderScale.value
  if (scale >= 1.2) return 8
  if (scale >= 0.8) return 6
  if (isGuideStore.value) return 5
  return 5
}

const transformerConfig = computed(() => ({
  rotateEnabled: true,
  enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
  borderStroke: selectionAccent.value,
  anchorStroke: selectionAccent.value,
  anchorFill: '#ffffff',
  anchorSize: 8,
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
}))

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
const nodeCount = computed(() => (store.visibleNodes || []).length)
const effectiveQuality = computed(() => {
  const base = renderQuality.value
  if (base === 'low') return 'low'
  const count = nodeCount.value
  const scale = renderScale.value
  if (count >= 3000) return 'low'
  if (count >= 1800 && scale < 0.85) return base === 'high' ? 'medium' : base
  if (count >= 1200 && scale < 0.65) return base === 'high' ? 'medium' : base
  return base
})
const rasterOnPanEnabled = computed(() => !!store.ui?.rasterOnPan || nodeCount.value >= 1500)
const guideWall = computed(() => store.ui?.guideWall || null)
const guideWallPx = computed(() => {
  if (!guideWall.value) return null
  const width = Number(guideWall.value.widthCm || 0) * PX_PER_CM
  const height = Number(guideWall.value.heightCm || 0) * PX_PER_CM
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null
  return { width, height }
})
const guideMaxRadiusPx = computed(() => {
  if (!guideWall.value) return null
  const maxRadiusCm = Number(guideWall.value.maxRadiusCm || 0)
  if (!Number.isFinite(maxRadiusCm) || maxRadiusCm <= 0) return null
  return maxRadiusCm * PX_PER_CM
})
const maxRenderNodes = computed(() => {
  const base = Number(store.ui?.maxVisibleNodes || 2500)
  const count = nodeCount.value
  const scale = renderScale.value
  let cap = base
  if (count >= 4000) cap = Math.min(cap, 1600)
  else if (count >= 2500) cap = Math.min(cap, 2000)
  if (scale <= 0.35) return Math.max(300, Math.round(cap * 0.25))
  if (scale <= 0.6) return Math.max(600, Math.round(cap * 0.45))
  if (scale <= 0.9) return Math.max(1000, Math.round(cap * 0.7))
  return cap
})

watch(panMode, (value) => {
  if (panning.value || spaceDown.value) return
  setCursor(value ? 'grab' : 'default')
})

watch(cropMode, (value) => {
  if (value) return
  cropBox.value.active = false
  if (store.ui) store.ui.cropRect = null
})

/* ================== NODE CONFIGS ================== */
function groupConfig(n) {
  const depthOpacity = topViewOpacityFactor(n)
  const backgroundMode = backgroundSelected.value
  const isBackground = !!n?.meta?.background
  return {
    id: n.id,
    x: n.x,
    y: n.y,
    rotation: n.rotation,
    scaleX: n.scaleX,
    scaleY: n.scaleY,
    opacity: baseOpacity(n.opacity) * dimFactorForNode(n) * depthOpacity,
    draggable:
      !n.locked &&
      !n?.meta?.dragLocked &&
      !n?.meta?.guideFixed &&
      !store.ui?.bucketMode &&
      !store.ui?.inflateMode &&
      !cropMode.value &&
      !panning.value &&
      !panMode.value &&
      !spaceDown.value, // evita drag de nodos mientras paneas
    listening: backgroundMode ? isBackground : !n?.meta?.guide || !!n?.meta?.guideLine,
  }
}

function guideHalfExtents(rx, ry, scaleX, scaleY, rotation) {
  const angle = ((Number(rotation || 0) % 360) * Math.PI) / 180
  const cos = Math.abs(Math.cos(angle))
  const sin = Math.abs(Math.sin(angle))
  const halfW = Math.abs(rx * scaleX) * cos + Math.abs(ry * scaleY) * sin
  const halfH = Math.abs(rx * scaleX) * sin + Math.abs(ry * scaleY) * cos
  return { halfW, halfH, cos, sin }
}

function clampGuidePosition(node, x, y) {
  if (!node?.meta?.guideLine) return { x, y }
  const bounds = guideWallPx.value
  if (!bounds) return { x, y }
  const rx = Number(node?.meta?.radiusX ?? 46)
  const ry = Number(node?.meta?.radiusY ?? 60)
  const scaleX = Number(node?.scaleX ?? 1)
  const scaleY = Number(node?.scaleY ?? 1)
  const rotation = Number(node?.rotation ?? 0)
  const { halfW, halfH } = guideHalfExtents(rx, ry, scaleX, scaleY, rotation)
  const minX = halfW
  const minY = halfH
  const maxX = Math.max(minX, bounds.width - halfW)
  const maxY = Math.max(minY, bounds.height - halfH)
  return {
    x: Math.min(maxX, Math.max(minX, x)),
    y: Math.min(maxY, Math.max(minY, y)),
  }
}

function clampGuideTransform(model, x, y, scaleX, scaleY, rotation) {
  if (!model?.meta?.guideLine || !guideWallPx.value) {
    return { x, y, scaleX, scaleY, rotation }
  }
  const rx = Number(model?.meta?.radiusX ?? 46)
  const ry = Number(model?.meta?.radiusY ?? 60)
  const minScale = 0.2
  let nextScaleX = Math.max(minScale, Number(scaleX || 1))
  let nextScaleY = Math.max(minScale, Number(scaleY || 1))

  const { cos, sin } = guideHalfExtents(rx, ry, 1, 1, rotation)
  const maxW = guideWallPx.value.width / 2
  const maxH = guideWallPx.value.height / 2

  if (rx > 0) {
    const limitW = cos ? (maxW - Math.abs(ry * nextScaleY) * sin) / (Math.abs(rx) * cos) : Infinity
    const limitH = sin ? (maxH - Math.abs(ry * nextScaleY) * cos) / (Math.abs(rx) * sin) : Infinity
    const limit = Math.min(limitW, limitH)
    if (Number.isFinite(limit)) nextScaleX = Math.max(minScale, Math.min(nextScaleX, limit))
  }

  if (ry > 0) {
    const limitW = sin ? (maxW - Math.abs(rx * nextScaleX) * cos) / (Math.abs(ry) * sin) : Infinity
    const limitH = cos ? (maxH - Math.abs(rx * nextScaleX) * sin) / (Math.abs(ry) * cos) : Infinity
    const limit = Math.min(limitW, limitH)
    if (Number.isFinite(limit)) nextScaleY = Math.max(minScale, Math.min(nextScaleY, limit))
  }

  if (guideMaxRadiusPx.value) {
    if (rx > 0) nextScaleX = Math.min(nextScaleX, guideMaxRadiusPx.value / rx)
    if (ry > 0) nextScaleY = Math.min(nextScaleY, guideMaxRadiusPx.value / ry)
  }

  const { halfW, halfH } = guideHalfExtents(rx, ry, nextScaleX, nextScaleY, rotation)
  const minX = halfW
  const minY = halfH
  const maxX = Math.max(minX, guideWallPx.value.width - halfW)
  const maxY = Math.max(minY, guideWallPx.value.height - halfH)
  const nextX = Math.min(maxX, Math.max(minX, x))
  const nextY = Math.min(maxY, Math.max(minY, y))

  return { x: nextX, y: nextY, scaleX: nextScaleX, scaleY: nextScaleY, rotation }
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
      !symbolEditActive.value &&
      !n.locked &&
      !n?.meta?.guideFixed &&
      !store.ui?.bucketMode &&
      !store.ui?.inflateMode &&
      !cropMode.value &&
      !panning.value &&
      !panMode.value &&
      !spaceDown.value,
    listening: !n?.meta?.guide || !!n?.meta?.guideLine,
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
    draggable:
      active &&
      !child.locked &&
      !store.ui?.bucketMode &&
      !store.ui?.inflateMode &&
      !cropMode.value &&
      !panning.value &&
      !panMode.value &&
      !spaceDown.value,
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

function pinActiveSymbolInstance(stage) {
  if (!symbolEditActive.value) return
  const instanceId = activeSymbolInstanceId.value
  if (!instanceId) return
  const model = store.nodes.find((n) => String(n.id) === String(instanceId))
  if (!model) return
  const group = stage?.findOne ? stage.findOne('#' + String(instanceId)) : null
  if (!group) return
  if (group.x() !== model.x || group.y() !== model.y) {
    group.position({ x: model.x, y: model.y })
  }
}

function isActiveSymbolInstance(n) {
  return symbolEditActive.value && String(n?.id) === String(activeSymbolInstanceId.value)
}

function ellipseConfig(n, { listening = true } = {}) {
  const rx = Number(n?.meta?.radiusX ?? 46)
  const ry = Number(n?.meta?.radiusY ?? 60)
  const guideLine = !!n?.meta?.guideLine
  const guideAlpha = clampNumber(Number(n?.meta?.guideAlpha ?? 100), 0, 100)
  const guideFillAlpha = clampNumber(Number(n?.meta?.guideFillAlpha ?? 0), 0, 100)
  const guideFillColor = String(n?.meta?.guideFillColor || '').trim()
  const baseFill = guideFillColor || String(n?.color || '#ffffff')
  const baseStroke = String(n?.color || '#3c3c3c')
  const strokeColor = guideLine
    ? withAlpha(baseFill || baseStroke, Math.max(0.35, guideAlpha / 100))
    : 'rgba(0,0,0,.10)'
  const strokeWidth = guideLine ? Math.max(1, Number(n?.meta?.guideLineWidth || 2)) : 1
  const dash = guideLine && n?.meta?.guideLineDash ? [6, 4] : null
  const hitStrokeWidth = guideLine ? Math.max(8, strokeWidth + 6) : 0
  const depthShadow = topViewShadow(n)
  const shadowEnabled = !!depthShadow
  const shadowFactor = guideLine ? 0.45 : 1
  const minGuideFill = 0.12
  const fillAlpha = guideLine ? Math.max(guideFillAlpha / 100, minGuideFill) : 1
  const fillColor = guideLine ? withAlpha(baseFill, fillAlpha) : n.color

  return {
    x: 0,
    y: 0,
    radiusX: rx,
    radiusY: ry,
    fill: fillColor,
    stroke: strokeColor,
    strokeWidth,
    dash,
    shadowColor: shadowEnabled ? 'rgba(0,0,0,1)' : undefined,
    shadowOpacity: shadowEnabled ? depthShadow.opacity * shadowFactor : 0,
    shadowBlur: shadowEnabled ? depthShadow.blur * shadowFactor : 0,
    shadowOffsetX: shadowEnabled ? depthShadow.offsetX * shadowFactor : 0,
    shadowOffsetY: shadowEnabled ? depthShadow.offsetY * shadowFactor : 0,
    shadowEnabled,
    fillEnabled: true,
    hitFillEnabled: guideLine,
    hitStrokeWidth,
    listening,
    perfectDrawEnabled: false,
  }
}

function guideNumberConfig(n) {
  if (!n?.meta?.guideLine || !isGuideStore.value) return null
  const number = guideNumberById.value.get(String(n.id))
  if (!number) return null
  const rx = Math.max(1, Number(n?.meta?.radiusX ?? 46))
  const ry = Math.max(1, Number(n?.meta?.radiusY ?? 60))
  const minR = Math.max(6, Math.min(rx, ry))
  const fontSize = clamp(Math.round(minR * 0.6), 10, 22)
  const fillAlpha = clampNumber(Number(n?.meta?.guideFillAlpha ?? 0), 0, 100)
  const baseColor =
    fillAlpha <= 10 ? String(n?.color || '#111111') : String(n?.meta?.guideFillColor || '#ffffff')
  const textColor = isDarkColor(baseColor) ? '#ffffff' : '#111111'
  const width = rx * 2
  const startX = isBackView.value ? rx : -rx

  return {
    x: startX,
    y: -ry,
    width,
    height: ry * 2,
    text: String(number),
    fontSize,
    fontFamily: 'Space Grotesk, sans-serif',
    align: 'center',
    verticalAlign: 'middle',
    fill: textColor,
    scaleX: isBackView.value ? -1 : 1,
    listening: false,
    perfectDrawEnabled: false,
  }
}

function textConfig(n, { listening = false } = {}) {
  const meta = n?.meta || {}
  const fontSize = Number(meta.fontSize || 24)
  const width = Number.isFinite(Number(meta.width)) ? Number(meta.width) : 220
  const startX = isBackView.value ? width : 0
  return {
    x: startX,
    y: 0,
    text: String(meta.text || 'New text'),
    fontSize: Number.isFinite(fontSize) ? fontSize : 24,
    fontFamily: String(meta.fontFamily || 'Times New Roman'),
    fill: String(meta.fill || n.color || '#222222'),
    align: String(meta.align || 'left'),
    width,
    scaleX: isBackView.value ? -1 : 1,
    listening,
  }
}

const imageCache = new Map()

function imageConfig(n, { listening = true } = {}) {
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

function symbolLocalBounds(symbolId) {
  const nodes = symbolNodesForSymbolId(symbolId)
  if (!nodes.length) return null
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const n of nodes) {
    if (!n || n.kind === 'symbol') continue
    if (n.kind === 'text') {
      const width = Number(n?.meta?.width ?? 220)
      const fontSize = Number(n?.meta?.fontSize ?? 24)
      const height = fontSize * 1.2
      const cx = Number(n?.x ?? 0)
      const cy = Number(n?.y ?? 0)
      minX = Math.min(minX, cx)
      minY = Math.min(minY, cy)
      maxX = Math.max(maxX, cx + width)
      maxY = Math.max(maxY, cy + height)
      continue
    }
    if (n.kind === 'image') {
      const width = Number(n?.meta?.width ?? 160)
      const height = Number(n?.meta?.height ?? 120)
      const cx = Number(n?.x ?? 0)
      const cy = Number(n?.y ?? 0)
      minX = Math.min(minX, cx - width / 2)
      minY = Math.min(minY, cy - height / 2)
      maxX = Math.max(maxX, cx + width / 2)
      maxY = Math.max(maxY, cy + height / 2)
      continue
    }
    const rx = Number(n?.meta?.radiusX ?? 46) * Math.abs(Number(n?.scaleX ?? 1))
    const ry = Number(n?.meta?.radiusY ?? 60) * Math.abs(Number(n?.scaleY ?? 1))
    const cx = Number(n?.x ?? 0)
    const cy = Number(n?.y ?? 0)
    minX = Math.min(minX, cx - rx)
    minY = Math.min(minY, cy - ry)
    maxX = Math.max(maxX, cx + rx)
    maxY = Math.max(maxY, cy + ry)
  }
  if (!Number.isFinite(minX) || !Number.isFinite(minY)) return null
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  }
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
  const depthOpacity = topViewOpacityFactor(child)
  return {
    id: `nested-instance-${child.id}`,
    x: child.x,
    y: child.y,
    rotation: child.rotation,
    scaleX: child.scaleX,
    scaleY: child.scaleY,
    opacity: baseOpacity(child.opacity) * depthOpacity,
    listening: true,
  }
}

function shineConfig(n) {
  const guideLine = !!n?.meta?.guideLine
  return {
    x: -14,
    y: -18,
    radiusX: 10,
    radiusY: 18,
    fill: guideLine ? 'rgba(255,255,255,0.26)' : 'rgba(255,255,255,0.35)',
    globalCompositeOperation: guideLine ? 'screen' : 'source-over',
    listening: false,
    visible: true,
    perfectDrawEnabled: false,
  }
}

function innerShadeConfig(n) {
  const rx = Number(n?.meta?.radiusX ?? 46)
  const ry = Number(n?.meta?.radiusY ?? 60)
  const maxR = Math.max(rx, ry)
  const guideLine = !!n?.meta?.guideLine
  const colorStops = guideLine
    ? [0, 'rgba(0,0,0,0)', 0.7, 'rgba(0,0,0,0)', 1, 'rgba(0,0,0,0.18)']
    : [0, 'rgba(0,0,0,0)', 0.6, 'rgba(0,0,0,0)', 1, 'rgba(0,0,0,0.22)']

  return {
    x: 0,
    y: 0,
    radiusX: rx,
    radiusY: ry,
    fillRadialGradientStartPoint: { x: 0, y: 0 },
    fillRadialGradientEndPoint: { x: 0, y: 0 },
    fillRadialGradientStartRadius: 0,
    fillRadialGradientEndRadius: maxR,
    fillRadialGradientColorStops: colorStops,
    globalCompositeOperation: 'source-over',
    listening: false,
    visible: true,
    perfectDrawEnabled: false,
  }
}

function knotConfig(n) {
  const ry = Number(n?.meta?.radiusY ?? 60)
  const show = n?.meta?.knot !== false
  const guideLine = !!n?.meta?.guideLine

  return {
    x: 0,
    y: ry + 6,
    radius: 6,
    fill: 'rgba(0,0,0,0.18)',
    listening: false,
    visible: show && !guideLine,
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

  const leftEdge = toCanvasX(0)
  const rightEdge = toCanvasX(size.value.w)
  const topEdge = toCanvasY(0)
  const bottomEdge = toCanvasY(size.value.h)
  const left = Math.max(0, Math.min(leftEdge, rightEdge))
  const right = Math.min(maxWidth, Math.max(leftEdge, rightEdge))
  const top = Math.max(0, Math.min(topEdge, bottomEdge))
  const bottom = Math.min(maxHeight, Math.max(topEdge, bottomEdge))

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

function topViewVector(n) {
  if (!isGuideStore.value) return null
  const tv = n?.meta?.topView
  if (!tv || typeof tv !== 'object') return null
  const x = Number(tv.x)
  const y = Number(tv.y)
  if (!Number.isFinite(x) && !Number.isFinite(y)) return null
  const flip = isBackView.value ? -1 : 1
  return {
    x: Number.isFinite(x) ? clampNumber(x * flip, -3, 3) : 0,
    y: Number.isFinite(y) ? clampNumber(y * flip, -3, 3) : 0,
  }
}

function topViewOpacityFactor(n) {
  const v = topViewVector(n)
  if (!v) return 1
  if (v.y >= 0) return 1
  const strength = Math.min(1, Math.abs(v.y) / 3)
  return 1 - strength * 0.18
}

function topViewShadow(n) {
  const v = topViewVector(n)
  if (!v) return null
  const strength = Math.min(1, (Math.abs(v.x) + Math.abs(v.y)) / 3)
  if (!strength) return null
  return {
    offsetX: v.x * 6,
    offsetY: v.y * 6,
    blur: 6 + strength * 10,
    opacity: 0.18 + strength * 0.2,
  }
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

function clampNumber(v, min, max) {
  const n = Number(v)
  if (!Number.isFinite(n)) return min
  return Math.min(max, Math.max(min, n))
}

function withAlpha(color, alpha = 1) {
  const a = clampNumber(alpha, 0, 1)
  if (!color) return `rgba(60,60,60,${a})`
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

  if (filtered.length <= maxRenderNodes.value)
    return reorderCircleDepth(prioritizeBackground(filtered))

  const selectedList = filtered.filter((n) => selected.has(n.id))
  const rest = filtered.filter((n) => !selected.has(n.id))
  const limit = Math.max(0, maxRenderNodes.value - selectedList.length)
  return reorderCircleDepth(prioritizeBackground([...selectedList, ...rest.slice(0, limit)]))
})

function prioritizeBackground(list) {
  if (!Array.isArray(list) || list.length < 2) return list
  const background = []
  const rest = []
  for (const node of list) {
    if (node?.meta?.background) background.push(node)
    else rest.push(node)
  }
  return background.length ? [...background, ...rest] : list
}

function reorderCircleDepth(list) {
  if (!Array.isArray(list) || list.length < 2) return list
  const groups = store.groups || []
  if (!groups.length) return list
  const groupById = new Map(groups.map((g) => [String(g.id), g]))
  const entriesByGroup = new Map()

  list.forEach((node, index) => {
    const gid = node?.groupId
    if (!gid) return
    const group = groupById.get(String(gid))
    if (!group) return
    let isCircle = group?.meta?.layout === 'circle'
    if (!isCircle) {
      const tvy = Number(node?.meta?.topView?.y)
      if (Number.isFinite(tvy) && Math.abs(tvy) > 0.01) isCircle = true
    }
    if (!isCircle) return
    const y = Number(node?.meta?.topView?.y)
    if (!Number.isFinite(y)) return
    const entry = entriesByGroup.get(String(gid)) || { indices: [], nodes: [] }
    entry.indices.push(index)
    entry.nodes.push(node)
    entriesByGroup.set(String(gid), entry)
  })

  if (!entriesByGroup.size) return list

  const next = [...list]
  for (const entry of entriesByGroup.values()) {
    if (entry.nodes.length < 2) continue
    const sortedNodes = [...entry.nodes].sort((a, b) => {
      const ay = Number(topViewVector(a)?.y ?? 0)
      const by = Number(topViewVector(b)?.y ?? 0)
      return ay - by
    })
    const sortedIndices = [...entry.indices].sort((a, b) => a - b)
    sortedIndices.forEach((idx, i) => {
      next[idx] = sortedNodes[i]
    })
  }
  return next
}

/* ================== GUIDES ================== */
const guides = ref({ x: null, y: null })

const guidesLines = computed(() => {
  if (effectiveQuality.value === 'low') return []
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
  if (effectiveQuality.value === 'low') return { xs: [], ys: [] }
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
  return { x: toCanvasX(p.x), y: toCanvasY(p.y) }
}

function onStagePointerMove() {
  pointerActive.value = true
}

function onStagePointerLeave() {
  pointerActive.value = false
}

/* ================== SELECTION ================== */
function onNodePointerDown(node, e) {
  if (cropMode.value) {
    beginCrop(e)
    return
  }
  if (symbolEditActive.value) return
  // si estamos en pan, no seleccionar
  if (panning.value || panMode.value || spaceDown.value) return

  // locked = intocable desde el canvas
  if (node?.locked) return
  if (node?.meta?.dragLocked) return
  if (node?.meta?.guide) return

  const modifiers = getEventModifiers(e)

  if (store.ui?.inflateMode) {
    const delta = store.ui.inflateMode === 'deflate' ? -0.5 : 0.5
    emit('guide-inflate', { node, delta, modifiers })
    closeMenu()
    return
  }

  if (store.ui?.bucketMode) {
    emit('guide-paint', { node, modifiers })
    closeMenu()
    return
  }

  if (groupEditMode.value && store.selectedGroupId) {
    if (!node.groupId || String(node.groupId) !== String(store.selectedGroupId)) return
  }

  if (e?.cancelBubble !== undefined) e.cancelBubble = true
  if (e?.evt?.cancelBubble !== undefined) e.evt.cancelBubble = true

  const evt = e?.evt
  const isMac = navigator.platform.toLowerCase().includes('mac')
  const mod = isMac ? !!evt?.metaKey : !!evt?.ctrlKey
  const append = !!evt?.shiftKey
  const selectedIds = Array.isArray(store.selectedIds) ? store.selectedIds : []

  if (mod || append) {
    store.toggleSelect(node.id)
    closeMenu()
    emit('guide-paint', { node, modifiers })
    return
  }

  if (!groupEditMode.value && selectedIds.length > 1 && selectedIds.includes(node.id)) {
    closeMenu()
    emit('guide-paint', { node, modifiers })
    return
  }

  if (!append && !mod && node.groupId && !store.ui?.groupEditMode) {
    store.selectGroup(node.groupId)
    closeMenu()
    return
  }

  store.select(node.id, { append: false })
  closeMenu()
  emit('guide-paint', { node, modifiers })
}

function getEventModifiers(e) {
  const evt = e?.evt || e
  return {
    shiftKey: !!evt?.shiftKey,
    ctrlKey: !!evt?.ctrlKey,
    metaKey: !!evt?.metaKey,
    altKey: !!evt?.altKey,
  }
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

  const modifiers = getEventModifiers(e)
  const isMac = navigator.platform.toLowerCase().includes('mac')
  const mod = isMac ? !!modifiers?.metaKey : !!modifiers?.ctrlKey
  const append = !!modifiers?.shiftKey

  if (store.ui?.inflateMode) {
    const delta = store.ui.inflateMode === 'deflate' ? -0.5 : 0.5
    emit('guide-inflate', { node, delta, modifiers })
    closeMenu()
    return
  }

  if (store.ui?.bucketMode) {
    emit('guide-paint', { node, modifiers })
    closeMenu()
    return
  }
  const selectedIds = Array.isArray(store.ui?.symbolEdit?.selectedIds)
    ? store.ui.symbolEdit.selectedIds
    : []

  if (mod || append) {
    store.toggleSelectSymbolNode(node.id)
    closeMenu()
    return
  }

  if (selectedIds.length > 1 && selectedIds.includes(node.id)) {
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
    let hasGuideFixed = false
    if (symbolEditActive.value) {
      const symbol = symbolsById.value.get(String(symbolEdit.value.symbolId))
      const nodeById = new Map((symbol?.nodes || []).map((n) => [String(n.id), n]))
      for (const id of list) {
        const model = nodeById.get(String(id))
        if (!model || model.locked || model?.meta?.guide || model?.meta?.guideFixed) continue
        const n = stage.findOne('#' + symbolChildId(activeSymbolInstanceId.value, id))
        if (n) konvaNodes.push(n)
      }
    } else {
      for (const id of list) {
        const n = stage.findOne('#' + String(id))
        const model = store.nodes.find((x) => x.id === id)
        if (!n || !model || model.locked || model?.meta?.guide) continue
        if (model?.meta?.guideFixed) hasGuideFixed = true
        konvaNodes.push(n)
      }
    }

    // si alguno está locked, lo ignoramos (intocable) y dejamos anchors normales
    const config = transformerConfig.value
    tr.enabledAnchors(hasGuideFixed ? [] : config.enabledAnchors)
    tr.rotateEnabled(hasGuideFixed ? false : !!config.rotateEnabled)

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

  let selected = store.selectedNodes.filter((n) => !n.locked && !n?.meta?.dragLocked)

  if (store.selectedGroupId && !groupEditMode.value) {
    const group = (store.groups || []).find((g) => String(g.id) === String(store.selectedGroupId))
    if (group && Array.isArray(group.childIds)) {
      const nodeById = new Map(store.nodes.map((n) => [String(n.id), n]))
      selected = group.childIds
        .map((id) => nodeById.get(String(id)))
        .filter((n) => n && !n.locked && !n?.meta?.dragLocked)
    }
  }

  const groupIds = selected.map((n) => n.id)

  const isGroupDrag = !!store.selectedGroupId && !groupEditMode.value
  const modelById = new Map(store.nodes.map((n) => [String(n.id), n]))
  const anchorModel = modelById.get(String(node.id)) || node

  dragSession = {
    anchorId: node.id,
    startAnchor: {
      x: Number(anchorModel?.x ?? t.x()),
      y: Number(anchorModel?.y ?? t.y()),
    },
    ids: groupIds,
    startPos: new Map(),
    nodesById: new Map(),
    candidates: isGroupDrag ? { xs: [], ys: [] } : buildSnapCandidates(groupIds),
    anchorModel,
    disableSnap: isGroupDrag,
  }

  for (const id of groupIds) {
    const g = stage.findOne('#' + String(id))
    const model = modelById.get(String(id))
    if (g) {
      dragSession.nodesById.set(String(id), g)
      dragSession.startPos.set(id, {
        x: Number(model?.x ?? g.x()),
        y: Number(model?.y ?? g.y()),
      })
    }
  }

  setCursor('grabbing')
  clearGuides()
  store.beginHistoryBatch()
}

function onDragMove(node, e) {
  if (symbolEditActive.value) return
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

  if (anchorModel?.meta?.guideLine) {
    const clamped = clampGuidePosition(anchorModel, ax, ay)
    ax = clamped.x
    ay = clamped.y
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
    const g = dragSession.nodesById.get(String(id))
    if (!g) continue
    g.position({ x: start.x + dx, y: start.y + dy })
  }

  stage.batchDraw()
}

function onDragEnd(node, e) {
  if (symbolEditActive.value) return
  if (dragRaf) cancelAnimationFrame(dragRaf)
  dragRaf = null
  pendingDrag = null
  const stage = getStage()
  const t = e.target

  if (!dragSession || !stage || !t) {
    if (t) {
      const next = clampGuidePosition(node, snapValue(t.x()), snapValue(t.y()))
      store.updateNode(node.id, { x: next.x, y: next.y })
    }
    clearGuides()
    setCursor(panMode.value || spaceDown.value ? 'grab' : 'default')
    return
  }

  try {
    const anchor = dragSession.nodesById.get(String(dragSession.anchorId))
    if (anchor) {
      const next = clampGuidePosition(node, anchor.x(), anchor.y())
      store.updateNode(dragSession.anchorId, { x: next.x, y: next.y })
    }

    const nodeById = new Map(store.nodes.map((n) => [String(n.id), n]))
    for (const id of dragSession.ids) {
      if (id === dragSession.anchorId) continue
      const g = dragSession.nodesById.get(String(id))
      if (!g) continue
      const item = nodeById.get(String(id))
      const next = clampGuidePosition(item, g.x(), g.y())
      store.updateNode(id, { x: next.x, y: next.y })
    }
  } finally {
    dragSession = null
    clearGuides()
    store.endHistoryBatch()
    setCursor(panMode.value || spaceDown.value ? 'grab' : 'default')
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

  setCursor('grabbing')
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

  pinActiveSymbolInstance(stage)

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
    setCursor(panMode.value || spaceDown.value ? 'grab' : 'default')
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
    pinActiveSymbolInstance(stage)
  } finally {
    symbolDragSession = null
    store.endHistoryBatch()
    setCursor(panMode.value || spaceDown.value ? 'grab' : 'default')
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
    const model = store.nodes.find((x) => x.id === id)
    if (model?.meta?.guideFixed) continue
    const nextX = snapValue(g.x())
    const nextY = snapValue(g.y())
    const nextScaleX = g.scaleX()
    const nextScaleY = g.scaleY()
    const nextRotation = g.rotation()
    const clamped = clampGuideTransform(model, nextX, nextY, nextScaleX, nextScaleY, nextRotation)
    patchById[id] = {
      x: clamped.x,
      y: clamped.y,
      scaleX: clamped.scaleX,
      scaleY: clamped.scaleY,
      rotation: clamped.rotation,
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
  pinActiveSymbolInstance(stage)
}

/* ================== CLICK EMPTY ================== */
function onStageClick(e) {
  const stage = getStage()
  if (!stage) return

  if (store.ui?.stackGrid?.pickOrigin) {
    const pointer = getCanvasPointer(stage)
    if (pointer) {
      store.setStackGridOrigin?.({ x: pointer.x, y: pointer.y })
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
    x: toCanvasX(pointer.x),
    y: toCanvasY(pointer.y),
  }

  store.setView({
    scale: newScale,
    x: viewXForCanvasPoint(pointer.x, mousePointTo.x, newScale),
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
  if (effectiveQuality.value === 'low' || rasterOnPanEnabled.value) setRasterMode(true)
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
  if (effectiveQuality.value === 'low' || rasterOnPanEnabled.value) setRasterMode(false)

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

  if (cropMode.value) {
    beginCrop(e)
    return
  }

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
  if (cropBox.value.active) {
    const stage = getStage()
    if (!stage) return
    const cp = getCanvasPointer(stage)
    if (!cp) return
    cropBox.value.end = { ...cp }
    updateCropRect()
    return
  }

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
  if (cropBox.value.active) {
    cropBox.value.active = false
    updateCropRect()
    return
  }

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

const cropBox = ref({
  active: false,
  start: { x: 0, y: 0 },
  end: { x: 0, y: 0 },
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

const cropRectConfig = computed(() => {
  const rect = resolveCropRect()
  if (!rect) return null
  return {
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    stroke: '#1b74e4',
    strokeWidth: 1,
    dash: [6, 4],
    fill: 'rgba(27,116,228,0.12)',
    listening: false,
  }
})

function resolveCropRect() {
  if (cropBox.value.active) {
    const x1 = cropBox.value.start.x
    const y1 = cropBox.value.start.y
    const x2 = cropBox.value.end.x
    const y2 = cropBox.value.end.y
    return {
      x: Math.min(x1, x2),
      y: Math.min(y1, y2),
      width: Math.abs(x2 - x1),
      height: Math.abs(y2 - y1),
    }
  }
  const rect = store.ui?.cropRect
  if (!rect) return null
  const width = Number(rect.width)
  const height = Number(rect.height)
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null
  return {
    x: Number(rect.x) || 0,
    y: Number(rect.y) || 0,
    width,
    height,
  }
}

function beginCrop(e) {
  const stage = getStage()
  if (!stage) return
  const cp = getCanvasPointer(stage)
  if (!cp) return
  cropBox.value.active = true
  cropBox.value.start = { ...cp }
  cropBox.value.end = { ...cp }
  updateCropRect()
  if (e?.evt?.preventDefault) e.evt.preventDefault()
}

function updateCropRect() {
  if (!store.ui) return
  const rect = resolveCropRect()
  if (!rect || rect.width < 1 || rect.height < 1) {
    store.ui.cropRect = null
    return
  }
  store.ui.cropRect = rect
}

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

  if (action === 'create-symbol') {
    const instanceId = store.createSymbolFromSelection?.()
    if (instanceId) store.enterSymbolEdit?.(instanceId)
  }
  if (action === 'edit-symbol') {
    const targetId = selectedSymbolInstanceId.value || store.selectedId
    if (targetId) store.enterSymbolEdit?.(targetId)
  }
  if (action === 'exit-symbol') store.exitSymbolEdit?.({ selectInstance: true })
  if (action === 'detach-symbol') {
    const targetId = selectedSymbolInstanceId.value || store.selectedId
    if (targetId) store.detachSymbolInstance?.(targetId)
  }

  if (action === 'delete') store.deleteSelected()
  if (action === 'cluster-copy-config') {
    if (store.ui) store.ui.clusterConfigAction = 'copy'
  }
  if (action === 'cluster-paste-config') {
    if (store.ui) store.ui.clusterConfigAction = 'paste'
  }
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
        const selected = new Set(store.ui?.symbolEdit?.selectedIds || [])
        if (!selected.has(String(parsed.childId))) {
          store.selectSymbolNode(parsed.childId, { append: false })
        }
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
        const selected = new Set((store.selectedIds || []).map((sid) => String(sid)))
        const isSelected = selected.has(String(model.id))
        if (model.groupId && !groupEditMode.value) {
          if (!isSelected || String(model.groupId) !== String(store.selectedGroupId)) {
            store.selectGroup(model.groupId)
          }
        } else if (!isSelected) {
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
  if (symbolEditActive.value) {
    store.duplicateSymbolSelection?.({ offset: 18 })
    return
  }
  if (!store.selectedId) return
  store.duplicateSelected({ offset: 18 })
}

function onToolbarEditElements() {
  if (!canClusterConfig.value) return
  store.setGroupEditMode?.({ enabled: true, groupId: store.selectedGroupId })
}

function onToolbarInflate(delta) {
  if (!Number.isFinite(delta)) return
  emit('toolbar-inflate', { delta })
}

function onToolbarRotateCluster(e) {
  const evt = e?.evt || e
  const shiftKey = !!evt?.shiftKey
  emit('toolbar-rotate-cluster', { groupId: store.selectedGroupId || null, shiftKey })
}

function onToolbarDelete() {
  if (symbolEditActive.value) {
    store.deleteSymbolSelection?.()
    return
  }
  if (!store.selectedId) return
  store.deleteSelected()
}

function onToolbarCopyClusterConfig() {
  if (!store.ui) return
  store.ui.clusterConfigAction = 'copy'
}

function onToolbarPasteClusterConfig() {
  if (!store.ui) return
  store.ui.clusterConfigAction = 'paste'
}

function onToolbarRotate(delta) {
  if (symbolEditActive.value) {
    store.rotateSymbolSelection?.(delta)
    return
  }
  if (store.selectedGroupId && isGuideStore.value && !groupEditMode.value) {
    rotateGroupSelection(delta)
    return
  }
  const node = store.selectedNode
  if (!node) return
  const next = clamp(Number(node.rotation || 0) + delta, -180, 180)
  store.updateNode(node.id, { rotation: next })
}

function rotateGroupSelection(delta) {
  const list = Array.isArray(store.selectedNodes)
    ? store.selectedNodes.filter((n) => n && !n.locked)
    : []
  if (list.length < 2) return
  const radians = ((Number(delta) || 0) * Math.PI) / 180
  if (!Number.isFinite(radians) || radians === 0) return

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const n of list) {
    const box = nodeBoundingBox(n)
    minX = Math.min(minX, box.x)
    minY = Math.min(minY, box.y)
    maxX = Math.max(maxX, box.x + box.width)
    maxY = Math.max(maxY, box.y + box.height)
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY)) return

  const centerX = (minX + maxX) / 2
  const centerY = (minY + maxY) / 2
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  const patchById = {}

  for (const node of list) {
    const dx = Number(node.x || 0) - centerX
    const dy = Number(node.y || 0) - centerY
    const nx = centerX + dx * cos - dy * sin
    const ny = centerY + dx * sin + dy * cos
    const nextRotation = clamp(Number(node.rotation || 0) + Number(delta || 0), -180, 180)
    const clamped = clampGuideTransform(
      node,
      nx,
      ny,
      Number(node.scaleX ?? 1),
      Number(node.scaleY ?? 1),
      nextRotation,
    )
    patchById[node.id] = {
      x: clamped.x,
      y: clamped.y,
      rotation: clamped.rotation,
      scaleX: clamped.scaleX,
      scaleY: clamped.scaleY,
    }
  }

  if (!Object.keys(patchById).length) return
  store.beginHistoryBatch()
  try {
    store.updateNodes(patchById)
  } finally {
    store.endHistoryBatch()
  }
}

function onToolbarBringForward() {
  if (symbolEditActive.value) {
    store.bringForwardSymbolSelection?.()
    return
  }
  store.bringForwardSelected?.()
}

function onToolbarSendBackward() {
  if (symbolEditActive.value) {
    store.sendBackwardSymbolSelection?.()
    return
  }
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
