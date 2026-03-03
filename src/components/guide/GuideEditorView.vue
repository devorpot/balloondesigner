<template>
  <EditorLayout>
    <template #topbar>
      <GuideToolbar
        @go-home="handleGoHome"
        @new-guide="handleNewGuide"
        @save-project="handleSaveProject"
        @save-project-as="handleSaveProjectAs"
        @export-guide="exportGuideJsonAll"
        @export-guide-visible="exportGuideJsonVisible"
        @import-json="handleImportJsonFile"
        @export-json="exportJson"
        :dirty="!!store.autosave?.isDirty"
      />
    </template>

    <div class="grid" @keydown="onKeyDown" tabindex="0" ref="wrap">
      <!-- Left column -->
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
        </div>
        <div class="left-panels">
          <div v-show="leftTab === 'guide'" class="panel-stack">
            <GuideToolsPanel
              :guide-wall-summary="guideWallSummary"
              :color="guideTools.color"
              :alpha="guideTools.alpha"
              :export-visible-only="guideExportVisibleOnly"
              @update="updateGuideTools"
              @export-guide="exportGuideJson"
              @export-selection="exportGuideJsonSelection"
              @import-guide="handleImportGuideFile"
            />
            <GuideTemplatesPanel
              :template-name="guideTemplateName"
              :template-description="guideTemplateDescription"
              :selected-id="selectedGuideTemplateId"
              :templates="guideTemplates"
              :selected-description="selectedGuideTemplateDescription"
              :selected-meta="selectedGuideTemplateMeta"
              @update="updateGuideTemplateState"
              @save="saveGuideTemplate"
              @import="handleImportGuideTemplateFile"
              @export="exportGuideTemplate"
              @apply="applyGuideTemplate"
              @remove="removeGuideTemplate"
            />
            <GuideEditPanel
              :guide-radius-unit="guideRadiusUnit"
              :line-width="guideTools.lineWidth"
              :line-style="guideTools.lineStyle"
              :circle-r="guideTools.circleR"
              :oval-w="guideTools.ovalW"
              :oval-h="guideTools.ovalH"
              @update="updateGuideTools"
              @add-circle="addGuideCircle"
              @add-oval="addGuideOval"
              @bring-forward="store.bringForwardSelected"
              @send-backward="store.sendBackwardSelected"
              @bring-front="store.bringToFrontSelected"
              @send-back="store.sendToBackSelected"
            />
            <GuideRowsPanel
              :unit="'in'"
              :layout="guideRows.layout"
              :size="guideRows.size"
              :layers="guideRows.layers"
              :per-layer="guideRows.perLayer"
              :show-gap-controls="guideRows.showGapControls"
              :layer-gap-factor="guideRows.layerGapFactor"
              :balloon-gap="guideRows.balloonGap"
              @update="updateGuideRows"
              @reset-gap="resetGuideRowsGap"
              @apply="applyGuideRows"
            />
            <GuideArcPanel
              :selected-count="selectedArcClusterCount"
              :arc-active="!!activeArcId"
              :arc-count="activeArcClusterCount"
              :width="guideArc.width"
              :height="guideArc.height"
              :unit="guideArc.unit"
              :size-in="guideArc.sizeIn"
              :cluster-count="guideArc.clusterCount"
              :base-cluster-count="guideArc.baseClusterCount"
              :base-cluster-auto="guideArc.baseClusterAuto"
              :respect-height="guideArc.respectHeight"
              :can-create="selectedArcClusterCount > 0"
              :can-update="!!activeArcId"
              @update="updateGuideArcState"
              @create="createGuideArc"
              @update-arc="applyGuideArcUpdate"
            />
            <GuideRowEditPanel
              :can-edit="!!selectedLayerGroup"
              :group-name="selectedLayerGroup?.name"
              :nodes="selectedLayerNodes"
              :total-count="selectedLayerNodes.length"
              :layout="selectedLayerMeta.layout"
              :size-in="selectedLayerMeta.sizeIn"
              :per-layer="selectedLayerMeta.perLayer"
              :gap-in="selectedLayerMeta.gapIn"
              :rotation-deg="selectedLayerMeta.rotationDeg"
              :fill-palette="guideFillPalette"
              :selected-bubble-id="rowEditSelectedId"
              @update="updateSelectedLayer"
              @edit-elements="enterSelectedLayerEdit"
              @update-bubble-color="updateLayerBubbleFill"
              @select-bubble="setRowEditSelected"
              @open-edit-tab="openRowEditTab"
            />
          </div>
        </div>
      </div>

      <!-- Center -->
      <div class="center">
        <div class="center-tabs">
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

        <div class="center-body">
          <div v-show="centerTab === 'canvas'" class="center-pane">
            <div class="center-canvas">
              <CanvasStage />
            </div>
            <CanvasControls />
          </div>
          <div v-show="centerTab === 'row-edit'" class="center-pane row-edit-pane">
            <div v-if="!selectedLayerGroup" class="text-muted small">
              Selecciona un cluster para editarlo.
            </div>
            <GuideRowEditCanvas
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

      <!-- Right column -->
      <div class="right">
        <div class="right-tabs">
          <button
            class="tab-btn"
            type="button"
            :class="{ active: activeTab === 'canvas' }"
            @click="activeTab = 'canvas'"
          >
            Canvas
          </button>
          <button
            class="tab-btn"
            type="button"
            :class="{ active: activeTab === 'history' }"
            @click="activeTab = 'history'"
          >
            Historial
          </button>
          <button
            class="tab-btn"
            type="button"
            :class="{ active: activeTab === 'objects' }"
            @click="activeTab = 'objects'"
          >
            Objetos
          </button>
          <button
            class="tab-btn"
            type="button"
            :class="{ active: activeTab === 'guide' }"
            @click="activeTab = 'guide'"
          >
            Guia
          </button>
        </div>

        <div class="right-panels">
          <div v-show="activeTab === 'canvas'" class="panel-stack">
            <CanvasSettingsPanel />
          </div>
          <div v-show="activeTab === 'history'" class="panel-stack">
            <HistoryPanel />
          </div>
          <div v-show="activeTab === 'objects'" class="panel-stack">
            <GuideObjectsPanel />
          </div>
          <div v-show="activeTab === 'guide'" class="panel-stack">
            <GuidePropertiesPanel
              :selected-guide="selectedGuide"
              :unit="guidePropsUnit"
              :guide-radius-x="guideRadiusX"
              :guide-radius-y="guideRadiusY"
              :guide-radius-x-label="guideRadiusXLabel"
              :guide-radius-y-label="guideRadiusYLabel"
              :guide-line-width="guideLineWidth"
              :guide-line-style="guideLineStyle"
              :guide-scale="guideScale"
              :guide-color="guideColorValue"
              :guide-alpha="guideAlphaValue"
              :guide-fill-color="guideFillColorValue"
              :guide-fill="guideFillValue"
              :fill-palette="guideFillPalette"
              @update-radius-x="updateGuideRadiusX"
              @update-radius-y="updateGuideRadiusY"
              @update-line-width="updateGuideLineWidth"
              @update-line-style="updateGuideLineStyle"
              @update-scale="updateGuideScale"
              @update-color="updateGuideColor"
              @update-alpha="updateGuideAlpha"
              @update-fill-color="updateGuideFillColor"
              @update-fill="updateGuideFill"
              @apply-fill-palette="applyGuideFillPalette"
              @preview-color="previewGuideColor"
              @preview-alpha="previewGuideAlpha"
              @preview-fill-color="previewGuideFillColor"
              @preview-fill="previewGuideFill"
              @toggle-unit="toggleGuidePropsUnit"
            />
            <GuideTopViewPanel
              v-if="guideTopViewAvailable"
              :group-name="guideTopViewGroupName"
              :nodes="guideTopViewNodes"
              :total-count="guideTopViewTotal"
              :view-side="store.ui?.viewSide"
              @drag-start="startGuideTopViewDrag"
              @drag-move="updateGuideTopView"
              @drag-end="endGuideTopViewDrag"
            />
            <AlignPanel v-if="store.selectedNodes?.length" />
          </div>
        </div>
      </div>
    </div>
  </EditorLayout>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { provideEditorStore } from '@/stores/editor-context'
import { useGuideStore } from '@/stores/guide.store'
import { useProjectsStore } from '@/stores/projects.store'
import { useCatalogStore } from '@/stores/catalog.store'
import { PX_PER_CM } from '@/constants/canvas'

import EditorLayout from '@/layouts/EditorLayout.vue'
import GuideToolbar from '@/components/guide/GuideToolbar.vue'
import CanvasStage from '@/components/guide/CanvasStage.vue'
import CanvasControls from '@/components/guide/CanvasControls.vue'
import AlignPanel from '@/components/guide/AlignPanel.vue'
import CanvasSettingsPanel from '@/components/guide/CanvasSettingsPanel.vue'
import HistoryPanel from '@/components/guide/HistoryPanel.vue'
import GuideToolsPanel from '@/components/guide/GuideToolsPanel.vue'
import GuideTemplatesPanel from '@/components/guide/GuideTemplatesPanel.vue'
import GuideEditPanel from '@/components/guide/GuideEditPanel.vue'
import GuideRowsPanel from '@/components/guide/GuideRowsPanel.vue'
import GuideArcPanel from '@/components/guide/GuideArcPanel.vue'
import GuideRowEditPanel from '@/components/guide/GuideRowEditPanel.vue'
import GuideRowEditCanvas from '@/components/guide/GuideRowEditCanvas.vue'
import GuidePropertiesPanel from '@/components/guide/GuidePropertiesPanel.vue'
import GuideObjectsPanel from '@/components/guide/GuideObjectsPanel.vue'
import GuideTopViewPanel from '@/components/guide/GuideTopViewPanel.vue'

