<template>
  <EditorLayout>
    <template #topbar>
      <div class="topbar-left">
        <BuilderToolbar
          @go-home="handleGoHome"
          @new-file="handleNewFile"
          @save-json="handleSaveJson"
          @save-as="handleSaveAs"
          @open-file="handleOpenFile"
          @export-image="handleExportVisibleImage"
          @export-image-content="handleExportContentImage"
          @import-guide="handleImportGuide"
          @import-symbol="handleImportSymbol"
        />
        <div class="builder-file-chip" :title="builderFileLabel">
          {{ builderFileLabel }}
        </div>
      </div>
    </template>
    <input
      ref="backgroundFileInput"
      class="d-none"
      type="file"
      accept="image/*"
      @change="handleBackgroundFile"
    />
    <div class="builder-toolbar">
      <button
        class="tool-btn"
        type="button"
        :class="{ active: selectionToolActive }"
        title="Seleccionar"
        @click="activateSelectionTool"
      >
        <i class="bi bi-cursor"></i>
      </button>
      <button
        class="tool-btn"
        type="button"
        title="Imagen de fondo"
        @click="triggerBackgroundPicker"
      >
        <i class="bi bi-image"></i>
      </button>
      <button
        class="tool-btn"
        type="button"
        :class="{ active: clustersLocked }"
        title="Bloquear clusters"
        @click="toggleClusterLock"
      >
        <i class="bi" :class="clustersLocked ? 'bi-lock-fill' : 'bi-unlock'"></i>
      </button>
      <button
        class="tool-btn"
        type="button"
        :class="{ active: showObjectMeasures }"
        title="Mostrar medidas de objetos"
        @click="toggleObjectMeasures"
      >
        <i class="bi bi-rulers"></i>
      </button>
      <button
        class="tool-btn"
        type="button"
        :disabled="!canUndo"
        title="Deshacer"
        @click="store.undo?.()"
      >
        <i class="bi bi-arrow-counterclockwise"></i>
      </button>
      <button
        class="tool-btn"
        type="button"
        :disabled="!canRedo"
        title="Rehacer"
        @click="store.redo?.()"
      >
        <i class="bi bi-arrow-clockwise"></i>
      </button>
      <button class="tool-btn" type="button" title="Guardar" @click="handleSaveJson">
        <i class="bi bi-save"></i>
      </button>
      <button
        class="tool-btn"
        type="button"
        :class="{ active: bucketActive }"
        title="Pintar con cubeta"
        @click="toggleBucket"
      >
        <i class="bi bi-paint-bucket"></i>
      </button>
      <button
        class="tool-btn"
        type="button"
        :class="{ active: deflateActive }"
        :disabled="!canUseInflateTool"
        title="Desinflar"
        @click="toggleInflateTool('deflate')"
      >
        <i class="bi bi-dash-lg"></i>
      </button>
      <button
        class="tool-btn"
        type="button"
        :class="{ active: inflateActive }"
        :disabled="!canUseInflateTool"
        title="Inflar"
        @click="toggleInflateTool('inflate')"
      >
        <i class="bi bi-plus-lg"></i>
      </button>
      <button
        class="tool-btn"
        type="button"
        :disabled="!canCrop"
        title="Recortar canvas al contenido"
        @click="cropCanvasToContent"
      >
        <i class="bi bi-crop"></i>
      </button>
      <div class="tool-info">Seleccionados: {{ selectedObjectCount }}</div>
    </div>
    <div class="builder-grid">
      <div class="left">
        <div class="left-tabs">
          <button
            class="tab-btn"
            type="button"
            :class="{ active: leftTab === 'guide' }"
            @click="leftTab = 'guide'"
          >
            Guia
          </button>
          <button
            class="tab-btn"
            type="button"
            :class="{ active: leftTab === 'materials' }"
            @click="leftTab = 'materials'"
          >
            Materiales
          </button>
        </div>
        <div class="left-panels">
          <div v-show="leftTab === 'guide'" class="panel-stack">
            <BuilderClusterPanel
              :can-edit="!!selectedLayerGroup"
              :group-name="selectedLayerGroup?.name"
              :nodes="selectedLayerNodes"
              :total-count="selectedLayerNodes.length"
              :layout="selectedLayerMeta.layout"
              :size-in="sizeInDisplay"
              :per-layer="selectedLayerMeta.perLayer"
              :gap-in="selectedLayerMeta.gapIn"
              :rotation-deg="selectedLayerMeta.rotationDeg"
              :selected-bubble-id="rowEditSelectedId"
              :is-editing-elements="!!store.ui?.groupEditMode"
              :is-editing-cluster="centerTab === 'row-edit'"
              :selected-cluster-count="selectedLayerGroupCount"
              :cluster-drag-locked="selectedClustersDragLocked"
              :can-inflate="canInflateSelected"
              :can-deflate="canDeflateSelected"
              :selection-measure="selectionMeasure"
              @update="updateSelectedLayer"
              @edit-elements="enterSelectedLayerEdit"
              @update-bubble-color="updateLayerBubbleFill"
              @update-bubble-fill-alpha="updateLayerFillAlpha"
              @select-bubble="setRowEditSelected"
              @open-edit-tab="openRowEditTab"
              @toggle-cluster-lock="setSelectedClustersDragLock"
              @inflate="inflateSelected"
            />
            <BuilderFillPanel
              :color="fillPanelColor"
              :alpha="fillPanelAlpha"
              :palette="guideFillPalette"
              @update-color="handleFillPanelColor"
              @update-alpha="handleFillPanelAlpha"
              @pick-palette="handleFillPanelColor"
            />
            <BuilderBackgroundPanel
              :has-background="hasBackgroundImage"
              :background-name="backgroundImageName"
              :background-size="backgroundImageSize"
              @pick="triggerBackgroundPicker"
              @select="selectBackgroundImage"
              @remove="removeBackgroundImage"
            />
            <BuilderObjectsPanel />
          </div>
          <div v-show="leftTab === 'materials'" class="panel-stack">
            <BuilderMaterialsPanel :summary="materialsSummary" />
          </div>
        </div>
      </div>
      <div class="builder-main">
        <div class="builder-tabs">
          <button
            class="tab-btn"
            type="button"
            :class="{ active: centerTab === 'canvas' }"
            @click="centerTab = 'canvas'"
          >
            Canvas principal
          </button>
          <button
            class="tab-btn"
            type="button"
            :class="{ active: centerTab === 'row-edit' }"
            :disabled="!selectedLayerGroup"
            @click="centerTab = 'row-edit'"
          >
            Edicion de cluster
          </button>
        </div>
        <div class="builder-body">
          <div v-show="centerTab === 'canvas'" class="builder-pane">
            <div class="canvas-measure">
              <div class="measure-item">
                <span class="label">Ancho</span>
                <span class="value">
                  {{ canvasMeasure.widthCm }} cm · {{ canvasMeasure.widthIn }} in
                </span>
              </div>
              <div class="measure-item">
                <span class="label">Alto</span>
                <span class="value">
                  {{ canvasMeasure.heightCm }} cm · {{ canvasMeasure.heightIn }} in
                </span>
              </div>
            </div>
            <div
              class="builder-canvas"
              :class="{
                'bucket-active': bucketActive,
                'inflate-active': inflateActive,
                'deflate-active': deflateActive,
              }"
            >
              <div class="canvas-ruler" :style="{ width: `${rulerConfig.widthPx}px` }">
                <span class="ruler-label">{{ rulerConfig.label }}</span>
              </div>
              <CanvasStage
                @guide-paint="handleBucketPaint"
                @guide-inflate="handleInflatePaint"
                @toolbar-inflate="handleToolbarInflate"
                @toolbar-rotate-cluster="handleToolbarRotateCluster"
              />
            </div>
            <CanvasControls />
          </div>
          <div v-show="centerTab === 'row-edit'" class="builder-pane row-edit-pane">
            <div v-if="!selectedLayerGroup" class="text-muted small">
              Selecciona un cluster para editarlo.
            </div>
            <BuilderRowEditCanvas
              v-else
              :nodes="selectedLayerNodes"
              :view-side="store.ui?.viewSide"
              :layout="selectedLayerMeta.layout"
              :selected-bubble-id="rowEditSelectedId"
              @select-bubble="setRowEditSelected"
            />
          </div>
        </div>
      </div>
    </div>
  </EditorLayout>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { provideEditorStore } from '@/stores/editor-context'
import { useBuilderStore } from '@/stores/builder.store'
import { PX_PER_CM } from '@/constants/canvas'

