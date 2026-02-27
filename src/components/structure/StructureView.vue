<template>
  <EditorLayout>
    <template #topbar>
      <StructureToolbar
        @go-home="goHome"
        @new-structure="newStructureDoc"
        @save-project="handleSaveProject"
        @save-project-as="handleSaveProjectAs"
        @import-guide="onImportGuideFile"
        @import-json="onImportJsonFile"
        @export-png="exportPng"
        @export-jpg="exportJpg"
        @export-json="exportJson"
        :dirty="!!store.autosave?.isDirty"
      />
    </template>

    <div class="structure-grid" @keydown="onKeyDown" tabindex="0" ref="wrap">
      <div class="structure-left">
        <div class="panel-stack">
          <div class="card border-0 shadow-sm panel-card canvas-settings">
            <div class="card-body">
              <div class="fw-bold">Catálogo</div>
              <div class="text-muted panel-subtitle">Elige el globo y color para pintar.</div>
              <div v-if="guideWallSummary" class="text-muted panel-subtitle mt-1">
                {{ guideWallSummary }}
              </div>

              <div class="mt-3">
                <label class="form-label xsmall">Familia</label>
                <select v-model="selectedFamily" class="form-select form-select-sm">
                  <option v-for="family in families" :key="family" :value="family">
                    {{ family }}
                  </option>
                </select>
              </div>

              <div class="mt-3">
                <label class="form-label xsmall">Tipo de globo</label>
                <div class="type-list">
                  <button
                    v-for="t in categoryTypes"
                    :key="t.id"
                    type="button"
                    class="type-item"
                    :class="{ active: selectedTypeId === t.id }"
                    @click="selectType(t)"
                  >
                    <div class="type-item__title">{{ t.name }}</div>
                    <div class="type-item__meta text-muted xsmall">{{ sizeLabel(t) }}</div>
                  </button>
                </div>
                <div v-if="!categoryTypes.length" class="text-muted small">
                  Sin tipos disponibles.
                </div>
              </div>

              <div class="mt-3">
                <label class="form-label xsmall">Color</label>
                <div class="color-row">
                  <button
                    v-for="color in selectedTypeColors"
                    :key="color"
                    type="button"
                    class="color-dot"
                    :class="{ active: selectedColor === color }"
                    :style="{ backgroundColor: color }"
                    @click="selectColor(color)"
                  ></button>
                  <span v-if="!selectedTypeColors.length" class="text-muted xsmall"
                    >Sin paleta</span
                  >
                </div>
                <input
                  v-model.trim="selectedColor"
                  class="form-control form-control-sm mt-2"
                  type="text"
                  placeholder="#ff3b30"
                />
              </div>

              <div class="mt-3">
                <button
                  class="btn btn-sm btn-primary w-100"
                  type="button"
                  :disabled="!selectedTypeId || selectedPaintCount === 0"
                  @click="applySelectionPaint"
                >
                  Aplicar a selección
                </button>
                <div class="text-muted xsmall mt-1">Seleccionadas: {{ selectedPaintCount }}</div>
              </div>

              <div class="text-muted xsmall mt-3">
                Tip: selecciona una guía y luego aplica el tipo/color.
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="structure-center">
        <CanvasStage />
        <CanvasControls />
      </div>

      <div class="structure-right">
        <div class="right-tabs">
          <button
            class="tab-btn"
            type="button"
            :class="{ active: rightTab === 'props' }"
            @click="rightTab = 'props'"
          >
            Propiedades
          </button>
          <button
            class="tab-btn"
            type="button"
            :class="{ active: rightTab === 'canvas' }"
            @click="rightTab = 'canvas'"
          >
            Canvas
          </button>
        </div>

        <div class="right-panels">
          <div v-show="rightTab === 'props'" class="panel-stack">
            <div class="card border-0 shadow-sm panel-card canvas-settings">
              <div class="card-body">
                <div class="fw-bold">Propiedades</div>
                <div class="text-muted panel-subtitle">Globo seleccionado.</div>

                <div v-if="selectedPaintCount" class="mt-3">
                  <div class="summary-row">
                    <div class="summary-label">Seleccionadas</div>
                    <div class="summary-value">{{ selectedPaintCount }}</div>
                  </div>
                  <div class="summary-row">
                    <div class="summary-label">Tipo</div>
                    <div class="summary-value">
                      {{ selectionTypeId ? selectedBalloonType?.name || selectionTypeId : 'Mixto' }}
                    </div>
                  </div>
                  <div class="summary-row">
                    <div class="summary-label">Color</div>
                    <div class="summary-value">
                      <span
                        v-if="selectionColor"
                        class="color-dot small"
                        :style="{ backgroundColor: selectionColor }"
                      ></span>
                      {{ selectionColor || 'Mixto' }}
                    </div>
                  </div>

                  <div class="mt-3">
                    <label class="form-label xsmall">Tipo</label>
                    <select
                      class="form-select form-select-sm"
                      :value="selectionTypeId"
                      @change="onSelectionTypeChange($event)"
                    >
                      <option value="">Mixto</option>
                      <optgroup v-for="cat in categories" :key="cat.family" :label="cat.family">
                        <option v-for="t in cat.types" :key="t.id" :value="t.id">
                          {{ t.name }}
                        </option>
                      </optgroup>
                    </select>
                  </div>

                  <div class="mt-3">
                    <label class="form-label xsmall">Color</label>
                    <div class="color-row">
                      <button
                        v-for="color in paletteColors"
                        :key="color"
                        type="button"
                        class="color-dot"
                        :class="{ active: selectionColorInput === color }"
                        :style="{ backgroundColor: color }"
                        @click="applySelectionColor(color)"
                      ></button>
                      <span v-if="!paletteColors.length" class="text-muted xsmall">Sin paleta</span>
                    </div>
                    <input
                      v-model.trim="selectionColorInput"
                      class="form-control form-control-sm mt-2"
                      type="text"
                      placeholder="#ff3b30"
                      @change="applySelectionColor(selectionColorInput)"
                    />
                  </div>

                  <div class="mt-3">
                    <label class="form-label xsmall">Opacidad</label>
                    <input
                      class="form-range"
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.05"
                      :value="selectionOpacityInput"
                      @input="onOpacityInput($event)"
                    />
                    <div class="text-muted xsmall">
                      {{ Math.round(selectionOpacityInput * 100) }}%
                    </div>
                  </div>

                  <div class="mt-3">
                    <div class="form-check">
                      <input
                        class="form-check-input"
                        type="checkbox"
                        :checked="selectionVisibleState === true"
                        @change="onVisibleToggle($event)"
                      />
                      <label class="form-check-label small">
                        Visible
                        <span v-if="selectionVisibleState === null" class="text-muted xsmall">
                          (mixto)
                        </span>
                      </label>
                    </div>
                    <div class="form-check mt-2">
                      <input
                        class="form-check-input"
                        type="checkbox"
                        :checked="selectionLockedState === true"
                        @change="onLockedToggle($event)"
                      />
                      <label class="form-check-label small">
                        Bloqueado
                        <span v-if="selectionLockedState === null" class="text-muted xsmall">
                          (mixto)
                        </span>
                      </label>
                    </div>
                  </div>

                  <div class="mt-3" v-if="inflationRange">
                    <label class="form-label xsmall">Inflado</label>
                    <input
                      class="form-range"
                      type="range"
                      :min="inflationRange.min"
                      :max="inflationRange.max"
                      step="0.01"
                      :value="inflationValue"
                      @input="onInflationInput($event)"
                    />
                    <div class="text-muted xsmall">
                      {{ Math.round(inflationValue * 100) }}% (min
                      {{ Math.round(inflationRange.min * 100) }}% - max
                      {{ Math.round(inflationRange.max * 100) }}%)
                    </div>
                  </div>
                </div>

                <div class="mt-3" v-else>
                  <div class="text-muted small">Selecciona un globo para editarlo.</div>
                </div>
              </div>
            </div>
          </div>

          <div v-show="rightTab === 'canvas'" class="panel-stack">
            <CanvasSettingsPanel />
          </div>
        </div>
      </div>
    </div>
  </EditorLayout>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useCatalogStore } from '@/stores/catalog.store'
