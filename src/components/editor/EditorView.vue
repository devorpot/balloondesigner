<template>
  <EditorLayout>
    <template #topbar>
      <GuideToolbar
        v-if="guideMode"
        @go-home="goHome"
        @new-guide="newGuideFile"
        @export-guide="exportGuideJsonAll"
        @export-guide-visible="exportGuideJsonVisible"
        @import-json="onImportJsonFile"
        @export-json="exportJson"
      />
      <ToolbarTop v-else />
    </template>

    <div class="grid" @keydown="onKeyDown" tabindex="0" ref="wrap">
      <!-- Left column -->
      <div class="left">
        <div class="left-tabs">
          <button
            v-if="!guideMode"
            class="tab-btn"
            type="button"
            :class="{ active: leftTab === 'catalog' }"
            @click="leftTab = 'catalog'"
          >
            Catálogo
          </button>
          <button
            v-if="!guideMode"
            class="tab-btn"
            type="button"
            :class="{ active: leftTab === 'templates' }"
            @click="leftTab = 'templates'"
          >
            Plantillas
          </button>
          <button
            v-if="!guideMode"
            class="tab-btn"
            type="button"
            :class="{ active: leftTab === 'layers' }"
            @click="leftTab = 'layers'"
          >
            Capas
          </button>
          <button
            v-if="guideMode"
            class="tab-btn"
            type="button"
            :class="{ active: leftTab === 'guide' }"
            @click="leftTab = 'guide'"
          >
            Guia
          </button>
        </div>
        <div class="left-panels">
          <div v-show="leftTab === 'catalog' && !guideMode" class="panel-stack">
            <SidebarCatalogFamilies />
            <SidebarCatalog
              title="Catálogo (legacy)"
              subtitle="Vista anterior"
              legacyNote="Se mantiene para compatibilidad."
            />
          </div>
          <div v-show="leftTab === 'templates' && !guideMode" class="panel-stack">
            <SidebarTemplates />
          </div>
          <div v-show="leftTab === 'layers' && !guideMode" class="panel-stack">
            <SymbolsPanel />
            <LayerPanel />
          </div>
          <div v-show="leftTab === 'guide' && guideMode" class="panel-stack">
            <div class="card border-0 shadow-sm panel-card guide-panel">
              <div class="card-body">
                <div class="fw-bold"><i class="bi bi-bezier2 me-2"></i>Herramientas de guia</div>
                <div class="text-muted panel-subtitle">
                  Agrega circulos u ovalos y acomodalos manualmente.
                </div>
                <div v-if="guideWallSummary" class="text-muted panel-subtitle">
                  {{ guideWallSummary }}
                </div>

                <div class="mt-3">
                  <label class="form-label xsmall"
                    ><i class="bi bi-palette me-1"></i>Color de guia</label
                  >
                  <input
                    v-model.trim="guideTools.color"
                    class="form-control form-control-sm"
                    type="text"
                  />
                </div>

                <div class="mt-3 d-flex flex-wrap gap-2 align-items-end">
                  <button
                    class="btn btn-sm btn-outline-primary"
                    type="button"
                    @click="exportGuideJson"
                  >
                    <i class="bi bi-download me-1"></i>Exportar guia JSON
                  </button>
                  <label class="btn btn-sm btn-outline-secondary mb-0">
                    <i class="bi bi-upload me-1"></i>Importar guia JSON
                    <input
                      type="file"
                      accept="application/json"
                      class="d-none"
                      @change="onImportGuideFile"
                    />
                  </label>
                  <div class="form-check form-switch">
                    <input
                      id="guide-export-visible"
                      v-model="guideExportVisibleOnly"
                      class="form-check-input"
                      type="checkbox"
                    />
                    <label class="form-check-label" for="guide-export-visible">Solo visibles</label>
                  </div>
                </div>

                <div class="mt-3">
                  <div class="fw-semibold">Plantillas</div>
                  <div class="text-muted panel-subtitle">Guarda y reutiliza guias.</div>

                  <div class="mt-2">
                    <label class="form-label xsmall">Nombre</label>
                    <input
                      v-model.trim="guideTemplateName"
                      class="form-control form-control-sm"
                      type="text"
                      placeholder="Mi guia"
                    />
                  </div>
                  <div class="mt-2">
                    <label class="form-label xsmall">Descripción</label>
                    <textarea
                      v-model.trim="guideTemplateDescription"
                      class="form-control form-control-sm"
                      rows="2"
                      placeholder="Describe esta guia"
                    ></textarea>
                  </div>
                  <div class="mt-2 d-flex flex-wrap gap-2">
                    <button
                      class="btn btn-sm btn-outline-primary"
                      type="button"
                      @click="saveGuideTemplate"
                    >
                      Guardar plantilla
                    </button>
                    <label class="btn btn-sm btn-outline-secondary mb-0">
                      Importar plantilla
                      <input
                        type="file"
                        accept="application/json"
                        class="d-none"
                        @change="onImportGuideTemplateFile"
                      />
                    </label>
                    <button
                      class="btn btn-sm btn-outline-secondary"
                      type="button"
                      :disabled="!selectedGuideTemplateId"
                      @click="exportGuideTemplate"
                    >
                      Exportar plantilla
                    </button>
                  </div>

                  <div class="mt-3">
                    <label class="form-label xsmall">Plantillas guardadas</label>
                    <select v-model="selectedGuideTemplateId" class="form-select form-select-sm">
                      <option value="">Selecciona una plantilla</option>
                      <option v-for="tpl in guideTemplates" :key="tpl.id" :value="tpl.id">
                        {{ tpl.name }}
                      </option>
                    </select>
                    <div v-if="selectedGuideTemplateDescription" class="text-muted xsmall mt-1">
                      {{ selectedGuideTemplateDescription }}
                    </div>
                    <div v-if="selectedGuideTemplateMeta" class="text-muted xsmall mt-1">
                      {{ selectedGuideTemplateMeta }}
                    </div>
                  </div>
                  <div class="mt-2 d-flex gap-2">
                    <button
                      class="btn btn-sm btn-outline-secondary"
                      type="button"
                      :disabled="!selectedGuideTemplateId"
                      @click="applyGuideTemplate"
                    >
                      Cargar plantilla
                    </button>
                    <button
                      class="btn btn-sm btn-outline-danger"
                      type="button"
                      :disabled="!selectedGuideTemplateId"
                      @click="removeGuideTemplate"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>

                <div class="row g-2 mt-3">
                  <div class="col">
                    <label class="form-label small">
                      <i class="bi bi-pen me-1"></i>Grosor linea
                    </label>
                    <input
                      v-model.number="guideTools.lineWidth"
                      class="form-control form-control-sm"
                      type="number"
                      min="1"
                      max="10"
                    />
                  </div>
                  <div class="col">
                    <label class="form-label small">
                      <i class="bi bi-slash-square me-1"></i>Estilo
                    </label>
                    <select v-model="guideTools.lineStyle" class="form-select form-select-sm">
                      <option value="dashed">Punteada</option>
                      <option value="solid">Continua</option>
                    </select>
                  </div>
                </div>

                <div class="mt-3">
                  <div class="text-muted xsmall">Circulo</div>
                  <div class="row g-2 align-items-end">
                    <div class="col">
                      <label class="form-label small">
                        <i class="bi bi-arrows-angle-expand me-1"></i>Radio ({{ guideRadiusUnit }})
                      </label>
                      <input
                        v-model.number="guideTools.circleR"
                        class="form-control form-control-sm"
                        type="number"
                        min="0.5"
                        step="0.1"
                      />
                    </div>
                    <div class="col-auto">
                      <button
                        class="btn btn-sm btn-outline-secondary"
                        type="button"
                        @click="addGuideCircle"
                      >
                        <i class="bi bi-plus-circle me-1"></i>Agregar circulo
                      </button>
                    </div>
                  </div>
                </div>

                <div class="mt-3">
                  <div class="text-muted xsmall">Ovalo</div>
                  <div class="row g-2 align-items-end">
                    <div class="col">
                      <label class="form-label small">
                        <i class="bi bi-arrows-horizontal me-1"></i>Ancho ({{ guideRadiusUnit }})
                      </label>
                      <input
                        v-model.number="guideTools.ovalW"
                        class="form-control form-control-sm"
                        type="number"
                        min="1"
                        step="0.1"
                      />
                    </div>
                    <div class="col">
                      <label class="form-label small">
                        <i class="bi bi-arrows-vertical me-1"></i>Alto ({{ guideRadiusUnit }})
                      </label>
                      <input
                        v-model.number="guideTools.ovalH"
                        class="form-control form-control-sm"
                        type="number"
                        min="1"
                        step="0.1"
                      />
                    </div>
                    <div class="col-auto">
                      <button
                        class="btn btn-sm btn-outline-secondary"
                        type="button"
                        @click="addGuideOval"
                      >
                        <i class="bi bi-plus-circle me-1"></i>Agregar ovalo
                      </button>
                    </div>
                  </div>
                </div>

                <div class="mt-3">
                  <div class="text-muted xsmall"><i class="bi bi-layers me-1"></i>Apilado</div>
                  <div class="d-flex flex-wrap gap-2 mt-2">
                    <button
                      class="btn btn-sm btn-outline-secondary"
                      type="button"
                      @click="store.bringForwardSelected"
                    >
                      <i class="bi bi-layer-forward me-1"></i>Traer adelante
                    </button>
                    <button
                      class="btn btn-sm btn-outline-secondary"
                      type="button"
                      @click="store.sendBackwardSelected"
                    >
                      <i class="bi bi-layer-backward me-1"></i>Enviar atras
                    </button>
                    <button
                      class="btn btn-sm btn-outline-secondary"
                      type="button"
                      @click="store.bringToFrontSelected"
                    >
                      <i class="bi bi-front me-1"></i>Traer al frente
                    </button>
                    <button
                      class="btn btn-sm btn-outline-secondary"
                      type="button"
                      @click="store.sendToBackSelected"
                    >
                      <i class="bi bi-back me-1"></i>Enviar al fondo
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Center -->
      <div class="center">
        <CanvasStage />
        <CanvasControls />
      </div>

      <!-- Right column -->
      <div class="right">
        <div class="right-tabs">
          <button
            v-if="!guideMode"
            class="tab-btn"
            type="button"
            :class="{ active: activeTab === 'format' }"
            @click="activeTab = 'format'"
          >
            Formato
          </button>
          <button
            class="tab-btn"
            type="button"
            :class="{ active: activeTab === 'canvas' }"
            @click="activeTab = 'canvas'"
          >
            Canvas
          </button>
          <button
            v-if="!guideMode"
            class="tab-btn"
            type="button"
            :class="{ active: activeTab === 'calc' }"
            @click="activeTab = 'calc'"
          >
            Calculador
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
            v-if="guideMode"
            class="tab-btn"
            type="button"
            :class="{ active: activeTab === 'guide' }"
            @click="activeTab = 'guide'"
          >
            Guia
          </button>
        </div>

        <div class="right-panels">
          <div v-show="activeTab === 'format' && !guideMode" class="panel-stack">
            <PropertiesPanel />
            <AlignPanel v-if="store.selectedIds?.length" />
          </div>
          <div v-show="activeTab === 'canvas'" class="panel-stack">
            <CanvasSettingsPanel />
          </div>
          <div v-show="activeTab === 'calc' && !guideMode" class="panel-stack">
            <MaterialsPanel />
          </div>
          <div v-show="activeTab === 'history'" class="panel-stack">
            <HistoryPanel />
          </div>
          <div v-show="activeTab === 'guide' && guideMode" class="panel-stack">
            <div class="card border-0 shadow-sm panel-card guide-panel">
              <div class="card-body">
                <div class="fw-bold"><i class="bi bi-sliders me-2"></i>Propiedades de guia</div>
                <div class="text-muted panel-subtitle">Edita tamano y escala.</div>

                <div v-if="selectedGuide" class="mt-3">
                  <label class="form-label xsmall">
                    <i class="bi bi-arrows-angle-expand me-1"></i>Radio X ({{ guideRadiusUnit }})
                  </label>
                  <input
                    v-model.number="guideRadiusX"
                    class="form-control form-control-sm"
                    type="number"
                    min="0.5"
                    step="0.1"
                  />
                  <div class="text-muted xsmall mt-1">{{ guideRadiusXBoth }}</div>

                  <label class="form-label xsmall mt-3">
                    <i class="bi bi-arrows-angle-expand me-1"></i>Radio Y ({{ guideRadiusUnit }})
                  </label>
                  <input
                    v-model.number="guideRadiusY"
                    class="form-control form-control-sm"
                    type="number"
                    min="0.5"
                    step="0.1"
                  />
                  <div class="text-muted xsmall mt-1">{{ guideRadiusYBoth }}</div>

                  <label class="form-label xsmall mt-3">
                    <i class="bi bi-pen me-1"></i>Grosor linea
                  </label>
                  <input
                    v-model.number="guideLineWidth"
                    class="form-control form-control-sm"
                    type="number"
                    min="1"
                    max="10"
                  />

                  <label class="form-label xsmall mt-3">
                    <i class="bi bi-slash-square me-1"></i>Estilo linea
                  </label>
                  <select v-model="guideLineStyle" class="form-select form-select-sm">
                    <option value="dashed">Punteada</option>
                    <option value="solid">Continua</option>
                  </select>

                  <label class="form-label xsmall mt-3"
                    ><i class="bi bi-aspect-ratio me-1"></i>Escala</label
                  >
                  <input
                    v-model.number="guideScale"
                    class="form-control form-control-sm"
                    type="number"
                    step="0.05"
                    min="0.2"
                    max="4"
                  />
                </div>
                <div v-else class="text-muted small mt-3">Selecciona una guia.</div>
              </div>
            </div>
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
import { useActiveEditorStore } from '@/stores/editor-context'
import { useProjectsStore } from '@/stores/projects.store'
import { useCatalogStore } from '@/stores/catalog.store'
import { PX_PER_CM } from '@/constants/canvas'