import EditorLayout from '@/layouts/EditorLayout.vue'
import CanvasStage from '@/components/builder/CanvasStage.vue'
import CanvasControls from '@/components/builder/CanvasControls.vue'
import BuilderToolbar from '@/components/builder/BuilderToolbar.vue'
import BuilderClusterPanel from '@/components/builder/BuilderClusterPanel.vue'
import BuilderRowEditCanvas from '@/components/builder/BuilderRowEditCanvas.vue'
import BuilderMaterialsPanel from '@/components/builder/BuilderMaterialsPanel.vue'
import BuilderFillPanel from '@/components/builder/BuilderFillPanel.vue'
import BuilderBackgroundPanel from '@/components/builder/BuilderBackgroundPanel.vue'
import BuilderObjectsPanel from '@/components/builder/BuilderObjectsPanel.vue'

const store = useBuilderStore()
provideEditorStore(store)
const router = useRouter()

const selectedLayerMeta = reactive({
  layout: 'wall',
  sizeIn: 12,
  perLayer: 6,
  gapIn: 0,
  rotationDeg: 0,
})
const rowEditSelectedId = ref('')
const guideFillPalette = ref(loadGuideFillPalette())
const guideFillAlphaMap = ref(loadGuideFillPaletteAlpha())
const centerTab = ref('canvas')
const copiedClusterConfig = ref(null)
const leftTab = ref('guide')
const backgroundFileInput = ref(null)
const builderFileName = ref(loadBuilderFileName())

function isLayerGroup(group) {
  if (!group) return false
  if (group?.meta?.kind === 'layer') return true
  if (/^(fila|cluster)\b/i.test(String(group?.name || ''))) return true
  return Array.isArray(group.childIds) && group.childIds.length > 0
}

const selectedLayerGroups = computed(() => {
  const groups = (store.groups || []).filter(isLayerGroup)
  const gid = store.selectedGroupId
  if (gid) {
    const group = groups.find((g) => String(g.id) === String(gid)) || null
    return group ? [group] : []
  }

  const selectedIds = new Set((store.selectedIds || []).map((id) => String(id)))
  if (!selectedIds.size) return []
  return groups.filter((group) => {
    const ids = Array.isArray(group.childIds) ? group.childIds : []
    if (!ids.length) return false
    return ids.every((id) => selectedIds.has(String(id)))
  })
})

const selectedLayerGroup = computed(() => selectedLayerGroups.value[0] || null)
const selectedLayerGroupCount = computed(() => selectedLayerGroups.value.length)

const selectedLayerNodes = computed(() => {
  const group = selectedLayerGroup.value
  if (!group || !Array.isArray(group.childIds)) return []
  const set = new Set(group.childIds.map((id) => String(id)))
  return (store.nodes || []).filter((node) => set.has(String(node.id)))
})
const clustersLocked = computed(() => {
  const grouped = (store.nodes || []).filter((node) => node?.groupId)
  if (!grouped.length) return false
  return grouped.every((node) => !!node?.meta?.dragLocked)
})
const showObjectMeasures = computed(() => !!store.ui?.showObjectMeasures)
const canCrop = computed(() => (store.nodes || []).length > 0)
const selectedClustersDragLocked = computed(() => {
  const nodes = getNodesForGroups(selectedLayerGroups.value)
  if (!nodes.length) return false
  return nodes.every((node) => !!node?.meta?.dragLocked)
})
const canUndo = computed(() => (store.history?.past?.length || 0) > 1)
const canRedo = computed(() => (store.history?.future?.length || 0) > 0)
const bucketActive = computed(() => !!store.ui?.bucketMode)
const inflateActive = computed(() => store.ui?.inflateMode === 'inflate')
const deflateActive = computed(() => store.ui?.inflateMode === 'deflate')
const selectionToolActive = computed(() => !bucketActive.value && !store.ui?.inflateMode)
const canUseInflateTool = computed(() => (store.nodes || []).length > 0)
const selectedBubbleSizeIn = computed(() => {
  const id = String(rowEditSelectedId.value || '')
  if (!id) return null
  const node = selectedLayerNodes.value.find((item) => String(item?.id) === id)
  if (!node) return null
  const rx = Number(node?.meta?.radiusX)
  const ry = Number(node?.meta?.radiusY)
  const base = Math.max(rx, ry)
  if (!Number.isFinite(base) || base <= 0) return null
  const diameterCm = (base * 2) / PX_PER_CM
  const inches = diameterCm / 2.54
  return Math.round(inches * 100) / 100
})
const selectedFillColor = computed(() => {
  const id = String(rowEditSelectedId.value || '')
  const node = id
    ? selectedLayerNodes.value.find((item) => String(item?.id) === id)
    : selectedLayerNodes.value[0]
  return String(node?.meta?.guideFillColor || '#ffffff')
})
const selectedFillAlpha = computed(() => {
  const id = String(rowEditSelectedId.value || '')
  const node = id
    ? selectedLayerNodes.value.find((item) => String(item?.id) === id)
    : selectedLayerNodes.value[0]
  const raw = Number(node?.meta?.guideFillAlpha)
  if (Number.isFinite(raw)) return Math.min(100, Math.max(0, raw))
  const fallback = getPaletteColorAlpha(selectedFillColor.value)
  if (Number.isFinite(fallback)) return Math.min(100, Math.max(0, fallback))
  return 100
})
const fillPanelColor = computed(() => {
  if ((store.selectedNodes || []).length) return selectedFillColor.value
  const bucket = String(store.ui?.bucketColor || '').trim()
  return bucket || '#ffffff'
})
const fillPanelAlpha = computed(() => {
  if ((store.selectedNodes || []).length) return selectedFillAlpha.value
  const color = fillPanelColor.value
  const palette = getPaletteColorAlpha(color)
  if (Number.isFinite(palette)) return Math.min(100, Math.max(0, palette))
  return 100
})
const inflateTargets = computed(() => getInflateTargets())
const canInflateSelected = computed(() => canAdjustInflate(inflateTargets.value, 0.5))
const canDeflateSelected = computed(() => canAdjustInflate(inflateTargets.value, -0.5))
const materialsSummary = computed(() => buildMaterialsSummary())
const selectedObjectCount = computed(() => (store.selectedNodes || []).length)
const backgroundImageNode = computed(() =>
  (store.nodes || []).find((node) => node?.kind === 'image' && node?.meta?.background),
)
const hasBackgroundImage = computed(() => !!backgroundImageNode.value)
const backgroundImageName = computed(() => {
  const meta = backgroundImageNode.value?.meta || {}
  return String(meta?.srcName || '').trim()
})
const backgroundImageSize = computed(() => {
  const meta = backgroundImageNode.value?.meta || {}
  const width = Number(meta?.width)
  const height = Number(meta?.height)
  if (!Number.isFinite(width) || !Number.isFinite(height)) return ''
  return `${Math.round(width)} x ${Math.round(height)} px`
})
const selectionMeasure = computed(() => buildSelectionMeasure(store.selectedNodes || []))
const builderFileLabel = computed(() => builderFileName.value || 'Sin nombre')
const canvasMeasure = computed(() => {
  const guideWall = store.ui?.guideWall
  const widthCm = Number(guideWall?.widthCm || store.canvas?.widthCm || 0)
  const heightCm = Number(guideWall?.heightCm || store.canvas?.heightCm || 0)
  const widthIn = widthCm ? Math.round((widthCm / 2.54) * 100) / 100 : 0
  const heightIn = heightCm ? Math.round((heightCm / 2.54) * 100) / 100 : 0
  return { widthCm, heightCm, widthIn, heightIn }
})
const rulerConfig = computed(() => {
  const displayScale = Number(store.canvas?.displayScale || 1)
  const scale = Number(store.view?.scale || 1) * displayScale
  const pxPerCm = PX_PER_CM * (Number.isFinite(scale) ? scale : 1)
  const targetPx = 120
  const rawCm = pxPerCm > 0 ? targetPx / pxPerCm : 10
  const cm = Math.min(50, Math.max(2, Math.round(rawCm * 2) / 2))
  const widthPx = Math.max(40, cm * pxPerCm)
  const inches = Math.round((cm / 2.54) * 100) / 100
  return {
    widthPx,
    label: `${cm} cm (${inches} in)`,
  }
})
const sizeInDisplay = computed(() => {
  return Number.isFinite(Number(selectedBubbleSizeIn.value))
    ? Number(selectedBubbleSizeIn.value)
    : selectedLayerMeta.sizeIn
})

watch(selectedLayerGroup, (group) => {
  if (!group) return
  const meta = group.meta || {}
  let layout = meta.layout === 'circle' ? 'circle' : meta.layout === 'wall' ? 'wall' : null
  if (!layout) {
    const nodes = selectedLayerNodes.value
    const hasTopViewCircle = nodes.some((node) => {
      const tv = node?.meta?.topView
      const y = Number(tv?.y)
      return Number.isFinite(y) && Math.abs(y) > 0.01
    })
    layout = hasTopViewCircle ? 'circle' : 'wall'
  }
  selectedLayerMeta.layout = layout
  const inferredSizeIn = inferLayerSizeIn(selectedLayerNodes.value)
  const rawSizeIn = Number(meta.sizeIn)
  selectedLayerMeta.sizeIn = Number.isFinite(rawSizeIn) ? rawSizeIn : inferredSizeIn
  selectedLayerMeta.perLayer = Number(meta.perLayer || group.childIds?.length || 6)
  selectedLayerMeta.gapIn = Number(meta.gapIn || 0)
  selectedLayerMeta.rotationDeg = Number(meta.rotationDeg || 0)
})