const store = useGuideStore()
provideEditorStore(store)
const projects = useProjectsStore()
const catalog = useCatalogStore()
const router = useRouter()
const wrap = ref(null)
const activeTab = ref('guide')
const leftTab = ref('guide')
const centerTab = ref('canvas')
const GUIDE_TOOL_UNIT = 'in'
const GUIDE_TOOL_SIZE_OPTIONS = [5, 9, 12, 24, 36]
const DEFAULT_CIRCLE_SIZE_IN = GUIDE_TOOL_SIZE_OPTIONS[0]
const DEFAULT_OVAL_W_IN = DEFAULT_CIRCLE_SIZE_IN
const DEFAULT_OVAL_H_IN = Math.round(DEFAULT_CIRCLE_SIZE_IN * 0.7 * 100) / 100

const guideTools = reactive({
  circleR: DEFAULT_CIRCLE_SIZE_IN,
  ovalW: DEFAULT_OVAL_W_IN,
  ovalH: DEFAULT_OVAL_H_IN,
  color: '#424242',
  alpha: 100,
  lineWidth: 2,
  lineStyle: 'dashed',
})
const guideExportVisibleOnly = ref(false)
const guideTemplates = ref([])
const guideTemplateName = ref('')
const guideTemplateDescription = ref('')
const selectedGuideTemplateId = ref('')
const GUIDE_TEMPLATES_KEY = 'balloon_guide_templates_v1'
const selectedGuideTemplate = computed(
  () =>
    guideTemplates.value.find((t) => String(t.id) === String(selectedGuideTemplateId.value)) ||
    null,
)
const selectedGuideTemplateDescription = computed(() =>
  String(selectedGuideTemplate.value?.description || '').trim(),
)
const selectedGuideTemplateMeta = computed(() => {
  const tpl = selectedGuideTemplate.value
  if (!tpl) return ''
  const created = formatTemplateDate(tpl.createdAt)
  const updated = formatTemplateDate(tpl.updatedAt)
  if (!created && !updated) return ''
  if (created && updated && created !== updated)
    return `Creado: ${created} · Actualizado: ${updated}`
  return created ? `Creado: ${created}` : `Actualizado: ${updated}`
})
const guideRows = reactive({
  layout: 'wall',
  size: 5,
  layers: 1,
  perLayer: 6,
  showGapControls: true,
  layerGapFactor: 1,
  balloonGap: 0,
})
const guideArc = reactive({
  unit: 'cm',
  width: 200,
  height: 120,
  sizeIn: 9,
  clusterCount: null,
  baseClusterCount: null,
  baseClusterAuto: 0,
  respectHeight: false,
})
const guideArcTouched = ref(false)
const guideMode = computed(() => true)
const guideWall = computed(() => store.ui?.guideWall || null)
const guideWallUnit = computed(() => guideWall.value?.wallUnit || 'cm')
const guideRadiusUnit = computed(() => guideWall.value?.radiusUnit || 'cm')
const guidePropsUnit = ref('cm')
const guidePropsUnitAuto = ref(true)
const guideWallPx = computed(() => {
  if (!guideWall.value) return null
  const width = Number(guideWall.value.widthCm || 0) * PX_PER_CM
  const height = Number(guideWall.value.heightCm || 0) * PX_PER_CM
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null
  return { width, height }
})
const guideMaxRadiusPx = computed(() => {
  const maxRadiusCm = Number(guideWall.value?.maxRadiusCm || 0)
  if (!Number.isFinite(maxRadiusCm) || maxRadiusCm <= 0) return null
  return maxRadiusCm * PX_PER_CM
})
const guideWallSummary = computed(() => {
  if (!guideWall.value) return ''
  const width = roundToUnit(cmToUnit(guideWall.value.widthCm, guideWallUnit.value))
  const height = roundToUnit(cmToUnit(guideWall.value.heightCm, guideWallUnit.value))
  const radius = roundToUnit(cmToUnit(guideWall.value.maxRadiusCm, guideRadiusUnit.value))
  const widthCm = roundToUnit(cmToUnit(guideWall.value.widthCm, 'cm'))
  const heightCm = roundToUnit(cmToUnit(guideWall.value.heightCm, 'cm'))
  const widthIn = roundToUnit(cmToUnit(guideWall.value.widthCm, 'in'))
  const heightIn = roundToUnit(cmToUnit(guideWall.value.heightCm, 'in'))
  const radiusCm = roundToUnit(cmToUnit(guideWall.value.maxRadiusCm, 'cm'))
  const radiusIn = roundToUnit(cmToUnit(guideWall.value.maxRadiusCm, 'in'))
  return `Pared ${width} x ${height} ${guideWallUnit.value} (${widthCm} cm / ${widthIn} in x ${heightCm} cm / ${heightIn} in) · Radio max ${radius} ${guideRadiusUnit.value} (${radiusCm} cm / ${radiusIn} in)`
})
const guideSelectedGroup = computed(() => {
  const gid = store.selectedGroupId
  if (!gid) return null
  return (store.groups || []).find((g) => String(g.id) === String(gid)) || null
})
const guideSelectedGroupNodes = computed(() => {
  const group = guideSelectedGroup.value
  if (!group || !Array.isArray(group.childIds)) return []
  const set = new Set(group.childIds.map((id) => String(id)))
  return (store.nodes || []).filter((node) => set.has(String(node.id)) && !node?.meta?.guide)
})
const guideTopViewNodes = computed(() => guideSelectedGroupNodes.value)
const guideTopViewTotal = computed(() => guideSelectedGroupNodes.value.length)
const guideTopViewGroupName = computed(() => guideSelectedGroup.value?.name || 'Grupo')
const guideTopViewAvailable = computed(
  () => !store.ui?.symbolEdit?.active && guideTopViewTotal.value > 0,
)
function isLayerGroup(group) {
  if (!group) return false
  if (group?.meta?.kind === 'layer') return true
  return /^(fila|cluster)\b/i.test(String(group?.name || ''))
}
const selectedLayerGroup = computed(() => {
  const groups = store.groups || []
  const gid = store.selectedGroupId
  if (gid) {
    const group = groups.find((g) => String(g.id) === String(gid)) || null
    return isLayerGroup(group) ? group : null
  }

  const selected = store.selectedNodes || []
  if (!selected.length) return null
  const groupId = selected[0]?.groupId
  if (!groupId) return null
  const sameGroup = selected.every((n) => String(n.groupId) === String(groupId))
  if (!sameGroup) return null
  const group = groups.find((g) => String(g.id) === String(groupId)) || null
  return isLayerGroup(group) ? group : null
})
const selectedLayerNodes = computed(() => {
  const group = selectedLayerGroup.value
  if (!group || !Array.isArray(group.childIds)) return []
  const set = new Set(group.childIds.map((id) => String(id)))
  return (store.nodes || []).filter((node) => set.has(String(node.id)))
})
const selectedArcClusterGroups = computed(() => {
  const groups = store.groups || []
  const groupById = new Map(groups.map((g) => [String(g.id), g]))
  const nodesById = new Map((store.nodes || []).map((n) => [String(n.id), n]))
  const groupIds = new Set()

  if (store.selectedGroupId) groupIds.add(String(store.selectedGroupId))

  for (const id of store.selectedIds || []) {
    const node = nodesById.get(String(id))
    if (node?.groupId) groupIds.add(String(node.groupId))
  }

  return [...groupIds]
    .map((id) => groupById.get(String(id)))
    .filter((group) => group && isLayerGroup(group))
})
const selectedArcClusterCount = computed(() => selectedArcClusterGroups.value.length)
const activeArcId = computed(() => {
  const arcIds = new Set()
  const nodesById = new Map((store.nodes || []).map((n) => [String(n.id), n]))
  for (const group of selectedArcClusterGroups.value) {
    const direct = group?.meta?.arcId || group?.meta?.arc?.id
    if (direct) {
      arcIds.add(String(direct))
      continue
    }
    const childIds = Array.isArray(group.childIds) ? group.childIds : []
    for (const id of childIds) {
      const node = nodesById.get(String(id))
      const nodeArc = node?.meta?.arcId || node?.meta?.arc?.id
      if (nodeArc) {
        arcIds.add(String(nodeArc))
        break
      }
    }
  }
  if (arcIds.size === 1) return [...arcIds][0]
  return ''
})
const activeArcGroups = computed(() => {
  if (!activeArcId.value) return []
  return (store.groups || []).filter((group) => {
    const direct = group?.meta?.arcId || group?.meta?.arc?.id
    if (direct && String(direct) === String(activeArcId.value)) return true
    if (!Array.isArray(group?.childIds)) return false
    const nodesById = new Map((store.nodes || []).map((n) => [String(n.id), n]))
    for (const id of group.childIds) {
      const node = nodesById.get(String(id))
      const nodeArc = node?.meta?.arcId || node?.meta?.arc?.id
      if (nodeArc && String(nodeArc) === String(activeArcId.value)) return true
    }
    return false
  })
})
const activeArcClusterCount = computed(() => activeArcGroups.value.length)
const activeArcMeta = computed(() => {
  const group = activeArcGroups.value[0]
  if (!group) return null
  const direct = group?.meta?.arc
  if (direct && typeof direct === 'object') return direct
  if (!Array.isArray(group?.childIds)) return null
  const nodesById = new Map((store.nodes || []).map((n) => [String(n.id), n]))
  for (const id of group.childIds) {
    const node = nodesById.get(String(id))
    if (node?.meta?.arc && typeof node.meta.arc === 'object') return node.meta.arc
  }
  return null
})
const selectedLayerMeta = reactive({
  layout: 'wall',
  sizeIn: 12,
  perLayer: 6,
  gapIn: 0,
  rotationDeg: 0,
})
const rowEditSelectedId = ref('')
const guideTopViewDrag = reactive({
  active: false,
  centerX: 0,
  centerY: 0,
  maxRadius: 0,
})
const TOP_VIEW_RANGE = 3

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
      if (centerTab.value === 'row-edit') centerTab.value = 'canvas'
      return
    }
    const current = String(rowEditSelectedId.value || '')
    const exists = list.some((node) => String(node?.id) === current)
    if (!exists) rowEditSelectedId.value = String(list[0]?.id || '')
  },
  { immediate: true },
)
watch(
  activeArcMeta,
  (meta) => {
    if (!meta) return
    const nextUnit = meta.unit === 'in' ? 'in' : 'cm'
    guideArc.unit = nextUnit
    const nextWidth = Number(meta.width)
    const nextHeight = Number(meta.height)
    const nextSize = Number(meta.sizeIn)
    const nextClusterCount = Number(meta.targetCount)
    const nextBaseClusterCount = Number(meta.baseClusterCount)
    const nextBaseClusterAuto = Number(meta.baseClusterAuto)
    if (Number.isFinite(nextWidth)) guideArc.width = roundToUnit(nextWidth)
    if (Number.isFinite(nextHeight)) guideArc.height = roundToUnit(nextHeight)
    if (Number.isFinite(nextSize)) guideArc.sizeIn = nextSize
    guideArc.clusterCount =
      Number.isFinite(nextClusterCount) && nextClusterCount > 0 ? nextClusterCount : null
    guideArc.baseClusterCount =
      Number.isFinite(nextBaseClusterCount) && nextBaseClusterCount > 0
        ? nextBaseClusterCount
        : null
    guideArc.baseClusterAuto =
      Number.isFinite(nextBaseClusterAuto) && nextBaseClusterAuto > 0 ? nextBaseClusterAuto : 0
    guideArc.respectHeight = !!meta.respectHeight
  },
  { immediate: true },
)
const guideRadiusXLabel = computed(() => {
  if (!selectedGuide.value) return ''
  const px = Number(selectedGuide.value?.meta?.radiusX ?? 0)
  const value = roundToUnit(pxToUnit(px, guidePropsUnit.value))
  return formatUnitLabel(value, guidePropsUnit.value)
})
const guideRadiusYLabel = computed(() => {
  if (!selectedGuide.value) return ''
  const px = Number(selectedGuide.value?.meta?.radiusY ?? 0)
  const value = roundToUnit(pxToUnit(px, guidePropsUnit.value))
  return formatUnitLabel(value, guidePropsUnit.value)
})
const guideColorValue = computed(() => selectedGuide.value?.color || guideTools.color || '#3c3c3c')
const guideAlphaValue = computed(() => {
  const raw = selectedGuide.value?.meta?.guideAlpha
  if (raw === undefined || raw === null) return 100
  return clampNumber(Number(raw), 0, 100)
})
const guideFillColorValue = computed(() => {
  const raw = selectedGuide.value?.meta?.guideFillColor
  return String(raw || '#ffffff')
})
const guideFillValue = computed(() => {
  const raw = selectedGuide.value?.meta?.guideFillAlpha
  if (raw === undefined || raw === null) return 0
  return clampNumber(Number(raw), 0, 100)
})
const guidePreviewTimers = {
  color: null,
  alpha: null,
  fill: null,
  fillColor: null,
}
const guidePreviewPending = {
  color: null,
  alpha: null,
  fill: null,
  fillColor: null,
}
const guideFillPalette = ref(loadGuideFillPalette())
const selectedGuide = computed(() => {
  const node = store.selectedNode
  if (!node || node.kind !== 'balloon') return null
  return node
})
const guideSelectionTargets = computed(() => {
  const list = store.ui?.symbolEdit?.active
    ? store.symbolEditSelectedNodes || []
    : store.selectedNodes || []
  return list.filter((n) => n && n.kind === 'balloon' && !n?.meta?.guide && !n.locked)
})
const guideRadiusX = computed({
  get() {
    const px = Number(selectedGuide.value?.meta?.radiusX ?? 46)
    return roundToUnit(pxToUnit(px, guidePropsUnit.value))
  },
  set(value) {
    if (!selectedGuide.value) return
    const px = unitToPx(value, guidePropsUnit.value)
    const maxPx = guideMaxRadiusPx.value || 320 * PX_PER_CM
    const next = clampNumber(px, unitToPx(0.5, guidePropsUnit.value), maxPx)
    store.updateNodeMeta(selectedGuide.value.id, { radiusX: next })
  },
})
const guideRadiusY = computed({
  get() {
    const px = Number(selectedGuide.value?.meta?.radiusY ?? 60)
    return roundToUnit(pxToUnit(px, guidePropsUnit.value))
  },
  set(value) {
    if (!selectedGuide.value) return
    const px = unitToPx(value, guidePropsUnit.value)
    const maxPx = guideMaxRadiusPx.value || 320 * PX_PER_CM
    const next = clampNumber(px, unitToPx(0.5, guidePropsUnit.value), maxPx)
    store.updateNodeMeta(selectedGuide.value.id, { radiusY: next })
  },
})
const guideScale = computed({
  get() {
    return Number(selectedGuide.value?.scaleX ?? 1)
  },
  set(value) {
    if (!selectedGuide.value) return
    const rx = Number(selectedGuide.value?.meta?.radiusX ?? 46)
    const ry = Number(selectedGuide.value?.meta?.radiusY ?? 60)
    const maxPx = guideMaxRadiusPx.value
    const base = Math.max(rx, ry) || 1
    const maxScale = maxPx ? Math.max(0.2, maxPx / base) : 4
    const next = clampNumber(value, 0.2, Math.min(4, maxScale))
    store.updateNode(selectedGuide.value.id, { scaleX: next, scaleY: next })
  },
})
const guideLineWidth = computed({
  get() {
    return Number(selectedGuide.value?.meta?.guideLineWidth ?? 2)
  },
  set(value) {
    if (!selectedGuide.value) return
    const next = clampNumber(value, 1, 10)
    store.updateNodeMeta(selectedGuide.value.id, { guideLineWidth: next })
  },
})
const guideLineStyle = computed({
  get() {
    return selectedGuide.value?.meta?.guideLineDash ? 'dashed' : 'solid'
  },
  set(value) {
    if (!selectedGuide.value) return
    store.updateNodeMeta(selectedGuide.value.id, { guideLineDash: value === 'dashed' })
  },
})