import { provideEditorStore } from '@/stores/editor-context'
import { useStructureStore } from '@/stores/structure.store'
import { useProjectsStore } from '@/stores/projects.store'
import { PX_PER_CM } from '@/constants/canvas'
import EditorLayout from '@/layouts/EditorLayout.vue'
import StructureToolbar from '@/components/structure/StructureToolbar.vue'
import CanvasControls from '@/components/structure/CanvasControls.vue'
import CanvasStage from '@/components/structure/CanvasStage.vue'
import CanvasSettingsPanel from '@/components/structure/CanvasSettingsPanel.vue'

const store = useStructureStore()
provideEditorStore(store)
const projects = useProjectsStore()
const catalog = useCatalogStore()
const router = useRouter()
const wrap = ref(null)

const categories = computed(() => catalog.categories || [])
const families = computed(() => categories.value.map((category) => category.family))
const selectedFamily = ref('')
const selectedTypeId = ref('')
const selectedColor = ref('#ff3b30')

const selectedCategory = computed(() => {
  const list = categories.value || []
  if (!list.length) return null
  if (!selectedFamily.value) return list[0]
  return list.find((c) => c.family === selectedFamily.value) || list[0]
})

const categoryTypes = computed(() => selectedCategory.value?.types || [])
const selectedType = computed(() => catalog.typeById(selectedTypeId.value) || null)
const selectedTypeColors = computed(() => selectedType.value?.colors || [])
const selectedPaintTargets = computed(() =>
  (store.selectedNodes || []).filter((n) => n && n.kind === 'balloon' && !n?.meta?.guide),
)
const selectedPaintCount = computed(() => selectedPaintTargets.value.length)
const selectionTypeId = computed(() => commonString(selectedPaintTargets.value, (n) => n.typeId))
const selectionColor = computed(() => commonString(selectedPaintTargets.value, (n) => n.color))
const selectionLockedState = computed(() =>
  commonBool(selectedPaintTargets.value, (n) => !!n.locked),
)
const selectionVisibleState = computed(() =>
  commonBool(selectedPaintTargets.value, (n) => n.visible !== false),
)
const selectedBalloon = computed(() => {
  const node = store.selectedNode
  if (node && node.kind === 'balloon' && !node?.meta?.guide) return node
  const list = selectedPaintTargets.value
  return list.length ? list[list.length - 1] : null
})
const selectedBalloonType = computed(() =>
  selectedBalloon.value ? catalog.typeById(selectedBalloon.value.typeId) : null,
)
const paletteColors = computed(() => selectedBalloonType.value?.colors || [])