watch(
  selectedLayerNodes,
  (list) => {
    if (!Array.isArray(list) || !list.length) {
      rowEditSelectedId.value = ''
      return
    }
    const current = String(rowEditSelectedId.value || '')
    const exists = list.some((node) => String(node?.id) === current)
    if (!exists) rowEditSelectedId.value = String(list[0]?.id || '')
  },
  { immediate: true },
)

watch(
  () => store.selectedId,
  (next) => {
    if (!store.ui?.groupEditMode) return
    const id = String(next || '')
    if (!id) return
    const exists = selectedLayerNodes.value.some((node) => String(node?.id) === id)
    if (exists) rowEditSelectedId.value = id
  },
)

watch(
  () => store.ui?.clusterConfigAction,
  (action) => {
    if (action === 'copy') copyClusterConfig()
    if (action === 'paste') pasteClusterConfig()
    if (store.ui && action) store.ui.clusterConfigAction = null
  },
)

function isTypingTarget(e) {
  const tag = (e.target?.tagName || '').toLowerCase()
  return tag === 'input' || tag === 'textarea' || tag === 'select' || e.target?.isContentEditable
}

function onKeyDown(e) {
  if (e?._builderHandled) return
  if (e) e._builderHandled = true
  if (isTypingTarget(e)) return
  if (e.key?.toLowerCase() !== 'escape') return
  if (store.ui?.groupEditMode) {
    store.setGroupEditMode?.({ enabled: false })
    centerTab.value = 'canvas'
    return
  }
  store.clearSelection?.()
}

onMounted(() => {
  store.initAutosave?.()
  window.addEventListener('keydown', onKeyDown)
  nextTick(() => seedPaletteFromNodes(store.nodes || []))
})

onBeforeUnmount(() => {
  store.destroyAutosave?.()
  window.removeEventListener('keydown', onKeyDown)
  guideFillPalette.value = []
  guideFillAlphaMap.value = {}
  saveGuideFillPalette([])
  saveGuideFillPaletteAlpha({})
})

function handleGoHome() {
  router.push({ name: 'home' })
}

function handleNewFile() {
  const ok = window.confirm('¿Crear un archivo nuevo? Se perderá el estado actual.')
  if (!ok) return
  store.resetDesignState?.({ clearAutosave: true })
  store.resetView?.()
  guideFillPalette.value = []
  guideFillAlphaMap.value = {}
  saveGuideFillPalette([])
  saveGuideFillPaletteAlpha({})
  builderFileName.value = ''
  saveBuilderFileName('')
}

function triggerBackgroundPicker() {
  backgroundFileInput.value?.click?.()
}

function updateSelectedLayer(patch) {
  const groups = selectedLayerGroups.value
  if (!groups.length) return
  const inGroupEdit = !!store.ui?.groupEditMode
  if (inGroupEdit && rowEditSelectedId.value) {
    if (Object.prototype.hasOwnProperty.call(patch, 'sizeIn')) {
      updateLayerBubbleSize({ id: rowEditSelectedId.value, sizeIn: patch.sizeIn })
    }
    return
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'sizeIn')) {
    const next = Number(patch.sizeIn)
    selectedLayerMeta.sizeIn = Number.isFinite(next) ? next : selectedLayerMeta.sizeIn
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'perLayer')) {
    const next = Number(patch.perLayer)
    selectedLayerMeta.perLayer = Number.isFinite(next) ? clampNumber(Math.round(next), 3, 6) : 6
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'gapIn')) {
    const next = Number(patch.gapIn)
    selectedLayerMeta.gapIn = Number.isFinite(next) ? clampNumber(next, -3, 6) : 0
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'rotationDeg')) {
    const next = Number(patch.rotationDeg)
    selectedLayerMeta.rotationDeg = Number.isFinite(next) ? next : 0
  }
  for (const group of groups) {
    store.updateLayerGroup?.({
      groupId: group.id,
      perLayer: selectedLayerMeta.perLayer,
      sizeIn: selectedLayerMeta.sizeIn,
      gapIn: selectedLayerMeta.gapIn,
      rotationDeg: selectedLayerMeta.rotationDeg,
    })
  }
}

function inferLayerSizeIn(nodes) {
  const list = Array.isArray(nodes) ? nodes : []
  for (const node of list) {
    const size = getNodeSizeIn(node)
    if (Number.isFinite(size) && size > 0) return size
  }
  return 12
}

function copyClusterConfig() {
  if (!selectedLayerGroup.value) return
  const group = selectedLayerGroup.value
  const nodesById = new Map((store.nodes || []).map((n) => [String(n.id), n]))
  const orderedNodes = (group.childIds || []).map((id) => nodesById.get(String(id))).filter(Boolean)
  const bounds = getClusterBounds(orderedNodes)
  copiedClusterConfig.value = {
    layout: selectedLayerMeta.layout,
    sizeIn: selectedLayerMeta.sizeIn,
    perLayer: selectedLayerMeta.perLayer,
    gapIn: selectedLayerMeta.gapIn,
    rotationDeg: selectedLayerMeta.rotationDeg,
    nodes: orderedNodes.map((node) => {
      const meta = node?.meta && typeof node.meta === 'object' ? node.meta : {}
      const x = Number(node?.x)
      const y = Number(node?.y)
      return {
        color: String(node?.color || ''),
        dx: Number.isFinite(x) ? x - bounds.centerX : null,
        dy: Number.isFinite(y) ? y - bounds.centerY : null,
        opacity: Number.isFinite(Number(node?.opacity)) ? Number(node.opacity) : null,
        locked: node?.locked !== undefined ? !!node.locked : null,
        visible: node?.visible !== undefined ? !!node.visible : null,
        scaleX: Number.isFinite(Number(node?.scaleX)) ? Number(node.scaleX) : null,
        scaleY: Number.isFinite(Number(node?.scaleY)) ? Number(node.scaleY) : null,
        rotation: Number.isFinite(Number(node?.rotation)) ? Number(node.rotation) : null,
        radiusX: Number.isFinite(Number(meta.radiusX)) ? Number(meta.radiusX) : null,
        radiusY: Number.isFinite(Number(meta.radiusY)) ? Number(meta.radiusY) : null,
        guideFillColor: String(meta.guideFillColor || ''),
        guideFillAlpha: Number.isFinite(Number(meta.guideFillAlpha))
          ? Number(meta.guideFillAlpha)
          : null,
        guideAlpha: Number.isFinite(Number(meta.guideAlpha)) ? Number(meta.guideAlpha) : null,
        guideLineWidth: Number.isFinite(Number(meta.guideLineWidth))
          ? Number(meta.guideLineWidth)
          : null,
        guideLineDash: meta.guideLineDash !== undefined ? !!meta.guideLineDash : null,
        topView:
          meta.topView && typeof meta.topView === 'object'
            ? {
                x: Number(meta.topView.x),
                y: Number(meta.topView.y),
              }
            : null,
      }
    }),
  }
  if (store.ui) store.ui.clusterConfigClipboard = copiedClusterConfig.value
}