function updateGuideTools(patch) {
  if (Object.prototype.hasOwnProperty.call(patch, 'color')) {
    guideTools.color = String(patch.color || '')
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'alpha')) {
    guideTools.alpha = clampNumber(Number(patch.alpha), 0, 100)
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'exportVisibleOnly')) {
    guideExportVisibleOnly.value = !!patch.exportVisibleOnly
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'lineWidth')) {
    guideTools.lineWidth = Number(patch.lineWidth)
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'lineStyle')) {
    guideTools.lineStyle = patch.lineStyle || 'dashed'
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'circleR')) {
    guideTools.circleR = Number(patch.circleR)
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'ovalW')) {
    guideTools.ovalW = Number(patch.ovalW)
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'ovalH')) {
    guideTools.ovalH = Number(patch.ovalH)
  }
}

function updateGuideRows(patch) {
  if (Object.prototype.hasOwnProperty.call(patch, 'layout')) {
    guideRows.layout = patch.layout === 'circle' ? 'circle' : 'wall'
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'size')) {
    const next = Number(patch.size)
    guideRows.size = Number.isFinite(next) ? Math.max(1, next) : guideRows.size
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'layers')) {
    const next = Number(patch.layers)
    guideRows.layers = Number.isFinite(next) ? Math.max(1, Math.round(next)) : guideRows.layers
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'perLayer')) {
    const next = Number(patch.perLayer)
    guideRows.perLayer = Number.isFinite(next) ? clampNumber(Math.round(next), 3, 6) : 3
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'showGapControls')) {
    guideRows.showGapControls = !!patch.showGapControls
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'layerGapFactor')) {
    const next = Number(patch.layerGapFactor)
    guideRows.layerGapFactor = Number.isFinite(next) ? clampNumber(next, 0.5, 3) : 1
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'balloonGap')) {
    const next = Number(patch.balloonGap)
    guideRows.balloonGap = Number.isFinite(next) ? Math.max(0, next) : 0
  }
}