const inflationRange = computed(() => getInflationRange(selectedBalloonType.value))
const inflationValue = ref(1)
const selectionColorInput = ref('')
const selectionOpacityInput = ref(1)

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

const gridForced = ref(false)
const rightTab = ref('props')

onMounted(() => {
  projects.init()
  if (typeof catalog.init === 'function') catalog.init()
  if (!store.settings?.grid) {
    store.toggleGrid()
    gridForced.value = true
  }
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
    ensureGuideLineNodes()
  } else {
    store.setGuideWall(null)
  }

  ensureGuideWallForCanvas()

  wrap.value?.focus?.()
})

watch(
  () => [selectedBalloon.value, inflationRange.value],
  () => {
    if (!selectedBalloon.value || !inflationRange.value) {
      inflationValue.value = 1
      return
    }
    const meta = selectedBalloon.value.meta || {}
    const raw = Number(
      meta.inflationScale ?? selectedBalloon.value.scaleX ?? inflationRange.value.def,
    )
    inflationValue.value = clamp(raw, inflationRange.value.min, inflationRange.value.max)
  },
  { immediate: true },
)

watch(
  () => selectedPaintTargets.value,
  (list) => {
    if (!list.length) {
      selectionColorInput.value = ''
      selectionOpacityInput.value = 1
      return
    }
    selectionColorInput.value =
      selectionColor.value || String(list[list.length - 1]?.color || '#ff3b30')
    selectionOpacityInput.value = Number(list[list.length - 1]?.opacity ?? 1)
  },
  { immediate: true, deep: true },
)