function pasteClusterConfig() {
  const group = selectedLayerGroup.value
  const config = copiedClusterConfig.value || store.ui?.clusterConfigClipboard
  if (!group || !config) return
  if (config.layout) {
    group.meta = {
      ...(group.meta && typeof group.meta === 'object' ? group.meta : {}),
      layout: config.layout === 'circle' ? 'circle' : 'wall',
    }
  }
  selectedLayerMeta.sizeIn = Number(config.sizeIn || selectedLayerMeta.sizeIn)
  selectedLayerMeta.perLayer = Number(config.perLayer || selectedLayerMeta.perLayer)
  selectedLayerMeta.gapIn = Number.isFinite(Number(config.gapIn))
    ? Number(config.gapIn)
    : selectedLayerMeta.gapIn
  selectedLayerMeta.rotationDeg = Number.isFinite(Number(config.rotationDeg))
    ? Number(config.rotationDeg)
    : selectedLayerMeta.rotationDeg

  const hasNodeOverrides = Array.isArray(config.nodes) && config.nodes.length
  if (!hasNodeOverrides) {
    store.updateLayerGroup?.({
      groupId: group.id,
      perLayer: selectedLayerMeta.perLayer,
      sizeIn: selectedLayerMeta.sizeIn,
      gapIn: selectedLayerMeta.gapIn,
      rotationDeg: selectedLayerMeta.rotationDeg,
    })
  }

  if (hasNodeOverrides) {
    const nodesById = new Map((store.nodes || []).map((n) => [String(n.id), n]))
    const orderedNodes = (group.childIds || [])
      .map((id) => nodesById.get(String(id)))
      .filter(Boolean)
    const bounds = getClusterBounds(orderedNodes)
    const patchById = {}
    for (let i = 0; i < orderedNodes.length; i += 1) {
      const node = orderedNodes[i]
      const cfg = config.nodes[i]
      if (!node || !cfg) continue
      const meta = node?.meta && typeof node.meta === 'object' ? { ...node.meta } : {}
      const dx = Number(cfg.dx)
      const dy = Number(cfg.dy)
      const nextX = Number.isFinite(dx) ? bounds.centerX + dx : node.x
      const nextY = Number.isFinite(dy) ? bounds.centerY + dy : node.y
      patchById[node.id] = {
        color: cfg.color || node.color,
        x: Number.isFinite(Number(nextX)) ? Number(nextX) : node.x,
        y: Number.isFinite(Number(nextY)) ? Number(nextY) : node.y,
        opacity: Number.isFinite(Number(cfg.opacity)) ? Number(cfg.opacity) : node.opacity,
        locked: cfg.locked === null || cfg.locked === undefined ? node.locked : !!cfg.locked,
        visible: cfg.visible === null || cfg.visible === undefined ? node.visible : !!cfg.visible,
        scaleX: Number.isFinite(Number(cfg.scaleX)) ? Number(cfg.scaleX) : node.scaleX,
        scaleY: Number.isFinite(Number(cfg.scaleY)) ? Number(cfg.scaleY) : node.scaleY,
        rotation: Number.isFinite(Number(cfg.rotation)) ? Number(cfg.rotation) : node.rotation,
        meta: {
          ...meta,
          radiusX: Number.isFinite(Number(cfg.radiusX)) ? Number(cfg.radiusX) : meta.radiusX,
          radiusY: Number.isFinite(Number(cfg.radiusY)) ? Number(cfg.radiusY) : meta.radiusY,
          guideFillColor: cfg.guideFillColor || meta.guideFillColor,
          guideFillAlpha: Number.isFinite(Number(cfg.guideFillAlpha))
            ? Number(cfg.guideFillAlpha)
            : meta.guideFillAlpha,
          guideAlpha: Number.isFinite(Number(cfg.guideAlpha))
            ? Number(cfg.guideAlpha)
            : meta.guideAlpha,
          guideLineWidth: Number.isFinite(Number(cfg.guideLineWidth))
            ? Number(cfg.guideLineWidth)
            : meta.guideLineWidth,
          guideLineDash:
            cfg.guideLineDash === null || cfg.guideLineDash === undefined
              ? meta.guideLineDash
              : !!cfg.guideLineDash,
          topView:
            cfg.topView && Number.isFinite(cfg.topView.x) && Number.isFinite(cfg.topView.y)
              ? { ...meta.topView, x: cfg.topView.x, y: cfg.topView.y }
              : meta.topView,
        },
      }
    }
    if (Object.keys(patchById).length) store.updateNodes?.(patchById)
    group.meta = {
      ...(group.meta && typeof group.meta === 'object' ? group.meta : {}),
      perLayer: selectedLayerMeta.perLayer,
      sizeIn: selectedLayerMeta.sizeIn,
      gapIn: selectedLayerMeta.gapIn,
      rotationDeg: selectedLayerMeta.rotationDeg,
    }
  }
  store.markDirty?.('Pegar configuracion de cluster')
}

function getClusterBounds(nodes) {
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const node of Array.isArray(nodes) ? nodes : []) {
    const x = Number(node?.x)
    const y = Number(node?.y)
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue
    const rx = Number(node?.meta?.radiusX)
    const ry = Number(node?.meta?.radiusY)
    const r = Math.max(Number.isFinite(rx) ? rx : 0, Number.isFinite(ry) ? ry : 0)
    minX = Math.min(minX, x - r)
    maxX = Math.max(maxX, x + r)
    minY = Math.min(minY, y - r)
    maxY = Math.max(maxY, y + r)
  }
  if (!Number.isFinite(minX) || !Number.isFinite(minY)) {
    return { centerX: 0, centerY: 0 }
  }
  return {
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
  }
}

function updateLayerBubbleFill({ id, color }) {
  const nodeId = String(id || '')
  const value = String(color || '').trim()
  if (!nodeId || !value) return
  addGuideFillPaletteColor(value)
  if (store.ui) store.ui.bucketColor = value
  const normalized = normalizePaletteColor(value)
  const paletteAlpha = getPaletteColorAlpha(normalized)
  const hasPaletteAlpha = Number.isFinite(paletteAlpha)
  if (!hasPaletteAlpha) setPaletteColorAlpha(normalized, 100)
  const applyToAll = !store.ui?.groupEditMode && selectedLayerGroups.value.length > 0

  const patchById = {}
  const targets = applyToAll
    ? getNodesForGroups(selectedLayerGroups.value)
    : selectedLayerNodes.value.filter((item) => String(item?.id) === nodeId)

  for (const node of targets) {
    const meta = node?.meta && typeof node.meta === 'object' ? { ...node.meta } : {}
    const currentAlpha = Number(meta.guideFillAlpha)
    const nextAlpha = Number.isFinite(paletteAlpha)
      ? paletteAlpha
      : Number.isFinite(currentAlpha) && currentAlpha > 0
        ? currentAlpha
        : 100
    patchById[node.id] = {
      meta: { ...meta, guideFillColor: value, guideFillAlpha: nextAlpha },
    }
  }

  if (Object.keys(patchById).length) store.updateNodes?.(patchById)
}

function handleFillPanelColor(value) {
  const color = String(value || '').trim()
  if (!color) return
  if (store.ui) store.ui.bucketColor = color
  addGuideFillPaletteColor(color)
  const normalized = normalizePaletteColor(color)
  const paletteAlpha = getPaletteColorAlpha(normalized)
  if (!Number.isFinite(paletteAlpha)) setPaletteColorAlpha(normalized, 100)

  const targetId = String(rowEditSelectedId.value || '') || String(store.selectedId || '') || null
  if (targetId) updateLayerBubbleFill({ id: targetId, color })
}

function handleFillPanelAlpha(value) {
  const next = Math.min(100, Math.max(0, Number(value)))
  if (!Number.isFinite(next)) return
  const color = normalizePaletteColor(fillPanelColor.value)
  if (color) setPaletteColorAlpha(color, next)

  const targetId = String(rowEditSelectedId.value || '') || String(store.selectedId || '') || null
  if (targetId) updateLayerFillAlpha({ id: targetId, alpha: next })
}

function updateLayerFillAlpha({ id, alpha }) {
  const next = Math.min(100, Math.max(0, Number(alpha)))
  if (!Number.isFinite(next)) return
  const applyToAll = !store.ui?.groupEditMode && selectedLayerGroups.value.length > 0
  const targetId =
    String(id || '') ||
    String(rowEditSelectedId.value || '') ||
    (!applyToAll ? String(selectedLayerNodes.value[0]?.id || '') : '')
  if (!applyToAll && !targetId) return
  const patchById = {}
  const targets = applyToAll
    ? getNodesForGroups(selectedLayerGroups.value)
    : selectedLayerNodes.value.filter((item) => String(item?.id) === targetId)
  for (const node of targets) {
    const meta = node?.meta && typeof node.meta === 'object' ? { ...node.meta } : {}
    patchById[node.id] = {
      meta: { ...meta, guideFillAlpha: next },
    }
  }
  if (Object.keys(patchById).length) store.updateNodes?.(patchById)
  const color = normalizePaletteColor(selectedFillColor.value)
  if (color) setPaletteColorAlpha(color, next)
}

function isEntireGroupSelected(group) {
  if (!group || !Array.isArray(group.childIds) || !group.childIds.length) return false
  if (String(store.selectedGroupId || '') !== String(group.id)) return false
  const selected = Array.isArray(store.selectedIds) ? store.selectedIds : []
  if (!selected.length || selected.length !== group.childIds.length) return false
  const set = new Set(group.childIds.map((id) => String(id)))
  for (const id of selected) {
    if (!set.has(String(id))) return false
  }
  return true
}

function getNodesForGroups(groups) {
  const ids = new Set()
  for (const group of groups || []) {
    const childIds = Array.isArray(group.childIds) ? group.childIds : []
    for (const id of childIds) ids.add(String(id))
  }
  if (!ids.size) return []
  return (store.nodes || []).filter((node) => ids.has(String(node.id)))
}

function updateLayerBubbleSize({ id, sizeIn }) {
  const nodeId = String(id || '')
  const next = Number(sizeIn)
  if (!nodeId || !Number.isFinite(next) || next <= 0) return
  const radiusPx = (next * 2.54 * PX_PER_CM) / 2
  store.updateNodeMeta(nodeId, { radiusX: radiusPx, radiusY: radiusPx })
}

function openRowEditTab() {
  if (!selectedLayerGroup.value) return
  centerTab.value = 'row-edit'
}