function updateGuideArcState(patch) {
  guideArcTouched.value = true
  if (Object.prototype.hasOwnProperty.call(patch, 'unit')) {
    const nextUnit = patch.unit === 'in' ? 'in' : 'cm'
    if (nextUnit !== guideArc.unit) {
      const widthCm = toCm(guideArc.width, guideArc.unit)
      const heightCm = toCm(guideArc.height, guideArc.unit)
      guideArc.unit = nextUnit
      guideArc.width = roundToUnit(cmToUnit(widthCm, nextUnit))
      guideArc.height = roundToUnit(cmToUnit(heightCm, nextUnit))
    }
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'width')) {
    const next = Number(patch.width)
    guideArc.width = Number.isFinite(next) ? Math.max(1, next) : guideArc.width
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'height')) {
    const next = Number(patch.height)
    guideArc.height = Number.isFinite(next) ? Math.max(1, next) : guideArc.height
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'sizeIn')) {
    const next = Number(patch.sizeIn)
    guideArc.sizeIn = Number.isFinite(next) ? Math.max(1, next) : guideArc.sizeIn
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'clusterCount')) {
    const next = Number(patch.clusterCount)
    guideArc.clusterCount = Number.isFinite(next) && next > 0 ? Math.round(next) : null
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'baseClusterCount')) {
    const next = Number(patch.baseClusterCount)
    guideArc.baseClusterCount = Number.isFinite(next) && next > 0 ? Math.round(next) : null
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'respectHeight')) {
    guideArc.respectHeight = !!patch.respectHeight
  }
}

function resetGuideRowsGap() {
  guideRows.layerGapFactor = 1
}

function resetGuideRowsDefaults() {
  guideRows.layout = 'wall'
  guideRows.size = 5
  guideRows.layers = 1
  guideRows.perLayer = 6
  guideRows.showGapControls = true
  guideRows.layerGapFactor = 1
  guideRows.balloonGap = 0
}

function updateSelectedLayer(patch) {
  const group = selectedLayerGroup.value
  if (!group) return
  if (Object.prototype.hasOwnProperty.call(patch, 'sizeIn')) {
    const next = Number(patch.sizeIn)
    selectedLayerMeta.sizeIn = Number.isFinite(next) ? next : selectedLayerMeta.sizeIn
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'perLayer')) {
    const next = Number(patch.perLayer)
    selectedLayerMeta.perLayer = Number.isFinite(next)
      ? clampNumber(Math.round(next), 3, 6)
      : selectedLayerMeta.perLayer
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'gapIn')) {
    const next = Number(patch.gapIn)
    selectedLayerMeta.gapIn = Number.isFinite(next) ? clampNumber(next, -3, 6) : 0
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'rotationDeg')) {
    const next = Number(patch.rotationDeg)
    selectedLayerMeta.rotationDeg = Number.isFinite(next) ? next : 0
  }
  store.updateLayerGroup?.({
    groupId: group.id,
    perLayer: selectedLayerMeta.perLayer,
    sizeIn: selectedLayerMeta.sizeIn,
    gapIn: selectedLayerMeta.gapIn,
    rotationDeg: selectedLayerMeta.rotationDeg,
  })
}

function updateLayerBubbleFill({ id, color }) {
  const nodeId = String(id || '')
  const value = String(color || '').trim()
  if (!nodeId || !value) return
  addGuideFillPaletteColor(value)
  store.updateNodeMeta(nodeId, { guideFillColor: value })
}

function openRowEditTab() {
  if (!selectedLayerGroup.value) return
  centerTab.value = 'row-edit'
}

function setRowEditSelected(id) {
  if (!id) return
  rowEditSelectedId.value = String(id)
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
}

function updateGuideTemplateState(patch) {
  if (Object.prototype.hasOwnProperty.call(patch, 'name')) {
    guideTemplateName.value = String(patch.name || '')
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'description')) {
    guideTemplateDescription.value = String(patch.description || '')
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'selectedId')) {
    selectedGuideTemplateId.value = String(patch.selectedId || '')
  }
}

function updateGuideRadiusX(value) {
  const targets = guideSelectionTargets.value
  if (!targets.length) return
  const px = unitToPx(value, guidePropsUnit.value)
  const maxPx = guideMaxRadiusPx.value || 320 * PX_PER_CM
  const next = clampNumber(px, unitToPx(0.5, guidePropsUnit.value), maxPx)
  store.beginHistoryBatch()
  try {
    for (const node of targets) {
      store.updateNodeMeta(node.id, { radiusX: next })
    }
  } finally {
    store.endHistoryBatch()
  }
}

function updateGuideRadiusY(value) {
  const targets = guideSelectionTargets.value
  if (!targets.length) return
  const px = unitToPx(value, guidePropsUnit.value)
  const maxPx = guideMaxRadiusPx.value || 320 * PX_PER_CM
  const next = clampNumber(px, unitToPx(0.5, guidePropsUnit.value), maxPx)
  store.beginHistoryBatch()
  try {
    for (const node of targets) {
      store.updateNodeMeta(node.id, { radiusY: next })
    }
  } finally {
    store.endHistoryBatch()
  }
}

function updateGuideLineWidth(value) {
  const targets = guideSelectionTargets.value
  if (!targets.length) return
  const next = clampNumber(Number(value), 1, 10)
  store.beginHistoryBatch()
  try {
    for (const node of targets) {
      store.updateNodeMeta(node.id, { guideLineWidth: next })
    }
  } finally {
    store.endHistoryBatch()
  }
}

function updateGuideLineStyle(value) {
  const targets = guideSelectionTargets.value
  if (!targets.length) return
  const dashed = value === 'dashed'
  store.beginHistoryBatch()
  try {
    for (const node of targets) {
      store.updateNodeMeta(node.id, { guideLineDash: dashed })
    }
  } finally {
    store.endHistoryBatch()
  }
}

function applyGuideRows() {
  const wall = guideWallPx.value
  if (!wall) return

  const unit = 'in'
  const size = Math.max(1, Number(guideRows.size) || 1)
  const radiusPxRaw = unitToPx(size / 2, unit)
  const maxRadius = guideMaxRadiusPx.value
  const radiusPx = maxRadius
    ? clampNumber(radiusPxRaw, unitToPx(0.5, unit), maxRadius)
    : Math.max(1, radiusPxRaw)
  const diameter = radiusPx * 2

  const perLayer = clampNumber(Math.round(guideRows.perLayer || 3), 3, 6)
  const layers = Math.max(1, Math.round(Number(guideRows.layers) || 1))
  const gapPx =
    guideRows.layout === 'circle'
      ? 0
      : Math.max(0, unitToPx(Number(guideRows.balloonGap) || 0, unit))
  const layerGapFactor = clampNumber(Number(guideRows.layerGapFactor) || 1, 0.5, 3)
  const rowStep = (diameter + gapPx) * layerGapFactor
  const baseY = wall.height - radiusPx
  const centerX = wall.width / 2

  const lineWidth = clampNumber(guideTools.lineWidth, 1, 10)
  const lineDash = guideTools.lineStyle === 'dashed'
  const guideAlpha = clampNumber(guideTools.alpha, 0, 100)
  const color = String(guideTools.color || '#e0e0e0')

  store.beginHistoryBatch()
  try {
    for (let rowIndex = 0; rowIndex < layers; rowIndex += 1) {
      const y = baseY - rowIndex * rowStep
      if (y - radiusPx < 0) break

      const rowIds = []
      if (guideRows.layout === 'circle') {
        let circleRadius = diameter * (perLayer / 6)
        const maxCircleRadius = Math.max(0, centerX - radiusPx)
        if (maxCircleRadius > 0) circleRadius = Math.min(circleRadius, maxCircleRadius)
        const step = (Math.PI * 2) / perLayer
        for (let i = 0; i < perLayer; i += 1) {
          const angle = -Math.PI / 2 + step * i
          const x = clampNumber(
            centerX + Math.cos(angle) * circleRadius,
            radiusPx,
            wall.width - radiusPx,
          )
          const topView = {
            x: Math.cos(angle) * TOP_VIEW_RANGE,
            y: Math.sin(angle) * TOP_VIEW_RANGE,
          }
          const id = store.addNode({
            x,
            y,
            color,
            typeId: 'round-11',
            meta: {
              radiusX: radiusPx,
              radiusY: radiusPx,
              knot: false,
              shape: 'ellipse',
              guideLine: true,
              guideAlpha,
              guide: false,
              guideLineDash: lineDash,
              guideLineWidth: lineWidth,
              guideFillColor: '#ffffff',
              guideFillAlpha: 0,
              topView,
            },
            name: 'Guia',
          })
          if (id) rowIds.push(id)
        }
      } else {
        const totalWidth = perLayer * diameter + (perLayer - 1) * gapPx
        let startX = centerX - totalWidth / 2 + radiusPx
        if (startX < radiusPx) startX = radiusPx
        for (let i = 0; i < perLayer; i += 1) {
          const x = clampNumber(startX + i * (diameter + gapPx), radiusPx, wall.width - radiusPx)
          const id = store.addNode({
            x,
            y,
            color,
            typeId: 'round-11',
            meta: {
              radiusX: radiusPx,
              radiusY: radiusPx,
              knot: false,
              shape: 'ellipse',
              guideLine: true,
              guideAlpha,
              guide: false,
              guideLineDash: lineDash,
              guideLineWidth: lineWidth,
              guideFillColor: '#ffffff',
              guideFillAlpha: 0,
              topView: { x: 0, y: 0 },
            },
            name: 'Guia',
          })
          if (id) rowIds.push(id)
        }
      }

      if (rowIds.length >= 2) {
        const groupId = store.createGroup({ name: `Cluster ${rowIndex + 1}`, childIds: rowIds })
        if (groupId) {
          const group = (store.groups || []).find((g) => String(g.id) === String(groupId))
          if (group) {
            group.meta = {
              ...(group.meta && typeof group.meta === 'object' ? group.meta : {}),
              kind: 'layer',
              layout: guideRows.layout === 'circle' ? 'circle' : 'wall',
              sizeIn: size,
              perLayer,
              gapIn: guideRows.balloonGap,
              rotationDeg: 0,
              rowIndex: rowIndex + 1,
            }
          }
        }
      }
    }
  } finally {
    store.endHistoryBatch()
  }
}

