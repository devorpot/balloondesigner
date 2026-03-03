<template>
  <EditorLayout>
    <template #topbar>
      <BuilderToolbar @go-home="handleGoHome" @import-guide="handleImportGuide" />
    </template>
    <div class="builder-toolbar">
      <button
        class="tool-btn"
        type="button"
        :class="{ active: clustersLocked }"
        title="Bloquear clusters"
        @click="toggleClusterLock"
      >
        <i class="bi" :class="clustersLocked ? 'bi-lock-fill' : 'bi-unlock'"></i>
      </button>
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
              :fill-palette="guideFillPalette"
              :fill-alpha="selectedFillAlpha"
              :selected-bubble-id="rowEditSelectedId"
              :is-editing-elements="!!store.ui?.groupEditMode"
              :is-editing-cluster="centerTab === 'row-edit'"
              :selected-cluster-count="selectedLayerGroupCount"
              @update="updateSelectedLayer"
              @edit-elements="enterSelectedLayerEdit"
              @update-bubble-color="updateLayerBubbleFill"
              @update-bubble-fill-alpha="updateLayerFillAlpha"
              @select-bubble="setRowEditSelected"
              @open-edit-tab="openRowEditTab"
            />
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
            <div class="builder-canvas">
              <CanvasStage />
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
  return grouped.every((node) => !!node.locked)
})
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
const materialsSummary = computed(() => buildMaterialsSummary())
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
  selectedLayerMeta.sizeIn = Number(meta.sizeIn || 12)
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
  window.addEventListener('keydown', onKeyDown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown)
})

function handleGoHome() {
  router.push({ name: 'home' })
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

  for (const node of nodes) {
    const meta = node?.meta || {}
    const rx = Number(meta.radiusX)
    const ry = Number(meta.radiusY)
    const base = Math.max(rx, ry)
    let sizeIn = null
    if (Number.isFinite(base) && base > 0) {
      const diameterCm = (base * 2) / PX_PER_CM
      sizeIn = Math.round((diameterCm / 2.54) * 10) / 10
      const key = String(sizeIn)
      const current = sizes.get(key) || { sizeIn, count: 0 }
      current.count += 1
      sizes.set(key, current)
    }

    const color = String(meta.guideFillColor || node?.color || '#ffffff')
    const alpha = Math.min(100, Math.max(0, Number(meta.guideFillAlpha) || 100))
    const colorKey = `${color}|${alpha}`
    const currentColor = colors.get(colorKey) || { color, alpha, count: 0 }
    currentColor.count += 1
    colors.set(colorKey, currentColor)

    const sizeKey = Number.isFinite(sizeIn) ? String(sizeIn) : 'N/A'
    const detailKey = `${sizeKey}|${color}|${alpha}`
    const currentDetail = detail.get(detailKey) || {
      sizeIn: Number.isFinite(sizeIn) ? sizeIn : null,
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
      const as = a.sizeIn ?? 0
      const bs = b.sizeIn ?? 0
      if (as !== bs) return as - bs
      if (a.color !== b.color) return a.color.localeCompare(b.color)
      return b.count - a.count
    })
    .map((item) => ({
      key: `${item.sizeIn ?? 'N/A'}|${item.color}|${item.alpha}`,
      sizeIn: item.sizeIn,
      color: item.color,
      alpha: item.alpha,
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
    details: detailList,
  }
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

async function handleImportGuide(e) {
  const file = e?.target?.files?.[0] || null
  if (e?.target) e.target.value = ''
  if (!file) return

  try {
    const text = await file.text()
    const data = JSON.parse(text)
    const ok = store.importGuideJsonObject?.(data)
    if (ok) window.alert('Guia importada correctamente.')
    if (ok) lockClusterNodes(true)
    if (ok) {
      await nextTick()
      requestAnimationFrame(() => zoomToFitCanvas())
    }
  } catch {
    window.alert('No se pudo importar la guia. Verifica que el JSON sea válido.')
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
    patchById[node.id] = { locked: !!locked }
  }
  if (Object.keys(patchById).length) store.updateNodes?.(patchById)
}

function toggleClusterLock() {
  const next = !clustersLocked.value
  lockClusterNodes(next)
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
  grid-template-rows: 1fr auto;
  gap: 10px;
  height: 100%;
}

.builder-pane.row-edit-pane {
  grid-template-rows: 1fr;
}

.builder-canvas {
  min-height: 0;
}

.builder-controls {
  display: flex;
  justify-content: center;
}

@media (max-width: 900px) {
  .builder-grid {
    height: calc(100vh - 56px - 24px - 56px);
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
  }
}
</style>