function setRowEditSelected(id) {
  if (!id) return
  rowEditSelectedId.value = String(id)
  if (store.ui?.groupEditMode) {
    store.select?.(String(id))
  }
}

function enterSelectedLayerEdit() {
  const group = selectedLayerGroup.value
  if (!group) return
  const isActive = !!store.ui?.groupEditMode && String(store.selectedGroupId) === String(group.id)
  if (isActive) {
    store.setGroupEditMode?.({ enabled: false })
    store.selectGroup?.(group.id)
    return
  }
  store.setGroupEditMode?.({ enabled: true, groupId: group.id })
  const nextId = rowEditSelectedId.value || store.selectedId || group.childIds?.[0]
  if (nextId) setRowEditSelected(String(nextId))
}

function clampNumber(v, min, max) {
  const n = Number(v)
  if (!Number.isFinite(n)) return min
  return Math.min(max, Math.max(min, n))
}

function loadGuideFillPalette() {
  try {
    const raw = localStorage.getItem('guide_fill_palette')
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((item) => String(item || '').trim())
      .filter(Boolean)
      .slice(0, 18)
  } catch {
    return []
  }
}

function saveGuideFillPalette(list) {
  try {
    localStorage.setItem('guide_fill_palette', JSON.stringify(list))
  } catch {
    // ignore
  }
}

function normalizePaletteColor(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
}

function loadBuilderFileName() {
  try {
    return String(localStorage.getItem('builder_last_filename') || '').trim()
  } catch {
    return ''
  }
}

function saveBuilderFileName(value) {
  try {
    if (!value) {
      localStorage.removeItem('builder_last_filename')
      return
    }
    localStorage.setItem('builder_last_filename', String(value))
  } catch {
    // ignore
  }
}

function promptFileName(baseName, extension) {
  const fallback = String(baseName || '').trim() || 'archivo'
  const ext = String(extension || 'json').replace(/^\./, '')
  const defaultName = `${fallback}.${ext}`
  const input = window.prompt('Nombre del archivo:', defaultName)
  if (input === null) return null
  const raw = String(input || '').trim()
  if (!raw) return defaultName
  const lower = raw.toLowerCase()
  return lower.endsWith(`.${ext.toLowerCase()}`) ? raw : `${raw}.${ext}`
}

function normalizeFileName(value, extension) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  const ext = String(extension || 'json').replace(/^\./, '')
  const lower = raw.toLowerCase()
  return lower.endsWith(`.${ext.toLowerCase()}`) ? raw : `${raw}.${ext}`
}

function promptBuildFileName(baseName) {
  const fallback = String(baseName || '').trim() || 'archivo'
  const input = window.prompt('Nombre del archivo (sin extension):', fallback)
  if (input === null) return null
  const raw = String(input || '').trim()
  const base = raw ? stripBuildSuffix(raw) : fallback
  const normalized = String(base || '').trim() || fallback
  return `${normalized}.build.json`
}

function normalizeBuildFileName(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  const base = stripBuildSuffix(raw)
  if (!base) return ''
  return `${base}.build.json`
}

function stripBuildSuffix(value) {
  const raw = String(value || '').trim()
  const lower = raw.toLowerCase()
  if (lower.endsWith('.build.json')) return raw.slice(0, -'.build.json'.length)
  if (lower.endsWith('.guide.json')) return raw.slice(0, -'.guide.json'.length)
  if (lower.endsWith('.json')) return raw.slice(0, -'.json'.length)
  return raw
}

function buildMaterialsSummary() {
  const nodes = (store.nodes || []).filter(
    (node) => node?.kind === 'balloon' && node?.meta?.guide !== true,
  )
  const total = nodes.length
  const groupCount = (store.groups || []).filter(
    (g) => Array.isArray(g.childIds) && g.childIds.length,
  ).length
  const guideWall = store.ui?.guideWall
  const widthCm = Number(guideWall?.widthCm || store.canvas?.widthCm || 0)
  const heightCm = Number(guideWall?.heightCm || store.canvas?.heightCm || 0)
  const widthIn = widthCm ? Math.round((widthCm / 2.54) * 100) / 100 : 0
  const heightIn = heightCm ? Math.round((heightCm / 2.54) * 100) / 100 : 0
  const sizes = new Map()
  const colors = new Map()
  const detail = new Map()
  const sizeDetail = new Map()

  for (const node of nodes) {
    const meta = node?.meta || {}
    const rx = Number(meta.radiusX)
    const ry = Number(meta.radiusY)
    const base = Math.max(rx, ry)
    let sizeIn = null
    if (Number.isFinite(base) && base > 0) {
      const diameterCm = (base * 2) / PX_PER_CM
      sizeIn = Math.round((diameterCm / 2.54) * 10) / 10
    }
    const baseSizeRaw = Number(meta.baseSizeIn)
    const baseSizeIn = Number.isFinite(baseSizeRaw) ? baseSizeRaw : sizeIn
    const roundedBase = Number.isFinite(baseSizeIn) ? roundSizeIn(baseSizeIn) : null
    const roundedCurrent = Number.isFinite(sizeIn) ? roundSizeIn(sizeIn) : null
    if (Number.isFinite(roundedBase)) {
      const key = String(roundedBase)
      const current = sizes.get(key) || { sizeIn: roundedBase, count: 0 }
      current.count += 1
      sizes.set(key, current)
    }

    const color = String(meta.guideFillColor || node?.color || '#ffffff')
    const alpha = Math.min(100, Math.max(0, Number(meta.guideFillAlpha) || 100))
    const colorKey = `${color}|${alpha}`
    const currentColor = colors.get(colorKey) || { color, alpha, count: 0 }
    currentColor.count += 1
    colors.set(colorKey, currentColor)

    const sizeKey = Number.isFinite(roundedBase) ? String(roundedBase) : 'N/A'
    const inflatedKey = Number.isFinite(roundedCurrent) ? String(roundedCurrent) : 'N/A'
    const sizeDetailKey = `${sizeKey}|${inflatedKey}`
    const sizeDetailItem = sizeDetail.get(sizeDetailKey) || {
      baseSizeIn: Number.isFinite(roundedBase) ? roundedBase : null,
      inflatedSizeIn: Number.isFinite(roundedCurrent) ? roundedCurrent : null,
      count: 0,
    }
    sizeDetailItem.count += 1
    sizeDetail.set(sizeDetailKey, sizeDetailItem)
    const detailKey = `${sizeKey}|${inflatedKey}|${color}|${alpha}`
    const currentDetail = detail.get(detailKey) || {
      baseSizeIn: Number.isFinite(roundedBase) ? roundedBase : null,
      inflatedSizeIn: Number.isFinite(roundedCurrent) ? roundedCurrent : null,
      color,
      alpha,
      count: 0,
    }
    currentDetail.count += 1
    detail.set(detailKey, currentDetail)
  }

  const sizeList = [...sizes.values()]
    .sort((a, b) => a.sizeIn - b.sizeIn)
    .map((item) => ({
      key: `${item.sizeIn}`,
      label: `${item.sizeIn}"`,
      count: item.count,
    }))

  const colorList = [...colors.values()]
    .sort((a, b) => b.count - a.count)
    .map((item) => ({
      key: `${item.color}|${item.alpha}`,
      color: item.color,
      alpha: item.alpha,
      count: item.count,
    }))

  const detailList = [...detail.values()]
    .sort((a, b) => {
      const as = a.baseSizeIn ?? 0
      const bs = b.baseSizeIn ?? 0
      if (as !== bs) return as - bs
      if (a.color !== b.color) return a.color.localeCompare(b.color)
      return b.count - a.count
    })
    .map((item) => ({
      key: `${item.baseSizeIn ?? 'N/A'}|${item.inflatedSizeIn ?? 'N/A'}|${item.color}|${item.alpha}`,
      baseSizeIn: item.baseSizeIn,
      inflatedSizeIn: item.inflatedSizeIn,
      color: item.color,
      alpha: item.alpha,
      count: item.count,
    }))

  const sizeDetailList = [...sizeDetail.values()]
    .sort((a, b) => {
      const as = a.baseSizeIn ?? 0
      const bs = b.baseSizeIn ?? 0
      if (as !== bs) return as - bs
      const ai = a.inflatedSizeIn ?? 0
      const bi = b.inflatedSizeIn ?? 0
      return ai - bi
    })
    .map((item) => ({
      key: `${item.baseSizeIn ?? 'N/A'}|${item.inflatedSizeIn ?? 'N/A'}`,
      baseSizeIn: item.baseSizeIn,
      inflatedSizeIn: item.inflatedSizeIn,
      count: item.count,
    }))

  return {
    total,
    groupCount,
    widthCm,
    heightCm,
    widthIn,
    heightIn,
    sizes: sizeList,
    colors: colorList,
    sizeDetails: sizeDetailList,
    details: detailList,
  }
}

function roundSizeIn(value) {
  return Math.round(Number(value) * 10) / 10
}