function createGuideArc() {
  if (!selectedArcClusterCount.value) return
  const groupIds = selectedArcClusterGroups.value.map((group) => group.id)
  store.createArcFromClusters?.({
    groupIds,
    width: guideArc.width,
    height: guideArc.height,
    unit: guideArc.unit,
    sizeIn: guideArc.sizeIn,
    clusterCount: guideArc.clusterCount,
    baseClusterCount: guideArc.baseClusterCount,
    respectHeight: guideArc.respectHeight,
  })
}

function applyGuideArcUpdate() {
  if (!activeArcId.value) return
  store.updateArcFromClusters?.({
    arcId: activeArcId.value,
    width: guideArc.width,
    height: guideArc.height,
    unit: guideArc.unit,
    sizeIn: guideArc.sizeIn,
    clusterCount: guideArc.clusterCount,
    baseClusterCount: guideArc.baseClusterCount,
    respectHeight: guideArc.respectHeight,
  })
}

function getGuideTopViewContext() {
  const nodes = guideSelectedGroupNodes.value
  if (!nodes.length) return null
  let sumX = 0
  let sumY = 0
  let maxRadius = 0
  let minLeft = Infinity
  let maxRight = -Infinity
  for (const node of nodes) {
    sumX += Number(node?.x || 0)
    sumY += Number(node?.y || 0)
    const scaleX = Math.abs(Number(node?.scaleX ?? 1)) || 1
    const scaleY = Math.abs(Number(node?.scaleY ?? 1)) || 1
    const rx = Number(node?.meta?.radiusX || 0) * scaleX
    const ry = Number(node?.meta?.radiusY || 0) * scaleY
    const radius = Math.max(rx, ry)
    maxRadius = Math.max(maxRadius, radius)
    minLeft = Math.min(minLeft, Number(node?.x || 0) - radius)
    maxRight = Math.max(maxRight, Number(node?.x || 0) + radius)
  }
  const count = nodes.length || 1
  let centerX = sumX / count
  if (Number.isFinite(minLeft) && Number.isFinite(maxRight)) {
    centerX = (minLeft + maxRight) / 2
  }
  return {
    centerX,
    centerY: sumY / count,
    maxRadius: maxRadius || 1,
  }
}

function startGuideTopViewDrag() {
  store.beginHistoryBatch()
  const ctx = getGuideTopViewContext()
  if (!ctx) return
  guideTopViewDrag.active = true
  guideTopViewDrag.centerX = ctx.centerX
  guideTopViewDrag.centerY = ctx.centerY
  guideTopViewDrag.maxRadius = ctx.maxRadius
}

function updateGuideTopView({ id, x, y } = {}) {
  if (!id) return
  const node = (store.nodes || []).find((n) => String(n.id) === String(id))
  if (!node) return
  const ctx = guideTopViewDrag.active ? guideTopViewDrag : getGuideTopViewContext()
  const nextX = clampNumber(Number(x), -TOP_VIEW_RANGE, TOP_VIEW_RANGE)
  const nextY = clampNumber(Number(y), -TOP_VIEW_RANGE, TOP_VIEW_RANGE)
  const scale = Math.max(1, Number(ctx?.maxRadius || 1))
  const centerX = Number.isFinite(Number(ctx?.centerX)) ? Number(ctx.centerX) : Number(node.x || 0)
  let targetX = centerX + nextX * scale
  let targetY = Number(node.y || 0)
  const bounds = guideWallPx.value
  if (bounds) {
    const rx = Math.max(1, Number(node?.meta?.radiusX || 0))
    const ry = Math.max(1, Number(node?.meta?.radiusY || 0))
    const minX = rx
    const maxX = Math.max(minX, bounds.width - rx)
    targetX = clampNumber(targetX, minX, maxX)
  }
  store.updateNodes({
    [node.id]: {
      x: targetX,
      y: targetY,
      meta: {
        ...(node.meta && typeof node.meta === 'object' ? node.meta : {}),
        topView: { x: nextX, y: nextY },
      },
    },
  })
}

function endGuideTopViewDrag() {
  store.endHistoryBatch()
  guideTopViewDrag.active = false
}

function updateGuideScale(value) {
  const targets = guideSelectionTargets.value
  if (!targets.length) return
  const next = Number(value)
  store.beginHistoryBatch()
  try {
    for (const node of targets) {
      const rx = Number(node?.meta?.radiusX ?? 46)
      const ry = Number(node?.meta?.radiusY ?? 60)
      const maxPx = guideMaxRadiusPx.value
      const base = Math.max(rx, ry) || 1
      const maxScale = maxPx ? Math.max(0.2, maxPx / base) : 4
      const clamped = clampNumber(next, 0.2, Math.min(4, maxScale))
      store.updateNode(node.id, { scaleX: clamped, scaleY: clamped })
    }
  } finally {
    store.endHistoryBatch()
  }
}

function updateGuideColor(value) {
  clearGuidePreview('color')
  const color = String(value || '').trim()
  if (!color) return
  guideTools.color = color
  const targets = guideSelectionTargets.value
  if (!targets.length) return
  const patchById = {}
  for (const node of targets) {
    patchById[node.id] = { color }
  }
  store.updateNodes(patchById)
}

function updateGuideAlpha(value) {
  clearGuidePreview('alpha')
  const next = clampNumber(Number(value), 0, 100)
  guideTools.alpha = next
  const targets = guideSelectionTargets.value
  if (!targets.length) return
  const patchById = {}
  for (const node of targets) {
    patchById[node.id] = {
      meta: {
        ...(node.meta && typeof node.meta === 'object' ? node.meta : {}),
        guideAlpha: next,
      },
    }
  }
  store.updateNodes(patchById)
}

function updateGuideFill(value) {
  clearGuidePreview('fill')
  const next = clampNumber(Number(value), 0, 100)
  const targets = guideSelectionTargets.value
  if (!targets.length) return
  const patchById = {}
  for (const node of targets) {
    patchById[node.id] = {
      meta: {
        ...(node.meta && typeof node.meta === 'object' ? node.meta : {}),
        guideFillAlpha: next,
      },
    }
  }
  store.updateNodes(patchById)
}

function updateGuideFillColor(value) {
  clearGuidePreview('fillColor')
  const color = String(value || '').trim()
  if (!color) return
  addGuideFillPaletteColor(color)
  const targets = guideSelectionTargets.value
  if (!targets.length) return
  const patchById = {}
  for (const node of targets) {
    patchById[node.id] = {
      meta: {
        ...(node.meta && typeof node.meta === 'object' ? node.meta : {}),
        guideFillColor: color,
      },
    }
  }
  store.updateNodes(patchById)
}

function previewGuideColor(value) {
  scheduleGuidePreview('color', value)
}

function previewGuideAlpha(value) {
  scheduleGuidePreview('alpha', value)
}

function previewGuideFill(value) {
  scheduleGuidePreview('fill', value)
}

function previewGuideFillColor(value) {
  scheduleGuidePreview('fillColor', value)
}

function applyGuideFillPalette(color) {
  updateGuideFillColor(color)
}