import EditorLayout from '@/layouts/EditorLayout.vue'
import ToolbarTop from '@/components/editor/ToolbarTop.vue'
import GuideToolbar from '@/components/guide/GuideToolbar.vue'
import SidebarCatalog from '@/components/editor/SidebarCatalog.vue'
import SidebarCatalogFamilies from '@/components/editor/SidebarCatalogFamilies.vue'
import SidebarTemplates from '@/components/editor/SidebarTemplates.vue'
import CanvasStage from '@/components/editor/CanvasStage.vue'
import CanvasControls from '@/components/editor/CanvasControls.vue'
import SymbolsPanel from '@/components/editor/SymbolsPanel.vue'
import LayerPanel from '@/components/editor/LayerPanel.vue'
import PropertiesPanel from '@/components/editor/PropertiesPanel.vue'
import AlignPanel from '@/components/editor/AlignPanel.vue'
import CanvasSettingsPanel from '@/components/editor/CanvasSettingsPanel.vue'
import MaterialsPanel from '@/components/editor/MaterialsPanel.vue'
import HistoryPanel from '@/components/editor/HistoryPanel.vue'

const store = useActiveEditorStore()
const projects = useProjectsStore()
const catalog = useCatalogStore()
const router = useRouter()
const wrap = ref(null)
const activeTab = ref('format')
const leftTab = ref('catalog')
const guideTools = reactive({
  circleR: 36,
  ovalW: 90,
  ovalH: 60,
  color: '#424242',
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
const guideMode = computed(() => projects.activeProject?.template?.type === 'guide-wall')
const guideWall = computed(() => store.ui?.guideWall || null)
const guideWallUnit = computed(() => guideWall.value?.wallUnit || 'cm')
const guideRadiusUnit = computed(() => guideWall.value?.radiusUnit || 'cm')
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
const guideRadiusXBoth = computed(() => {
  if (!selectedGuide.value) return ''
  const px = Number(selectedGuide.value?.meta?.radiusX ?? 0)
  const cm = roundToUnit(pxToUnit(px, 'cm'))
  const inch = roundToUnit(pxToUnit(px, 'in'))
  return `${cm} cm · ${inch} in`
})
const guideRadiusYBoth = computed(() => {
  if (!selectedGuide.value) return ''
  const px = Number(selectedGuide.value?.meta?.radiusY ?? 0)
  const cm = roundToUnit(pxToUnit(px, 'cm'))
  const inch = roundToUnit(pxToUnit(px, 'in'))
  return `${cm} cm · ${inch} in`
})
const selectedGuide = computed(() => {
  const node = store.selectedNode
  if (!node || node.kind !== 'balloon') return null
  return node
})
const guideRadiusX = computed({
  get() {
    const px = Number(selectedGuide.value?.meta?.radiusX ?? 46)
    return roundToUnit(pxToUnit(px, guideRadiusUnit.value))
  },
  set(value) {
    if (!selectedGuide.value) return
    const px = unitToPx(value, guideRadiusUnit.value)
    const maxPx = guideMaxRadiusPx.value || 320 * PX_PER_CM
    const next = clampNumber(px, unitToPx(0.5, guideRadiusUnit.value), maxPx)
    store.updateNodeMeta(selectedGuide.value.id, { radiusX: next })
  },
})
const guideRadiusY = computed({
  get() {
    const px = Number(selectedGuide.value?.meta?.radiusY ?? 60)
    return roundToUnit(pxToUnit(px, guideRadiusUnit.value))
  },
  set(value) {
    if (!selectedGuide.value) return
    const px = unitToPx(value, guideRadiusUnit.value)
    const maxPx = guideMaxRadiusPx.value || 320 * PX_PER_CM
    const next = clampNumber(px, unitToPx(0.5, guideRadiusUnit.value), maxPx)
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
    ensureGuideLineNodes()
  } else {
    store.setGuideWall(null)
  }
  wrap.value?.focus?.()
})

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

function syncGuideToolDefaults(config) {
  if (!config) return
  const maxRadiusUnit = cmToUnit(config.maxRadiusCm, config.radiusUnit)
  const radius = roundToUnit(Math.max(1, maxRadiusUnit * 0.6))
  guideTools.circleR = radius
  guideTools.ovalW = roundToUnit(Math.max(2, radius * 2))
  guideTools.ovalH = roundToUnit(Math.max(2, radius * 1.4))
}

function addGuideCircle() {
  const maxPx = guideMaxRadiusPx.value || 320 * PX_PER_CM
  const r = clampNumber(
    unitToPx(guideTools.circleR, guideRadiusUnit.value),
    unitToPx(0.5, guideRadiusUnit.value),
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
    unitToPx(guideTools.ovalW, guideRadiusUnit.value),
    unitToPx(1, guideRadiusUnit.value),
    maxPx * 2,
  )
  const h = clampNumber(
    unitToPx(guideTools.ovalH, guideRadiusUnit.value),
    unitToPx(1, guideRadiusUnit.value),
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
  store.exportGuideJson({ fileName: `${name}.json`, visibleOnly: guideExportVisibleOnly.value })
}

function exportGuideJsonAll() {
  if (!guideMode.value) return
  const name = String(projects.activeProject?.name || '').trim() || 'guia'
  store.exportGuideJson({ fileName: `${name}.json`, visibleOnly: false })
}

function exportGuideJsonVisible() {
  if (!guideMode.value) return
  const name = String(projects.activeProject?.name || '').trim() || 'guia'
  store.exportGuideJson({ fileName: `${name}.json`, visibleOnly: true })
}

function exportJson() {
  const name = String(projects.activeProject?.name || '').trim() || 'diseno'
  store.exportJson({ fileName: `${name}.json` })
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
  ensureGuideLineNodes()
  store.resetView?.()
  if (activeProject) {
    projects.updateProjectData(activeProject.id, store.serializeDesign())
  }
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
  const key = e.key.toLowerCase()
  const isCmd = e.metaKey || e.ctrlKey

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
}

.guide-panel .panel-subtitle {
  font-size: 0.72rem;
}

.guide-panel .form-label {
  font-size: 0.7rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
  line-height: 1.1;
}

.guide-panel .btn-sm {
  font-size: 0.78rem;
  padding: 0.25rem 0.5rem;
  height: calc(1.5em + 0.5rem + 2px);
  line-height: 1.2;
}

.guide-panel .form-check-label {
  font-size: 0.7rem;
  line-height: 1.1;
}

.guide-panel .form-check-input {
  margin-top: 0.25rem;
}

.guide-panel .form-control-sm,
.guide-panel .form-select-sm {
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
  grid-template-columns: repeat(3, 1fr);
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