function buildSelectionMeasure(nodes) {
  const list = Array.isArray(nodes) ? nodes : []
  if (!list.length) return null
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  let hasAny = false

  for (const node of list) {
    const x = Number(node?.x)
    const y = Number(node?.y)
    const rx = Number(node?.meta?.radiusX) * Math.abs(Number(node?.scaleX ?? 1))
    const ry = Number(node?.meta?.radiusY) * Math.abs(Number(node?.scaleY ?? 1))
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(rx) || !Number.isFinite(ry))
      continue
    const halfW = Math.abs(rx)
    const halfH = Math.abs(ry)
    minX = Math.min(minX, x - halfW)
    maxX = Math.max(maxX, x + halfW)
    minY = Math.min(minY, y - halfH)
    maxY = Math.max(maxY, y + halfH)
    hasAny = true
  }

  if (!hasAny) return null
  const widthCm = Math.round(((maxX - minX) / PX_PER_CM) * 10) / 10
  const heightCm = Math.round(((maxY - minY) / PX_PER_CM) * 10) / 10
  const widthIn = Math.round((widthCm / 2.54) * 100) / 100
  const heightIn = Math.round((heightCm / 2.54) * 100) / 100
  return { widthCm, heightCm, widthIn, heightIn }
}

function loadGuideFillPaletteAlpha() {
  try {
    const raw = localStorage.getItem('guide_fill_palette_alpha')
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function saveGuideFillPaletteAlpha(map) {
  try {
    localStorage.setItem('guide_fill_palette_alpha', JSON.stringify(map))
  } catch {
    // ignore
  }
}

function getPaletteColorAlpha(color) {
  const map = guideFillAlphaMap.value || {}
  const key = normalizePaletteColor(color)
  const value = Number(map[key])
  return Number.isFinite(value) ? value : null
}

function setPaletteColorAlpha(color, alpha) {
  const key = normalizePaletteColor(color)
  if (!key) return
  const map = { ...(guideFillAlphaMap.value || {}) }
  map[key] = Math.min(100, Math.max(0, Number(alpha)))
  guideFillAlphaMap.value = map
  saveGuideFillPaletteAlpha(map)
}

function addGuideFillPaletteColor(value) {
  const color = normalizePaletteColor(value)
  if (!color) return
  const current = Array.isArray(guideFillPalette.value) ? guideFillPalette.value : []
  const next = [color, ...current.filter((c) => normalizePaletteColor(c) !== color)].slice(0, 18)
  guideFillPalette.value = next
  saveGuideFillPalette(next)
}

function seedPaletteFromNodes(nodes) {
  const list = Array.isArray(nodes) ? nodes : []
  if (!list.length) return
  const existing = Array.isArray(guideFillPalette.value) ? guideFillPalette.value : []
  const normalizedExisting = existing.map((c) => normalizePaletteColor(c)).filter(Boolean)
  const existingSet = new Set(normalizedExisting)
  const collected = []
  const collectedSet = new Set()
  const alphaMap = { ...(guideFillAlphaMap.value || {}) }
  let alphaChanged = false

  for (const node of list) {
    const meta = node?.meta || {}
    const color = normalizePaletteColor(meta.guideFillColor || node?.color || '')
    if (color && !existingSet.has(color) && !collectedSet.has(color)) {
      collected.push(color)
      collectedSet.add(color)
    }
    const alpha = Number(meta.guideFillAlpha)
    if (color && Number.isFinite(alpha) && !Number.isFinite(Number(alphaMap[color]))) {
      alphaMap[color] = Math.min(100, Math.max(0, alpha))
      alphaChanged = true
    }
  }

  if (collected.length) {
    const merged = [...collected, ...normalizedExisting]
    const unique = []
    const seen = new Set()
    for (const color of merged) {
      if (!color || seen.has(color)) continue
      seen.add(color)
      unique.push(color)
    }
    const next = unique.slice(0, 18)
    guideFillPalette.value = next
    saveGuideFillPalette(next)
  }

  if (alphaChanged) {
    guideFillAlphaMap.value = alphaMap
    saveGuideFillPaletteAlpha(alphaMap)
  }
}

async function handleImportGuide(e) {
  const file = e?.target?.files?.[0] || null
  if (e?.target) e.target.value = ''
  if (!file) return

  try {
    const text = await file.text()
    const data = JSON.parse(text)
    const ok = store.importGuideJsonObject?.(data)
    if (ok) window.alert('Guia importada correctamente.')
    if (ok) {
      const nextName = normalizeBuildFileName(file?.name || '')
      builderFileName.value = nextName
      saveBuilderFileName(nextName)
      seedPaletteFromNodes(store.nodes || [])
      await nextTick()
      requestAnimationFrame(() => zoomToFitCanvas())
    }
  } catch {
    window.alert('No se pudo importar la guia. Verifica que el JSON sea válido.')
  }
}

function handleSaveJson() {
  const current = normalizeBuildFileName(builderFileName.value || '')
  if (!current) {
    handleSaveAs()
    return
  }
  if (current !== builderFileName.value) {
    builderFileName.value = current
    saveBuilderFileName(current)
  }
  store.exportJson?.({ fileName: current })
  store.markSaved?.()
}

function handleSaveAs() {
  const fileName = promptBuildFileName('diseno-builder')
  if (!fileName) return
  builderFileName.value = fileName
  saveBuilderFileName(fileName)
  store.exportJson?.({ fileName })
  store.markSaved?.()
}

function handleExportVisibleImage() {
  const base = stripBuildSuffix(builderFileName.value || '') || 'diseno-builder'
  const fileName = `${base}.build.png`
  store.exportPng?.({ fileName, cropToContent: false, pixelRatio: 2, useDisplayScale: true })
}

function handleExportContentImage() {
  const base = stripBuildSuffix(builderFileName.value || '') || 'diseno-builder'
  const fileName = `${base}.build.png`
  store.exportPng?.({ fileName, cropToContent: true, pixelRatio: 2, useDisplayScale: true })
}

async function handleOpenFile(e) {
  const file = e?.target?.files?.[0] || null
  if (e?.target) e.target.value = ''
  if (!file) return

  try {
    const text = await file.text()
    const data = JSON.parse(text)
    const ok = store.importJsonObject?.(data)
    if (ok) {
      const nextName = normalizeBuildFileName(file?.name || '')
      builderFileName.value = nextName
      saveBuilderFileName(nextName)
      seedPaletteFromNodes(store.nodes || [])
      await nextTick()
      requestAnimationFrame(() => zoomToFitCanvas())
      window.alert('Archivo abierto correctamente.')
    }
  } catch {
    window.alert('No se pudo abrir el archivo. Verifica que el JSON sea válido.')
  }
}

async function handleImportSymbol(e) {
  const file = e?.target?.files?.[0] || null
  if (e?.target) e.target.value = ''
  if (!file) return

  try {
    const text = await file.text()
    const data = JSON.parse(text)
    const ok = store.importGuideSymbolObject?.(data, {
      name: file?.name || '',
      selectImported: true,
    })
    if (ok) {
      seedPaletteFromNodes(store.nodes || [])
      window.alert('Simbolo importado correctamente.')
    }
  } catch {
    window.alert('No se pudo importar el simbolo. Verifica que el JSON sea válido.')
  }
}

async function handleBackgroundFile(e) {
  const file = e?.target?.files?.[0] || null
  if (e?.target) e.target.value = ''
  if (!file) return

  try {
    prepareForBackgroundEdit()
    const src = await readFileAsDataUrl(file)
    const img = await loadImage(src)
    const width = Number(img?.naturalWidth || img?.width || 0)
    const height = Number(img?.naturalHeight || img?.height || 0)
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      throw new Error('Invalid image size')
    }

    const { x, y } = getCanvasCenter()
    const name = String(file?.name || '').trim() || 'Imagen de fondo'
    const existing = backgroundImageNode.value

    if (existing?.id) {
      const meta = existing?.meta && typeof existing.meta === 'object' ? { ...existing.meta } : {}
      store.updateNodes?.({
        [existing.id]: {
          x,
          y,
          scaleX: 1,
          scaleY: 1,
          rotation: 0,
          name: 'Fondo',
          meta: {
            ...meta,
            src,
            width,
            height,
            background: true,
            srcName: name,
          },
        },
      })
      store.select?.(existing.id, { append: false })
    } else {
      const id = store.addImageNode?.({ x, y, src, width, height })
      if (id) {
        const node = store.nodes?.find((n) => String(n.id) === String(id))
        const meta = node?.meta && typeof node.meta === 'object' ? { ...node.meta } : {}
        store.updateNodes?.({
          [id]: {
            name: 'Fondo',
            meta: {
              ...meta,
              background: true,
              srcName: name,
            },
          },
        })
      }
    }

    store.sendToBackSelected?.()
  } catch {
    window.alert('No se pudo cargar la imagen de fondo.')
  }
}

function selectBackgroundImage() {
  const node = backgroundImageNode.value
  if (!node?.id) return
  prepareForBackgroundEdit()
  store.select?.(node.id, { append: false })
}

function removeBackgroundImage() {
  const node = backgroundImageNode.value
  if (!node?.id) return
  prepareForBackgroundEdit()
  store.select?.(node.id, { append: false })
  store.deleteSelected?.()
}

function prepareForBackgroundEdit() {
  if (store.ui?.groupEditMode) {
    store.setGroupEditMode?.({ enabled: false })
  }
  if (store.ui) {
    store.ui.bucketMode = false
    store.ui.inflateMode = null
  }
  store.setPanMode?.(false)
  store.clearSelection?.()
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('load image failed'))
    img.src = src
  })
}