function scheduleGuidePreview(type, value) {
  guidePreviewPending[type] = value
  if (guidePreviewTimers[type]) return
  guidePreviewTimers[type] = window.setTimeout(() => {
    guidePreviewTimers[type] = null
    if (type === 'color') {
      applyGuideColorPreview(guidePreviewPending.color)
    } else if (type === 'alpha') {
      applyGuideAlphaPreview(guidePreviewPending.alpha)
    } else if (type === 'fill') {
      applyGuideFillPreview(guidePreviewPending.fill)
    } else if (type === 'fillColor') {
      applyGuideFillColorPreview(guidePreviewPending.fillColor)
    }
  }, 200)
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

function addGuideFillPaletteColor(value) {
  const color = normalizePaletteColor(value)
  if (!color) return
  const current = Array.isArray(guideFillPalette.value) ? guideFillPalette.value : []
  const next = [color, ...current.filter((c) => normalizePaletteColor(c) !== color)].slice(0, 18)
  guideFillPalette.value = next
  saveGuideFillPalette(next)
}

function clearGuidePreview(type) {
  if (guidePreviewTimers[type]) {
    clearTimeout(guidePreviewTimers[type])
    guidePreviewTimers[type] = null
  }
  guidePreviewPending[type] = null
}

function applyGuideColorPreview(value) {
  const color = String(value || '').trim()
  if (!color) return
  const targets = guideSelectionTargets.value
  if (!targets.length) return
  const patchById = {}
  for (const node of targets) {
    patchById[node.id] = { color }
  }
  applyGuidePreviewPatch(patchById)
}

function applyGuideAlphaPreview(value) {
  const next = clampNumber(Number(value), 0, 100)
  const targets = guideSelectionTargets.value
  if (!targets.length) return
  const patchById = {}
  for (const node of targets) {
    patchById[node.id] = {
      meta: {
        ...(node.meta && typeof node.meta === 'object' ? node.meta : {}),
        guideAlpha: next,
      },
    }
  }
  applyGuidePreviewPatch(patchById)
}

function applyGuideFillPreview(value) {
  const next = clampNumber(Number(value), 0, 100)
  const targets = guideSelectionTargets.value
  if (!targets.length) return
  const patchById = {}
  for (const node of targets) {
    patchById[node.id] = {
      meta: {
        ...(node.meta && typeof node.meta === 'object' ? node.meta : {}),
        guideFillAlpha: next,
      },
    }
  }
  applyGuidePreviewPatch(patchById)
}

function applyGuideFillColorPreview(value) {
  const color = String(value || '').trim()
  if (!color) return
  const targets = guideSelectionTargets.value
  if (!targets.length) return
  const patchById = {}
  for (const node of targets) {
    patchById[node.id] = {
      meta: {
        ...(node.meta && typeof node.meta === 'object' ? node.meta : {}),
        guideFillColor: color,
      },
    }
  }
  applyGuidePreviewPatch(patchById)
}

function applyGuidePreviewPatch(patchById) {
  if (!patchById || !Object.keys(patchById).length) return
  const prevLock = store.history?.lock
  if (store.history) store.history.lock = true
  try {
    store.updateNodes(patchById)
  } finally {
    if (store.history) store.history.lock = prevLock
  }
}

function toggleGuidePropsUnit() {
  guidePropsUnitAuto.value = false
  guidePropsUnit.value = guidePropsUnit.value === 'in' ? 'cm' : 'in'
}

onMounted(() => {
  projects.init()
  loadGuideTemplates()
  const activeProject = projects.activeProject

  if (activeProject) {
    const hasData = activeProject.data && Array.isArray(activeProject.data.nodes)
    if (hasData) {
      store.restoreFromPayload(activeProject.data, { silent: true })
    } else if (activeProject.template?.type === 'arc') {
      store.resetDesignState({ clearAutosave: true })
      if (typeof catalog.init === 'function') catalog.init()
      const firstType = (catalog.types || [])[0] || null
      const typeId = firstType?.id || 'round-11'
      const metaDefaults = firstType?.default || null
      const params = activeProject.template?.params || {}
      const colors = String(params.colors || '')
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean)

      store.addArcTemplate({
        width: Number(params.width || 520),
        height: Number(params.height || 260),
        count: Number(params.count || 32),
        radius: Number(params.radius || 22),
        rows: Number(params.rows || 2),
        spacing: Number(params.spacing || 4),
        colorMode: params.colorMode || 'sequence',
        colors,
        typeId,
        metaDefaults,
        name: 'Arco',
      })

      projects.updateProjectData(activeProject.id, store.serializeDesign())
    } else {
      store.resetDesignState({ clearAutosave: true })
      projects.updateProjectData(activeProject.id, store.serializeDesign())
    }

    store.initAutosave({ skipRestore: true })
  } else {
    store.initAutosave()
  }
  if (activeProject?.template?.type === 'guide-wall') {
    const guideConfig = buildGuideWallConfig(activeProject.template?.params || {})
    store.setGuideWall(guideConfig)
    store.setCanvasDimensions({ widthCm: guideConfig.widthCm, heightCm: guideConfig.heightCm })
    syncGuideToolDefaults(guideConfig)
  }
  ensureGuideWallForCanvas()
  syncGuideArcDefaults(store.ui?.guideWall || guideWall.value)
  wrap.value?.focus?.()
  window.addEventListener('keydown', onKeyDown)
  guidePropsUnit.value = guideRadiusUnit.value || 'cm'
})

watch(
  guideRadiusUnit,
  (value) => {
    if (!guidePropsUnitAuto.value) return
    guidePropsUnit.value = value || 'cm'
  },
  { immediate: true },
)
watch(
  guideWall,
  (value) => {
    if (activeArcId.value) return
    syncGuideArcDefaults(value)
  },
  { immediate: true },
)

watch(
  guideMode,
  (enabled) => {
    if (!enabled) return
    leftTab.value = 'guide'
    activeTab.value = 'guide'
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  store.destroyAutosave()
  window.removeEventListener('keydown', onKeyDown)
})

watch(
  () => store.autosave.lastSavedAt,
  (value) => {
    if (!value) return
    const activeProject = projects.activeProject
    if (!activeProject) return
    projects.updateProjectData(activeProject.id, store.serializeDesign())
  },
)

function clampNumber(value, min, max) {
  const n = Number(value)
  if (!Number.isFinite(n)) return min
  return Math.min(max, Math.max(min, n))
}

function toCm(value, unit) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  return unit === 'in' ? n * 2.54 : n
}

function cmToUnit(cm, unit) {
  if (!Number.isFinite(cm)) return 0
  return unit === 'in' ? cm / 2.54 : cm
}

function unitToPx(value, unit) {
  return toCm(value, unit) * PX_PER_CM
}

function pxToUnit(px, unit) {
  const cm = Number(px || 0) / PX_PER_CM
  return cmToUnit(cm, unit)
}

function roundToUnit(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  return Math.round(n * 100) / 100
}

function resolveCircleSizeIn(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return GUIDE_TOOL_SIZE_OPTIONS[0]
  let best = GUIDE_TOOL_SIZE_OPTIONS[0]
  let bestDiff = Math.abs(n - best)
  for (const opt of GUIDE_TOOL_SIZE_OPTIONS) {
    const diff = Math.abs(n - opt)
    if (diff < bestDiff) {
      best = opt
      bestDiff = diff
    }
  }
  return best
}

function formatBoth(value, unit) {
  const n = Number(value)
  if (!Number.isFinite(n)) return ''
  if (unit === 'in') {
    const cm = roundToUnit(n * 2.54)
    return `${roundToUnit(n)} in · ${cm} cm`
  }
  const inch = roundToUnit(n / 2.54)
  return `${roundToUnit(n)} cm · ${inch} in`
}

function formatUnitLabel(value, unit) {
  const n = Number(value)
  if (!Number.isFinite(n)) return ''
  const suffix = unit === 'in' ? 'in' : 'cm'
  return `${roundToUnit(n)} ${suffix}`
}