watch(
  categories,
  (list) => {
    if (!selectedFamily.value && list?.length) selectedFamily.value = list[0].family
  },
  { immediate: true },
)

watch(
  categoryTypes,
  (list) => {
    if (!list?.length) return
    if (list.some((t) => t.id === selectedTypeId.value)) return
    selectedTypeId.value = list[0].id
  },
  { immediate: true },
)

watch(selectedType, (type) => {
  const colors = type?.colors || []
  if (!colors.length) return
  if (!selectedColor.value || !colors.includes(selectedColor.value)) {
    selectedColor.value = colors[0]
  }
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

onBeforeUnmount(() => {
  if (gridForced.value && store.settings?.grid) {
    store.toggleGrid()
  }
  store.destroyAutosave()
})

function ensureGuideLineNodes({ forceGuideLine = false } = {}) {
  const nodes = store.nodes || []
  for (const node of nodes) {
    if (node?.kind !== 'balloon') continue
    const metaPatch = { guideFixed: true, guide: false }
    const hasGuideLine = node?.meta?.guideLine === true
    const shouldEnableGuideLine = forceGuideLine || node?.meta?.guideLine === undefined
    if (shouldEnableGuideLine && !hasGuideLine) {
      metaPatch.guideLine = true
      metaPatch.guideLineDash = true
      metaPatch.guideLineWidth = 2
      metaPatch.knot = false
      metaPatch.guide = false
    }
    store.updateNodeMeta(node.id, metaPatch)
    if (node?.locked) store.updateNode(node.id, { locked: false })
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

function toCm(value, unit) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  return unit === 'in' ? n * 2.54 : n
}

function cmToUnit(cm, unit) {
  if (!Number.isFinite(cm)) return 0
  return unit === 'in' ? cm / 2.54 : cm
}

function roundToUnit(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  return Math.round(n * 100) / 100
}

function clamp(value, min, max) {
  const n = Number(value)
  if (!Number.isFinite(n)) return min
  return Math.min(max, Math.max(min, n))
}

function commonString(list, getter) {
  if (!list.length) return ''
  const first = String(getter(list[0]) || '')
  for (const item of list) {
    if (String(getter(item) || '') !== first) return ''
  }
  return first
}

function commonBool(list, getter) {
  if (!list.length) return false
  const first = !!getter(list[0])
  for (const item of list) {
    if (!!getter(item) !== first) return null
  }
  return first
}

function getInflationRange(type) {
  if (!type || !type.inflation) return null
  const inflation = type.inflation || {}
  const minScale = Number(inflation.minScale ?? 0.7)
  const maxScale = Number(inflation.maxScale ?? 1.0)
  const defScale = Number(inflation.defaultScale ?? 1.0)

  if (!Number.isFinite(minScale) || !Number.isFinite(maxScale)) return null

  return {
    min: Math.max(0.1, minScale),
    max: Math.max(minScale, maxScale),
    def: clamp(defScale, minScale, maxScale),
  }
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

function newStructureDoc() {
  const activeProject = projects.activeProject
  store.resetDesignState({ clearAutosave: true })
  if (activeProject?.template?.type === 'guide-wall') {
    const guideConfig = buildGuideWallConfig(activeProject.template?.params || {})
    store.setGuideWall(guideConfig)
    store.setCanvasDimensions({ widthCm: guideConfig.widthCm, heightCm: guideConfig.heightCm })
  } else {
    store.setGuideWall(null)
  }
  store.resetView()
  if (activeProject) {
    projects.updateProjectData(activeProject.id, store.serializeDesign())
    store.markSaved?.()
  }
}

function handleSaveProject() {
  saveProject()
}

function handleSaveProjectAs() {
  saveProjectAs()
}

function buildStructureTemplateForSave() {
  const activeProject = projects.activeProject
  if (activeProject?.template) return activeProject.template
  const wall = store.ui?.guideWall
  if (!wall) return null
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
  const baseName = String(activeProject?.name || 'Structure').trim() || 'Structure'
  const input = window.prompt('Nombre del proyecto:', baseName)
  if (input === null) return false
  const name = String(input || '').trim() || baseName
  const payload = store.serializeDesign()
  const template = buildStructureTemplateForSave()
  projects.saveProjectAs({ name, template, data: payload })
  store.markSaved?.()
  return true
}

function goHome() {
  router.push('/')
}

async function onImportGuideFile(e) {
  const file = e.target.files?.[0] || null
  e.target.value = ''
  if (!file) return

  try {
    const text = await file.text()
    const data = JSON.parse(text)
    const ok = store.importGuideJsonObject(data)
    if (ok) {
      ensureGuideLineNodes({ forceGuideLine: true })
      ensureGuideWallForCanvas()
      store.resetView()
      window.alert('Guía importada correctamente.')
    }
  } catch {
    window.alert('No se pudo importar la guía. Verifica que el JSON sea válido.')
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
      ensureGuideWallForCanvas()
      store.resetView()
    }
  } catch {
    window.alert('No se pudo importar el JSON. Verifica que sea válido.')
  }
}

function exportJson() {
  const name = prompt('Nombre del archivo JSON:', 'structure.json')
  if (name === null) return
  const fileName = (name || 'structure.json').trim() || 'structure.json'
  store.exportJson({ fileName })
}

function exportPng() {
  const name = prompt('Nombre del archivo PNG:', 'structure.png')
  if (name === null) return
  const raw = (name || 'structure.png').trim() || 'structure.png'
  const fileName = raw.endsWith('.png') ? raw : `${raw}.png`
  store.exportPng({ fileName, useDisplayScale: false })
}

function exportJpg() {
  const name = prompt('Nombre del archivo JPG:', 'structure.jpg')
  if (name === null) return
  const raw = (name || 'structure.jpg').trim() || 'structure.jpg'
  const lower = raw.toLowerCase()
  const fileName = lower.endsWith('.jpg') || lower.endsWith('.jpeg') ? raw : `${raw}.jpg`
  store.exportJpg({ fileName, useDisplayScale: false })
}

function selectType(type) {
  if (!type?.id) return
  selectedTypeId.value = type.id
  const colors = type?.colors || []
  if (colors.length) selectedColor.value = colors[0]
}

function selectColor(color) {
  selectedColor.value = color
}

function sizeLabel(type) {
  if (!type) return '—'
  if (Number.isFinite(type.sizeIn)) return `${type.sizeIn}"`
  if (Number.isFinite(type?.default?.radiusY)) return `${Math.round(type.default.radiusY)} px`
  return '—'
}

function applySelectionPaint() {
  if (!selectedTypeId.value) return
  if (store.ui?.symbolEdit?.active) return
  const type = catalog.typeById(selectedTypeId.value)
  if (!type) return

  const targets = selectedPaintTargets.value
  if (!targets.length) return

  const nextColor = selectedColor.value || '#ff3b30'

  store.beginHistoryBatch()
  try {
    for (const n of targets) {
      store.updateNode(n.id, { typeId: selectedTypeId.value, color: nextColor })
      store.updateNodeMeta(n.id, {
        guideLine: false,
        guideLineDash: false,
        guide: false,
      })
    }
  } finally {
    store.endHistoryBatch()
  }
}

function onSelectionTypeChange(e) {
  const id = String(e.target.value || '')
  if (!id) return
  applySelectionType(id)
}

function applySelectionType(typeId) {
  const type = catalog.typeById(typeId)
  if (!type) return
  const targets = selectedPaintTargets.value
  if (!targets.length) return

  store.beginHistoryBatch()
  try {
    const range = getInflationRange(type)
    for (const n of targets) {
      const patch = { typeId }
      if (range) {
        const raw = Number(n?.meta?.inflationScale ?? n.scaleX ?? range.def)
        const next = clamp(raw, range.min, range.max)
        patch.scaleX = next
        patch.scaleY = next
        store.updateNodeMeta(n.id, { inflationScale: next })
      }
      store.updateNode(n.id, patch)
    }
  } finally {
    store.endHistoryBatch()
  }
}

function applySelectionColor(color) {
  if (!color) return
  const targets = selectedPaintTargets.value
  if (!targets.length) return
  selectionColorInput.value = color
  store.beginHistoryBatch()
  try {
    for (const n of targets) {
      store.updateNode(n.id, { color })
    }
  } finally {
    store.endHistoryBatch()
  }
}

function onOpacityInput(e) {
  const next = clamp(Number(e.target.value || 1), 0.1, 1)
  selectionOpacityInput.value = next
  const targets = selectedPaintTargets.value
  if (!targets.length) return
  store.beginHistoryBatch()
  try {
    for (const n of targets) {
      store.updateNode(n.id, { opacity: next })
    }
  } finally {
    store.endHistoryBatch()
  }
}

function onVisibleToggle(e) {
  const next = !!e.target.checked
  const targets = selectedPaintTargets.value
  if (!targets.length) return
  store.beginHistoryBatch()
  try {
    for (const n of targets) {
      store.updateNode(n.id, { visible: next })
    }
  } finally {
    store.endHistoryBatch()
  }
}

function onLockedToggle(e) {
  const next = !!e.target.checked
  const targets = selectedPaintTargets.value
  if (!targets.length) return
  store.beginHistoryBatch()
  try {
    for (const n of targets) {
      store.updateNode(n.id, { locked: next })
    }
  } finally {
    store.endHistoryBatch()
  }
}

function onInflationInput(e) {
  if (!inflationRange.value) return
  const raw = Number(e.target.value || 1)
  const targets = selectedPaintTargets.value.length
    ? selectedPaintTargets.value
    : selectedBalloon.value
      ? [selectedBalloon.value]
      : []
  if (!targets.length) return

  store.beginHistoryBatch()
  try {
    for (const n of targets) {
      const range = getInflationRange(catalog.typeById(n.typeId))
      if (!range) continue
      const next = clamp(raw, range.min, range.max)
      inflationValue.value = next
      store.updateNode(n.id, { scaleX: next, scaleY: next })
      store.updateNodeMeta(n.id, { inflationScale: next })
    }
  } finally {
    store.endHistoryBatch()
  }
}

function isTypingTarget(e) {
  const tag = (e.target?.tagName || '').toLowerCase()
  return tag === 'input' || tag === 'textarea' || tag === 'select' || e.target?.isContentEditable
}

function onKeyDown(e) {
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
  }
}

function nudgeSelection(dx, dy) {
  const selected = store.selectedNodes || []
  if (!selected.length) return

  const snapOn = !!store.settings?.snap
  const s = Number(store.settings?.snapStep || 1)

  for (const n of selected) {
    if (!n || n.locked || n?.meta?.guideFixed) continue

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
.structure-grid {
  display: grid;
  grid-template-columns: 300px 1fr 320px;
  gap: 12px;
  height: calc(100vh - 56px - 24px);
  outline: none;
}

.structure-left {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
}

.structure-center {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
}

.structure-center :deep(.canvas) {
  flex: 1;
  min-height: 0;
}

.structure-right {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
}

.right-tabs {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  background: #f5f7fb;
  border-radius: 14px;
  padding: 6px;
}

.right-panels {
  min-height: 0;
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
}

.panel-stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: auto;
  min-height: 0;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 4px 0;
}

.summary-label {
  color: #6c757d;
  font-size: 0.8rem;
}

.summary-value {
  font-weight: 600;
  text-align: right;
}

.panel-card {
  border-radius: 16px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.canvas-settings {
  border-radius: 16px;
}

.panel-subtitle {
  font-size: 0.72rem;
}

.form-label {
  font-size: 0.7rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
}

.panel-card > .card-body {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.type-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 280px;
  overflow: auto;
}

.type-item {
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  background: #fff;
  padding: 8px 10px;
  text-align: left;
}

.type-item.active {
  border-color: rgba(13, 110, 253, 0.4);
  background: #f3f7ff;
}

.type-item__title {
  font-weight: 600;
}

.type-item__meta {
  margin-top: 2px;
}

.color-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  align-items: center;
}

.color-dot {
  width: 20px;
  height: 20px;
  border-radius: 999px;
  border: 2px solid transparent;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.08);
}

.color-dot.active {
  border-color: #0d6efd;
}

.color-dot.small {
  width: 14px;
  height: 14px;
  display: inline-block;
}
</style>