function getCanvasCenter() {
  const guideWall = store.ui?.guideWall
  const widthCm = Number(guideWall?.widthCm || store.canvas?.widthCm || 0)
  const heightCm = Number(guideWall?.heightCm || store.canvas?.heightCm || 0)
  const widthPx = widthCm * PX_PER_CM
  const heightPx = heightCm * PX_PER_CM
  return {
    x: Number.isFinite(widthPx) && widthPx > 0 ? widthPx / 2 : 0,
    y: Number.isFinite(heightPx) && heightPx > 0 ? heightPx / 2 : 0,
  }
}

function zoomToFitCanvas() {
  const stage = store.stage
  if (!stage) return
  const box = store.getContentBoundingBox?.(60)
  if (!box || !box.width || !box.height) {
    store.resetView?.()
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
  const displayScale = Number(store.canvas?.displayScale || 1)
  const canvasWidth = Number(store.canvas?.widthCm || 0) * PX_PER_CM
  const isBackView = store.ui?.viewSide === 'back'
  const base = w / 2 / displayScale
  const targetX = isBackView ? base - (canvasWidth - centerX) * scale : base - centerX * scale
  const targetY = h / (2 * displayScale) - centerY * scale

  store.setView?.({ scale, x: targetX, y: targetY })
}

function lockClusterNodes(locked) {
  const patchById = {}
  for (const node of store.nodes || []) {
    if (!node?.groupId) continue
    const meta = node?.meta && typeof node.meta === 'object' ? { ...node.meta } : {}
    patchById[node.id] = { locked: false, meta: { ...meta, dragLocked: !!locked } }
  }
  if (Object.keys(patchById).length) store.updateNodes?.(patchById)
}

function toggleClusterLock() {
  const next = !clustersLocked.value
  lockClusterNodes(next)
}

function toggleObjectMeasures() {
  if (!store.ui) return
  store.ui.showObjectMeasures = !store.ui.showObjectMeasures
}

function activateSelectionTool() {
  if (!store.ui) return
  store.ui.bucketMode = false
  store.ui.inflateMode = null
  store.setPanMode?.(false)
  store.clearSelection?.()
}

function toggleBucket() {
  if (!store.ui) return
  store.ui.bucketMode = !store.ui.bucketMode
  if (store.ui.bucketMode) store.ui.inflateMode = null
  if (store.ui.bucketMode && !store.ui.bucketColor) {
    store.ui.bucketColor = String(selectedFillColor.value || '#ffffff')
  }
}

function toggleInflateTool(mode) {
  if (!store.ui) return
  const next = store.ui.inflateMode === mode ? null : mode
  store.ui.inflateMode = next
  if (next) store.ui.bucketMode = false
}

function handleBucketPaint(payload) {
  if (!store.ui?.bucketMode) return
  const node = payload?.node || payload
  if (!node?.id) return
  const color = String(store.ui.bucketColor || selectedFillColor.value || '#ffffff')
  addGuideFillPaletteColor(color)
  const normalized = normalizePaletteColor(color)
  const paletteAlpha = getPaletteColorAlpha(normalized)
  if (!Number.isFinite(paletteAlpha)) setPaletteColorAlpha(normalized, 100)
  const nextAlpha = Number.isFinite(paletteAlpha) ? paletteAlpha : 100
  if (store.ui?.symbolEdit?.active) {
    const useAll = !!payload?.modifiers?.shiftKey
    const symbolId = store.ui?.symbolEdit?.symbolId
    const symbolNodes = symbolId
      ? (store.symbols || []).find((s) => String(s.id) === String(symbolId))?.nodes || []
      : []
    const targets = useAll ? symbolNodes : [node]
    const patchById = {}
    for (const target of targets) {
      const meta = target?.meta && typeof target.meta === 'object' ? { ...target.meta } : {}
      patchById[target.id] = {
        meta: { ...meta, guideFillColor: color, guideFillAlpha: nextAlpha },
      }
    }
    if (Object.keys(patchById).length) store.updateNodes?.(patchById)
    return
  }
  const useGroupSelection =
    !!payload?.modifiers?.shiftKey &&
    !store.ui?.groupEditMode &&
    selectedLayerGroups.value.length > 0
  const targets = useGroupSelection
    ? getNodesForGroups(selectedLayerGroups.value)
    : store.nodes?.filter((n) => String(n.id) === String(node.id)) || []
  const patchById = {}
  for (const current of targets) {
    const meta = current?.meta && typeof current.meta === 'object' ? { ...current.meta } : {}
    patchById[current.id] = {
      meta: { ...meta, guideFillColor: color, guideFillAlpha: nextAlpha },
    }
  }
  if (Object.keys(patchById).length) store.updateNodes?.(patchById)
}

function handleInflatePaint(payload) {
  if (!store.ui?.inflateMode) return
  const node = payload?.node
  const delta = Number(payload?.delta)
  if (!node?.id || !Number.isFinite(delta)) return
  if (store.ui?.symbolEdit?.active) {
    const useAll = !!payload?.modifiers?.shiftKey
    const symbolId = store.ui?.symbolEdit?.symbolId
    const symbolNodes = symbolId
      ? (store.symbols || []).find((s) => String(s.id) === String(symbolId))?.nodes || []
      : []
    const targets = useAll ? symbolNodes : [node]
    inflateNodes(targets, delta)
    return
  }
  if (
    payload?.modifiers?.shiftKey &&
    !store.ui?.groupEditMode &&
    selectedLayerGroups.value.length
  ) {
    const targets = getNodesForGroups(selectedLayerGroups.value)
    if (targets.length) {
      inflateNodes(targets, delta)
      return
    }
  }
  inflateFromNode(node, delta)
}

function handleToolbarInflate(payload) {
  const delta = Number(payload?.delta)
  if (!Number.isFinite(delta)) return
  inflateSelected(delta)
}

function handleToolbarRotateCluster(payload) {
  if (!selectedLayerGroup.value) return
  if (selectedLayerMeta.layout !== 'circle') return
  const current = Number(selectedLayerMeta.rotationDeg || 0)
  const step = payload?.shiftKey ? 15 : 5
  const next = Number.isFinite(current) ? current + step : step
  updateSelectedLayer({ rotationDeg: next })
}

function inflateFromNode(node, delta) {
  if (!node?.id) return
  inflateNodes([node], delta)
}

function cropCanvasToContent() {
  const box = store.getContentBoundingBox?.(0)
  if (!box || !Number.isFinite(box.width) || !Number.isFinite(box.height)) return
  if (box.width <= 0 || box.height <= 0) return
  const padding = 0
  const widthPx = box.width + padding * 2
  const heightPx = box.height + padding * 2
  const widthCm = Math.max(1, Math.round((widthPx / PX_PER_CM) * 10) / 10)
  const heightCm = Math.max(1, Math.round((heightPx / PX_PER_CM) * 10) / 10)
  const dx = -box.x + padding
  const dy = -box.y + padding

  store.beginHistoryBatch?.()
  try {
    const patchById = {}
    for (const node of store.nodes || []) {
      const x = Number(node?.x)
      const y = Number(node?.y)
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue
      patchById[node.id] = { x: x + dx, y: y + dy }
    }
    if (Object.keys(patchById).length) store.updateNodes?.(patchById)
    store.setCanvasDimensions?.({ widthCm, heightCm })
    if (store.ui?.guideWall) {
      store.setGuideWall?.({ ...store.ui.guideWall, widthCm, heightCm })
    }
  } finally {
    store.endHistoryBatch?.()
  }

  requestAnimationFrame(() => zoomToFitCanvas())
}

function setSelectedClustersDragLock(locked) {
  const groups = selectedLayerGroups.value
  if (!groups.length) return
  const patchById = {}
  for (const node of getNodesForGroups(groups)) {
    const meta = node?.meta && typeof node.meta === 'object' ? { ...node.meta } : {}
    patchById[node.id] = { meta: { ...meta, dragLocked: !!locked } }
  }
  if (Object.keys(patchById).length) store.updateNodes?.(patchById)
}

function inflateSelected(delta) {
  const targets = getInflateTargets()
  inflateNodes(targets, delta)
}

function inflateNodes(targets, delta) {
  const list = Array.isArray(targets) ? targets : []
  if (!list.length) return
  const groupSizeById = new Map(
    (store.groups || []).map((g) => [String(g.id), Number(g?.meta?.sizeIn)]),
  )
  const entries = []
  for (const node of list) {
    const currentSize = getNodeSizeIn(node)
    if (!Number.isFinite(currentSize)) continue
    const baseSize = resolveBaseSize(node, groupSizeById)
    const limits = getInflateLimits(baseSize)
    if (!limits) continue
    const nextSize = clampNumber(currentSize + delta, limits.min, limits.max)
    entries.push({ node, baseSize, start: currentSize, target: nextSize })
  }
  if (!entries.length) return
  animateInflate(entries)
}

function getInflateTargets() {
  if (store.ui?.groupEditMode) {
    const id = String(rowEditSelectedId.value || '')
    return selectedLayerNodes.value.filter((node) => String(node?.id) === id)
  }
  return getNodesForGroups(selectedLayerGroups.value)
}

function canAdjustInflate(nodes, delta) {
  if (!nodes.length) return false
  const groupSizeById = new Map(
    (store.groups || []).map((g) => [String(g.id), Number(g?.meta?.sizeIn)]),
  )
  for (const node of nodes) {
    const currentSize = getNodeSizeIn(node)
    if (!Number.isFinite(currentSize)) continue
    const baseSize = resolveBaseSize(node, groupSizeById)
    const limits = getInflateLimits(baseSize)
    if (!limits) continue
    const nextSize = clampNumber(currentSize + delta, limits.min, limits.max)
    if (Math.abs(nextSize - currentSize) > 0.01) return true
  }
  return false
}

function resolveBaseSize(node, groupSizeById) {
  const meta = node?.meta || {}
  const stored = Number(meta.baseSizeIn)
  if (Number.isFinite(stored) && stored > 0) return stored
  const groupSize = groupSizeById.get(String(node?.groupId))
  if (Number.isFinite(groupSize) && groupSize > 0) return nearestBaseSize(groupSize)
  const current = getNodeSizeIn(node)
  return Number.isFinite(current) ? nearestBaseSize(current) : 9
}

function nearestBaseSize(value) {
  const base = [5, 9, 12]
  let best = base[0]
  let bestDiff = Infinity
  for (const b of base) {
    const diff = Math.abs(Number(value) - b)
    if (diff < bestDiff) {
      bestDiff = diff
      best = b
    }
  }
  return best
}

function getInflateLimits(baseSize) {
  if (baseSize === 5) return { min: 4, max: 6 }
  if (baseSize === 9) return { min: 7, max: 11 }
  if (baseSize === 12) return { min: 11, max: 20 }
  return null
}

function getNodeSizeIn(node) {
  const rx = Number(node?.meta?.radiusX)
  const ry = Number(node?.meta?.radiusY)
  const base = Math.max(rx, ry)
  if (!Number.isFinite(base) || base <= 0) return null
  const diameterCm = (base * 2) / PX_PER_CM
  return Math.round((diameterCm / 2.54) * 100) / 100
}

let inflateRaf = null
function animateInflate(entries) {
  if (inflateRaf) cancelAnimationFrame(inflateRaf)
  const startTime = performance.now()
  const duration = 220

  const frames = entries.map((entry) => ({
    id: entry.node.id,
    meta: entry.node.meta && typeof entry.node.meta === 'object' ? entry.node.meta : {},
    baseSize: entry.baseSize,
    start: entry.start,
    target: entry.target,
  }))

  const step = (now) => {
    const t = Math.min(1, (now - startTime) / duration)
    const ease = t * (2 - t)
    const patchById = {}
    for (const frame of frames) {
      const size = frame.start + (frame.target - frame.start) * ease
      const radiusPx = (size * 2.54 * PX_PER_CM) / 2
      patchById[frame.id] = {
        meta: {
          ...frame.meta,
          radiusX: radiusPx,
          radiusY: radiusPx,
          baseSizeIn: frame.baseSize,
        },
      }
    }
    if (Object.keys(patchById).length) store.updateNodes?.(patchById)
    if (t < 1) {
      inflateRaf = requestAnimationFrame(step)
    } else {
      inflateRaf = null
    }
  }

  inflateRaf = requestAnimationFrame(step)
}
</script>

<style lang="less" scoped>
.builder-grid {
  height: calc(100vh - 56px - 24px - 56px);
  display: grid;
  grid-template-columns: minmax(260px, 320px) minmax(0, 1fr);
  gap: 12px;
}

:deep(.panel-body) {
  padding: 10px;
}

:deep(.panel-head) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
  background: #f5f7fb;
  padding: 6px 8px;
  border-radius: 10px;
}