function formatTemplateDate(ts) {
  const value = Number(ts || 0)
  if (!value) return ''
  try {
    return new Intl.DateTimeFormat('es-ES', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(value)
  } catch {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ''
    return date.toLocaleString('es-ES')
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

function ensureGuideLineNodes() {
  const nodes = store.nodes || []
  for (const node of nodes) {
    if (node?.kind !== 'balloon') continue
    if (node?.meta?.guideLine) continue
    store.updateNodeMeta(node.id, {
      guideLine: true,
      guideLineDash: true,
      guideLineWidth: 2,
      knot: false,
      guide: false,
    })
  }
}

function buildGuideWallConfig(params) {
  const wall = params?.wall || {}
  const maxRadius = params?.maxRadius || {}
  const wallUnit = wall.unit === 'in' ? 'in' : 'cm'
  const radiusUnit = maxRadius.unit === 'in' ? 'in' : 'cm'
  const widthCm = toCm(Number(wall.width || 300), wallUnit)
  const heightCm = toCm(Number(wall.height || 200), wallUnit)
  const maxRadiusCm = toCm(Number(maxRadius.value || 12), radiusUnit)
  return {
    widthCm: Math.max(10, widthCm),
    heightCm: Math.max(10, heightCm),
    maxRadiusCm: Math.max(1, maxRadiusCm),
    wallUnit,
    radiusUnit,
    enabled: true,
  }
}

function ensureGuideConfigAfterImport() {
  if (store.ui?.guideWall) return
  const activeProject = projects.activeProject
  if (!activeProject?.template?.type || activeProject.template.type !== 'guide-wall') return
  const guideConfig = buildGuideWallConfig(activeProject.template?.params || {})
  store.setGuideWall(guideConfig)
  store.setCanvasDimensions({ widthCm: guideConfig.widthCm, heightCm: guideConfig.heightCm })
  syncGuideToolDefaults(guideConfig)
}

function ensureGuideWallForCanvas() {
  const current = store.ui?.guideWall
  if (current && typeof current === 'object') {
    if (current.enabled === false) {
      store.setGuideWall({ ...current, enabled: true })
    }
    return
  }

  const widthCm = Number(store.canvas?.widthCm || 0)
  const heightCm = Number(store.canvas?.heightCm || 0)
  if (!Number.isFinite(widthCm) || !Number.isFinite(heightCm)) return
  if (widthCm <= 0 || heightCm <= 0) return

  const maxRadiusCm = Math.max(1, Math.min(widthCm, heightCm) / 2)
  store.setGuideWall({
    widthCm,
    heightCm,
    maxRadiusCm,
    wallUnit: 'cm',
    radiusUnit: 'cm',
    enabled: true,
  })
}

function syncGuideToolDefaults(config) {
  if (!config) return
  const maxRadiusIn = cmToUnit(config.maxRadiusCm, GUIDE_TOOL_UNIT)
  const radiusIn = roundToUnit(Math.max(1, maxRadiusIn * 0.6))
  const sizeIn = roundToUnit(Math.max(2, radiusIn * 2))
  const resolvedSize = resolveCircleSizeIn(sizeIn)
  guideTools.circleR = resolvedSize
  guideTools.ovalW = roundToUnit(Math.max(2, (resolvedSize / 2) * 2))
  guideTools.ovalH = roundToUnit(Math.max(2, (resolvedSize / 2) * 1.4))
}

function syncGuideArcDefaults(config) {
  if (!config || guideArcTouched.value) return
  const unit = config.wallUnit === 'in' ? 'in' : 'cm'
  const width = roundToUnit(cmToUnit(config.widthCm, unit))
  const height = roundToUnit(cmToUnit(Math.max(10, config.heightCm * 0.6), unit))
  guideArc.unit = unit
  guideArc.width = width
  guideArc.height = height
  guideArc.clusterCount = null
  guideArc.baseClusterCount = null
  guideArc.baseClusterAuto = 0
  guideArc.respectHeight = false
}

function addGuideCircle() {
  const maxPx = guideMaxRadiusPx.value || 320 * PX_PER_CM
  const r = clampNumber(
    unitToPx(guideTools.circleR / 2, GUIDE_TOOL_UNIT),
    unitToPx(0.5, GUIDE_TOOL_UNIT),
    maxPx,
  )
  store.addNode({
    x: 220,
    y: 180,
    color: String(guideTools.color || '#e0e0e0'),
    typeId: 'round-11',
    meta: {
      radiusX: r,
      radiusY: r,
      knot: false,
      shape: 'ellipse',
      guideLine: true,
      guideAlpha: clampNumber(guideTools.alpha, 0, 100),
      guide: false,
      guideLineDash: guideTools.lineStyle === 'dashed',
      guideLineWidth: clampNumber(guideTools.lineWidth, 1, 10),
    },
    name: 'Guia',
  })
}

function addGuideOval() {
  const maxPx = guideMaxRadiusPx.value || 320 * PX_PER_CM
  const w = clampNumber(
    unitToPx(guideTools.ovalW, GUIDE_TOOL_UNIT),
    unitToPx(1, GUIDE_TOOL_UNIT),
    maxPx * 2,
  )
  const h = clampNumber(
    unitToPx(guideTools.ovalH, GUIDE_TOOL_UNIT),
    unitToPx(1, GUIDE_TOOL_UNIT),
    maxPx * 2,
  )
  store.addNode({
    x: 220,
    y: 180,
    color: String(guideTools.color || '#e0e0e0'),
    typeId: 'round-11',
    meta: {
      radiusX: w / 2,
      radiusY: h / 2,
      knot: false,
      shape: 'ellipse',
      guideLine: true,
      guideAlpha: clampNumber(guideTools.alpha, 0, 100),
      guide: false,
      guideLineDash: guideTools.lineStyle === 'dashed',
      guideLineWidth: clampNumber(guideTools.lineWidth, 1, 10),
    },
    name: 'Guia',
  })
}

function exportGuideJson() {
  if (!guideMode.value) return
  const name = String(projects.activeProject?.name || '').trim() || 'guia'
  const fileName = promptFileName(name, 'json')
  if (!fileName) return
  store.exportGuideJson({ fileName, visibleOnly: guideExportVisibleOnly.value })
}

function exportGuideJsonAll() {
  if (!guideMode.value) return
  const name = String(projects.activeProject?.name || '').trim() || 'guia'
  const fileName = promptFileName(name, 'json')
  if (!fileName) return
  store.exportGuideJson({ fileName, visibleOnly: false })
}

function exportGuideJsonVisible() {
  if (!guideMode.value) return
  const name = String(projects.activeProject?.name || '').trim() || 'guia'
  const fileName = promptFileName(name, 'json')
  if (!fileName) return
  store.exportGuideJson({ fileName, visibleOnly: true })
}

function exportJson() {
  const name = String(projects.activeProject?.name || '').trim() || 'diseno'
  const fileName = promptFileName(name, 'json')
  if (!fileName) return false
  store.exportJson({ fileName })
  return true
}

async function onImportGuideFile(e) {
  const file = e.target.files?.[0] || null
  e.target.value = ''
  if (!file) return

  try {
    const text = await file.text()
    const data = JSON.parse(text)
    const ok = store.importGuideJsonObject(data)
    if (ok) window.alert('Guia importada correctamente.')
  } catch {
    window.alert('No se pudo importar la guia. Verifica que el JSON sea válido.')
  }
}

async function onImportJsonFile(e) {
  const file = e.target.files?.[0] || null
  e.target.value = ''
  if (!file) return

  try {
    const text = await file.text()
    const data = JSON.parse(text)
    const ok = store.importJsonObject(data)
    if (ok) {
      if (guideMode.value) {
        ensureGuideConfigAfterImport()
        ensureGuideLineNodes()
      }
    }
  } catch {
    window.alert('No se pudo importar el JSON. Verifica que el archivo sea válido.')
  }
}

function newGuideFile() {
  store.resetDesignState({ clearAutosave: true })
  const activeProject = projects.activeProject
  if (activeProject?.template?.type === 'guide-wall') {
    const guideConfig = buildGuideWallConfig(activeProject.template?.params || {})
    store.setGuideWall(guideConfig)
    store.setCanvasDimensions({ widthCm: guideConfig.widthCm, heightCm: guideConfig.heightCm })
    syncGuideToolDefaults(guideConfig)
  }
  resetGuideRowsDefaults()
  ensureGuideLineNodes()
  store.resetView?.()
  if (activeProject) {
    projects.updateProjectData(activeProject.id, store.serializeDesign())
    store.markSaved?.()
  }
}

function confirmExitAndSave() {
  const exitOk = window.confirm('¿Deseas salir del proyecto actual?')
  if (!exitOk) return false
  const saveOk = window.confirm('¿Deseas guardar los cambios?')
  if (saveOk) {
    const saved = saveProject()
    if (!saved) return false
  }
  return true
}

function handleNewGuide() {
  if (!confirmExitAndSave()) return
  newGuideFile()
}

function handleSaveProject() {
  saveProject()
}

function handleSaveProjectAs() {
  saveProjectAs()
}

function handleImportJsonFile(e) {
  if (!confirmExitAndSave()) {
    if (e?.target) e.target.value = ''
    return
  }
  onImportJsonFile(e)
}

function handleImportGuideFile(e) {
  if (!confirmExitAndSave()) {
    if (e?.target) e.target.value = ''
    return
  }
  onImportGuideFile(e)
}

function handleImportGuideTemplateFile(e) {
  if (!confirmExitAndSave()) {
    if (e?.target) e.target.value = ''
    return
  }
  onImportGuideTemplateFile(e)
}

function handleGoHome() {
  const hasUnsaved = !!store.autosave?.isDirty
  if (hasUnsaved) {
    const saveOk = window.confirm('¿Deseas guardar los cambios antes de salir?')
    if (saveOk) {
      const saved = saveProject()
      if (!saved) return
    }
  }
  goHome()
}

function buildGuideTemplateForSave() {
  const activeProject = projects.activeProject
  if (activeProject?.template) return activeProject.template
  const wall = store.ui?.guideWall
  if (!wall) return { type: 'guide-wall', params: {} }
  return {
    type: 'guide-wall',
    params: {
      wall: {
        width: Number(wall.widthCm || 0),
        height: Number(wall.heightCm || 0),
        unit: wall.wallUnit || 'cm',
      },
      maxRadius: {
        value: Number(wall.maxRadiusCm || 0),
        unit: wall.radiusUnit || 'cm',
      },
    },
  }
}

function saveProject() {
  const payload = store.serializeDesign()
  const activeProject = projects.activeProject
  if (!activeProject) return saveProjectAs()
  projects.saveProjectSnapshot(activeProject.id, payload)
  store.markSaved?.()
  return true
}

function saveProjectAs() {
  const activeProject = projects.activeProject
  const baseName = String(activeProject?.name || 'Guia').trim() || 'Guia'
  const input = window.prompt('Nombre del proyecto:', baseName)
  if (input === null) return false
  const name = String(input || '').trim() || baseName
  const payload = store.serializeDesign()
  const template = buildGuideTemplateForSave()
  projects.saveProjectAs({ name, template, data: payload })
  store.markSaved?.()
  return true
}

function goHome() {
  router.push('/')
}

function loadGuideTemplates() {
  try {
    const raw = localStorage.getItem(GUIDE_TEMPLATES_KEY)
    if (!raw) {
      guideTemplates.value = []
      return
    }
    const parsed = JSON.parse(raw)
    guideTemplates.value = Array.isArray(parsed) ? parsed : []
  } catch {
    guideTemplates.value = []
  }
}

function persistGuideTemplates() {
  try {
    localStorage.setItem(GUIDE_TEMPLATES_KEY, JSON.stringify(guideTemplates.value))
  } catch {
    // ignore
  }
}

function guideTemplateUid() {
  return `gtpl_${Math.random().toString(36).slice(2, 10)}`
}

function saveGuideTemplate() {
  if (!guideMode.value) return
  const name = String(guideTemplateName.value || '').trim()
  if (!name) return
  const description = String(guideTemplateDescription.value || '').trim()

  const payload = store.buildGuideJsonPayload({ visibleOnly: false })
  if (!payload) return
  payload.templateName = name
  payload.name = name
  if (description) {
    payload.templateDescription = description
    payload.description = description
  }

  const next = [...guideTemplates.value]
  const existing = next.find((t) => String(t.name || '').toLowerCase() === name.toLowerCase())
  if (existing) {
    const ok = window.confirm('Ya existe una plantilla con este nombre. ¿Reemplazarla?')
    if (!ok) return
    existing.payload = payload
    existing.description = description
    existing.updatedAt = Date.now()
    selectedGuideTemplateId.value = existing.id
  } else {
    const entry = {
      id: guideTemplateUid(),
      name,
      description,
      payload,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    next.unshift(entry)
    guideTemplates.value = next
    selectedGuideTemplateId.value = entry.id
  }
  guideTemplateName.value = ''
  guideTemplateDescription.value = ''
  persistGuideTemplates()
}

function applyGuideTemplate() {
  if (!selectedGuideTemplateId.value) return
  const tpl = guideTemplates.value.find(
    (t) => String(t.id) === String(selectedGuideTemplateId.value),
  )
  if (!tpl?.payload) return

  const ok = store.restoreFromPayload(tpl.payload, { silent: true })
  if (!ok) return
  if (tpl.payload?.guideWall) {
    store.setGuideWall(tpl.payload.guideWall)
  } else {
    ensureGuideConfigAfterImport()
  }
  ensureGuideLineNodes()
  store.resetView?.()
}

function removeGuideTemplate() {
  if (!selectedGuideTemplateId.value) return
  const tpl = guideTemplates.value.find(
    (t) => String(t.id) === String(selectedGuideTemplateId.value),
  )
  if (!tpl) return
  const ok = window.confirm(`¿Eliminar la plantilla "${tpl.name}"?`)
  if (!ok) return
  guideTemplates.value = guideTemplates.value.filter((t) => String(t.id) !== String(tpl.id))
  selectedGuideTemplateId.value = ''
  persistGuideTemplates()
}

function exportGuideTemplate() {
  if (!selectedGuideTemplateId.value) return
  const tpl = guideTemplates.value.find(
    (t) => String(t.id) === String(selectedGuideTemplateId.value),
  )
  if (!tpl?.payload) return
  const promptName = prompt('Nombre de la plantilla:', tpl.name || 'plantilla')
  if (promptName === null) return
  const baseName = String(promptName || '').trim() || String(tpl.name || 'plantilla').trim()
  const fileName = `${baseName}.json`
  const description = String(tpl.description || tpl.payload?.templateDescription || '').trim()
  const payload = {
    ...tpl.payload,
    templateName: baseName,
    name: baseName,
    templateDescription: description,
    description,
  }
  store.exportJson({ fileName, payload })
}

async function onImportGuideTemplateFile(e) {
  const file = e.target.files?.[0] || null
  e.target.value = ''
  if (!file) return

  try {
    const text = await file.text()
    const data = JSON.parse(text)
    if (!data || !Array.isArray(data.nodes)) {
      window.alert('Archivo inválido: no contiene nodos.')
      return
    }

    const name = String(
      data.name || data.templateName || file.name.replace(/\.json$/i, '') || '',
    ).trim()
    if (!name) {
      window.alert('La plantilla necesita un nombre.')
      return
    }

    const description = String(data.templateDescription || data.description || '').trim()
    const entry = {
      id: guideTemplateUid(),
      name,
      description,
      payload: data,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    const next = [...guideTemplates.value]
    const existing = next.find((t) => String(t.name || '').toLowerCase() === name.toLowerCase())
    if (existing) {
      const ok = window.confirm('Ya existe una plantilla con este nombre. ¿Reemplazarla?')
      if (!ok) return
      existing.payload = data
      existing.description = description
      existing.updatedAt = Date.now()
      selectedGuideTemplateId.value = existing.id
    } else {
      next.unshift(entry)
      guideTemplates.value = next
      selectedGuideTemplateId.value = entry.id
    }

    persistGuideTemplates()
  } catch {
    window.alert('No se pudo importar la plantilla. Verifica que el JSON sea válido.')
  }
}

function isTypingTarget(e) {
  const tag = (e.target?.tagName || '').toLowerCase()
  return tag === 'input' || tag === 'textarea' || tag === 'select' || e.target?.isContentEditable
}

function onKeyDown(e) {
  if (e?._guideHandled) return
  if (e) e._guideHandled = true
  if (isTypingTarget(e)) return
  const key = e.key.toLowerCase()
  const isCmd = e.metaKey || e.ctrlKey

  if (isCmd && key === 's') {
    e.preventDefault()
    saveProject()
    return
  }

  if (key === 'escape') {
    if (store.ui?.groupEditMode) {
      store.setGroupEditMode({ enabled: false })
      return
    }
    store.clearSelection()
    return
  }

  if (key === 'enter' && !isTypingTarget(e)) {
    if (!store.ui?.groupEditMode) {
      const groupId = store.selectedGroupId || store.selectedNode?.groupId
      if (groupId) store.setGroupEditMode({ enabled: true, groupId })
    }
    return
  }

  if ((key === 'delete' || key === 'backspace') && !isTypingTarget(e)) {
    if ((store.selectedNodes?.length || 0) > 0) store.deleteSelected()
    return
  }

  if (isCmd && key === 'd') {
    e.preventDefault()
    if (store.ui?.symbolEdit?.active) {
      store.duplicateSymbolSelection?.({ offset: 18 })
    } else {
      store.duplicateSelected()
    }
    return
  }

  if (isTypingTarget(e)) return

  const step = e.shiftKey ? 10 : 1

  // Mover todos los seleccionados
  if (key === 'arrowleft') {
    e.preventDefault()
    nudgeSelection(-step, 0)
    return
  }
  if (key === 'arrowright') {
    e.preventDefault()
    nudgeSelection(step, 0)
    return
  }
  if (key === 'arrowup') {
    e.preventDefault()
    nudgeSelection(0, -step)
    return
  }
  if (key === 'arrowdown') {
    e.preventDefault()
    nudgeSelection(0, step)
    return
  }
  // Undo / Redo (pro)
  if (isCmd && key === 'z' && !e.shiftKey) {
    e.preventDefault()
    store.undo()
    return
  }

  if (isCmd && key === 'z' && e.shiftKey) {
    e.preventDefault()
    store.redo()
    return
  }

  // Ctrl+Y (Windows) redo
  if ((e.ctrlKey && key === 'y') || (isCmd && key === 'y')) {
    e.preventDefault()
    store.redo()
    return
  }

  if (isCmd && e.shiftKey && key === 'f') {
    e.preventDefault()
    store.fillGuides?.({ removeGuides: !!store.ui?.guideRemoveOnFill })
    return
  }

  if (isCmd && e.shiftKey && key === 'g') {
    e.preventDefault()
    store.convertGuidesToBalloons?.()
    return
  }

  if (isCmd && e.shiftKey && key === 'a') {
    e.preventDefault()
    store.startGuideBoxMode?.({ action: 'fill', removeGuides: !!store.ui?.guideRemoveOnFill })
    return
  }

  if (isCmd && e.shiftKey && key === 'c') {
    e.preventDefault()
    store.startGuideBoxMode?.({
      action: 'convert',
      removeGuides: !!store.ui?.guideRemoveOnFill,
    })
    return
  }
}

function nudgeSelection(dx, dy) {
  const selected = store.selectedNodes || []
  if (!selected.length) return

  const snapOn = !!store.settings?.snap
  const s = Number(store.settings?.snapStep || 1)

  for (const n of selected) {
    if (!n || n.locked) continue

    let nextX = Number(n.x || 0) + dx
    let nextY = Number(n.y || 0) + dy

    if (snapOn) {
      nextX = snap(nextX, s)
      nextY = snap(nextY, s)
    }

    if (guideMode.value && n?.meta?.guideLine && guideWallPx.value) {
      const clamped = clampGuidePosition(n, nextX, nextY)
      nextX = clamped.x
      nextY = clamped.y
    }

    store.updateNode(n.id, { x: nextX, y: nextY })
  }
}

function snap(v, step) {
  const s = Number(step) || 1
  return Math.round(v / s) * s
}

function clampGuidePosition(node, x, y) {
  if (!guideWallPx.value) return { x, y }
  const rx = Number(node?.meta?.radiusX ?? 46) * Number(node?.scaleX ?? 1)
  const ry = Number(node?.meta?.radiusY ?? 60) * Number(node?.scaleY ?? 1)
  const minX = rx
  const minY = ry
  const maxX = Math.max(minX, guideWallPx.value.width - rx)
  const maxY = Math.max(minY, guideWallPx.value.height - ry)
  return {
    x: Math.min(maxX, Math.max(minX, x)),
    y: Math.min(maxY, Math.max(minY, y)),
  }
}
</script>

<style lang="less" scoped>
.grid {
  display: grid;
  grid-template-columns: 300px 1fr 320px;
  gap: 12px;
  height: calc(100vh - 56px - 24px);
  outline: none;
  align-items: stretch;
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
}

:deep(.panel-title) {
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1.1;
}

:deep(.panel-content) {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

:deep(.panel-footer) {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
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

.center {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
  flex: 1 1 auto;
  height: 100%;
}

.center-tabs {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  background: #f5f7fb;
  border-radius: 14px;
  padding: 6px;
}

.center-body {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1 1 auto;
  height: 100%;
}

.center-pane {
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1 1 auto;
  min-height: 0;
  height: 100%;
}

.row-edit-pane {
  min-height: 720px;
}

.center-canvas {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  height: 100%;
}

.center-canvas :deep(.canvas) {
  flex: 1 1 auto;
  min-height: 0;
  height: 100%;
}

.center-canvas :deep(.card-body) {
  height: 100%;
}

.center-canvas :deep(.stage-wrap) {
  height: 100%;
}

.left {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
}

.right {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
}

.right-tabs {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  background: #f5f7fb;
  border-radius: 14px;
  padding: 6px;
}

.tab-btn {
  border: none;
  background: transparent;
  border-radius: 10px;
  padding: 6px 8px;
  font-size: 0.75rem;
  font-weight: 600;
  color: #5c6370;
}

.tab-btn.active {
  background: #12a4b7;
  color: #fff;
  box-shadow: 0 6px 12px -10px rgba(18, 164, 183, 0.6);
}

.right-panels {
  overflow: auto;
  min-height: 0;
  display: block;
}

.panel-stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.left-tabs {
  display: grid;
  grid-template-columns: repeat(1, 1fr);
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
</style>