:deep(.panel-title) {
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1.1;
  text-align: center;
  flex: 1;
}

:deep(.icon-btn) {
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

:deep(.guide-panel .panel-subtitle) {
  font-size: 0.72rem;
}

:deep(.guide-panel .form-label) {
  font-size: 0.7rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
  line-height: 1.1;
}

:deep(.guide-panel .btn-sm) {
  font-size: 0.78rem;
  padding: 0.25rem 0.5rem;
  height: calc(1.5em + 0.5rem + 2px);
  line-height: 1.2;
}

:deep(.guide-panel .form-check-label) {
  font-size: 0.7rem;
  line-height: 1.1;
}

:deep(.guide-panel .form-check-input) {
  margin-top: 0.25rem;
}

:deep(.guide-panel .form-control-sm),
:deep(.guide-panel .form-select-sm) {
  font-size: 0.78rem;
  height: calc(1.5em + 0.5rem + 2px);
  padding: 0.25rem 0.5rem;
  line-height: 1.2;
  border-radius: 0.5rem;
}

.left {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
}

.builder-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px 6px;
}

.tool-btn {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: #fff;
  color: #4a525b;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.tool-btn.active {
  background: #12a4b7;
  color: #fff;
  border-color: transparent;
  box-shadow: 0 6px 12px -8px rgba(18, 164, 183, 0.6);
}

.tool-info {
  margin-left: auto;
  font-size: 0.78rem;
  font-weight: 600;
  color: #4b5563;
  background: #f5f7fb;
  padding: 6px 10px;
  border-radius: 999px;
}

.builder-panel {
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.builder-main {
  min-height: 0;
  display: grid;
  grid-template-rows: auto 1fr;
  gap: 10px;
  height: 100%;
}

.builder-tabs {
  display: flex;
  gap: 8px;
}

.left-tabs {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  background: #f5f7fb;
  border-radius: 14px;
  padding: 6px;
}

.left-panels {
  overflow: auto;
  min-height: 0;
  display: block;
}

.panel-stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tab-btn {
  border: none;
  background: #e9eef6;
  color: #3b3f46;
  padding: 8px 14px;
  border-radius: 999px;
  font-weight: 600;
  font-size: 0.85rem;
}

.tab-btn.active {
  background: #12a4b7;
  color: #fff;
}

.tab-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.builder-body {
  min-height: 0;
  height: 100%;
}

.builder-pane {
  min-height: 0;
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 10px;
  height: 100%;
}

.builder-pane.row-edit-pane {
  grid-template-rows: 1fr;
}

.builder-canvas {
  min-height: 0;
  position: relative;
}

.builder-canvas.bucket-active :deep(.konvajs-content) {
  cursor: copy;
}

.builder-canvas.inflate-active :deep(.konvajs-content) {
  cursor: zoom-in;
}

.builder-canvas.deflate-active :deep(.konvajs-content) {
  cursor: zoom-out;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.builder-file-chip {
  font-size: 0.72rem;
  font-weight: 600;
  color: #1f2933;
  background: rgba(15, 23, 42, 0.08);
  border-radius: 999px;
  padding: 4px 10px;
  max-width: 260px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.builder-controls {
  display: flex;
  justify-content: center;
}

.canvas-measure {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 6px 10px;
  background: #f5f7fb;
  border-radius: 12px;
  font-size: 0.78rem;
  font-weight: 600;
  color: #4b5563;
}

.canvas-measure .label {
  text-transform: uppercase;
  font-size: 0.65rem;
  letter-spacing: 0.05em;
  color: #7b8794;
  margin-right: 6px;
}

.canvas-ruler {
  position: absolute;
  top: 10px;
  right: 16px;
  height: 18px;
  border-top: 2px solid #4b5563;
  border-right: 2px solid #4b5563;
  border-left: 2px solid #4b5563;
  border-radius: 4px 4px 0 0;
  pointer-events: none;
}

.ruler-label {
  position: absolute;
  top: -22px;
  right: 0;
  font-size: 0.7rem;
  font-weight: 600;
  color: #4b5563;
  background: rgba(245, 247, 251, 0.9);
  padding: 2px 6px;
  border-radius: 999px;
}

@media (max-width: 900px) {
  .builder-grid {
    height: calc(100vh - 56px - 24px - 56px);
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
  }
}
</style>
