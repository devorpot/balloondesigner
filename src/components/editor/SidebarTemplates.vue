<template>
  <div class="card border-0 shadow-sm templates-panel">
    <div class="card-body">
      <div class="head">
        <div class="d-flex align-items-start justify-content-between gap-2">
          <div class="minw0">
            <div class="fw-bold">Plantillas</div>
            <div class="text-muted panel-subtitle">Figuras predefinidas y guias</div>
          </div>
        </div>
      </div>

      <div class="templates">
        <div class="template-colors">
          <label class="form-label xsmall mb-1">Colores</label>
          <input
            v-model.trim="templateColorsText"
            class="form-control form-control-sm"
            type="text"
            placeholder="#ff3b30, #ffd166, #06d6a0"
          />
          <div class="template-colors__row">
            <select v-model="templateColorMode" class="form-select form-select-sm">
              <option value="solid">Un color</option>
              <option value="sequence">Secuencia</option>
              <option value="random">Aleatorio</option>
            </select>
            <button class="btn btn-sm btn-light" type="button" @click="useCurrentColor">
              Usar color actual
            </button>
          </div>
          <div class="template-palette">
            <span
              v-for="color in templateColors"
              :key="color"
              class="color-dot"
              :style="{ backgroundColor: color }"
            ></span>
            <span v-if="!templateColors.length" class="text-muted xsmall">Sin colores</span>
          </div>
        </div>

        <div class="template-card template-guide">
          <div class="d-flex align-items-center justify-content-between">
            <div class="fw-semibold">Guias</div>
            <span class="text-muted xsmall" v-if="!hasGuides">No hay guias</span>
          </div>
          <div class="template-guide__actions">
            <button
              class="btn btn-sm btn-light"
              type="button"
              :disabled="!hasGuides"
              @click="fillGuides"
            >
              Rellenar guia
            </button>
            <button
              class="btn btn-sm btn-light"
              type="button"
              :disabled="!hasGuides"
              @click="fillVisibleGuides"
            >
              Rellenar visibles
            </button>
            <button
              class="btn btn-sm btn-light"
              type="button"
              :disabled="!hasGuides"
              @click="convertGuides"
            >
              Convertir guia
            </button>
            <button class="btn btn-sm btn-light" type="button" @click="startGuideArea('fill')">
              Rellenar por area
            </button>
            <button class="btn btn-sm btn-light" type="button" @click="startGuideArea('convert')">
              Convertir por area
            </button>
          </div>
          <div v-if="guideBoxActive" class="template-guide__status">
            <span class="badge text-bg-warning">Modo area activo</span>
            <button class="btn btn-sm btn-outline-secondary" type="button" @click="cancelGuideArea">
              Cancelar
            </button>
          </div>
          <div class="form-check form-switch mt-2">
            <input
              id="guide-remove"
              v-model="guideRemoveOnFill"
              class="form-check-input"
              type="checkbox"
            />
            <label class="form-check-label xsmall" for="guide-remove">
              Eliminar guia al rellenar
            </label>
          </div>
          <div class="template-guide__filter">
            <div class="form-check form-switch">
              <input
                id="guide-color-filter"
                v-model="guideColorFilterEnabled"
                class="form-check-input"
                type="checkbox"
              />
              <label class="form-check-label xsmall" for="guide-color-filter">
                Filtrar por color
              </label>
            </div>
            <select
              v-model="guideColorFilterValue"
              class="form-select form-select-sm"
              :disabled="!guideColorFilterEnabled"
            >
              <option v-for="color in guideColorOptions" :key="color" :value="color">
                {{ color }}
              </option>
            </select>
          </div>
        </div>

        <div class="template-card">
          <div class="d-flex align-items-center justify-content-between">
            <div class="fw-semibold">Arco</div>
            <div class="d-flex align-items-center gap-2">
              <span class="text-muted xsmall">Color actual</span>
              <span class="color-dot" :style="{ backgroundColor: currentColor }"></span>
            </div>
          </div>

          <div class="arc-quick mt-2">
            <button class="btn btn-sm btn-primary w-100" type="button" @click="insertArcQuick">
              Insertar arco
            </button>
            <div class="text-muted xsmall mt-1">Usa el globo actual y el tamano del catalogo.</div>
          </div>

          <button
            class="btn btn-sm btn-light w-100 mt-2"
            type="button"
            @click="arcAdvanced = !arcAdvanced"
          >
            {{ arcAdvanced ? 'Ocultar opciones' : 'Opciones' }}
          </button>

          <div class="template-preview mt-2">
            <svg viewBox="0 0 140 90" width="140" height="90" aria-hidden="true">
              <circle
                v-for="(p, i) in arcPreview"
                :key="`arc-${i}`"
                :cx="p.x"
                :cy="p.y"
                :r="p.r"
                :fill="p.color"
                fill-opacity="0.35"
              />
            </svg>
          </div>

          <div class="row g-2 mt-2" v-show="arcAdvanced">
            <div class="col-6">
              <label class="form-label xsmall">Ancho</label>
              <input
                v-model.number="arc.width"
                type="number"
                min="120"
                step="10"
                class="form-control form-control-sm"
              />
            </div>
            <div class="col-6">
              <label class="form-label xsmall">Alto</label>
              <input
                v-model.number="arc.height"
                type="number"
                min="80"
                step="10"
                class="form-control form-control-sm"
              />
            </div>
            <div class="col-6">
              <label class="form-label xsmall">Globos</label>
              <input
                v-model.number="arc.count"
                type="number"
                min="3"
                step="1"
                class="form-control form-control-sm"
              />
            </div>
            <div class="col-6">
              <label class="form-label xsmall">Filas</label>
              <input
                v-model.number="arc.rows"
                type="number"
                min="1"
                max="6"
                step="1"
                class="form-control form-control-sm"
              />
            </div>
            <div class="col-6">
              <label class="form-label xsmall">Radio</label>
              <input
                v-model.number="arc.radius"
                type="number"
                min="6"
                step="1"
                class="form-control form-control-sm"
              />
            </div>
            <div class="col-6">
              <label class="form-label xsmall">Separacion</label>
              <input
                v-model.number="arc.spacing"
                type="number"
                min="0"
                step="1"
                class="form-control form-control-sm"
              />
            </div>
            <div class="col-12">
              <label class="form-label xsmall">Tamano rapido</label>
              <div class="preset-row">
                <button class="btn btn-sm btn-light" type="button" @click="applyArcSizePreset('s')">
                  S
                </button>
                <button class="btn btn-sm btn-light" type="button" @click="applyArcSizePreset('m')">
                  M
                </button>
                <button class="btn btn-sm btn-light" type="button" @click="applyArcSizePreset('l')">
                  L
                </button>
                <button class="btn btn-sm btn-light" type="button" @click="fitArcToCanvas">
                  Ajustar
                </button>
              </div>
            </div>
            <div class="col-12">
              <label class="form-label xsmall">Globo</label>
              <select
                v-model="arc.typeId"
                class="form-select form-select-sm"
                @change="applyArcTypeDefaults"
              >
                <option v-for="t in catalogTypes" :key="t.id" :value="t.id">
                  {{ t.name }}
                </option>
              </select>
              <button
                class="btn btn-sm btn-light w-100 mt-2"
                type="button"
                @click="applyArcTypeDefaults"
              >
                Usar tamano del tipo
              </button>
              <div class="text-muted xsmall mt-1">
                El arco usa el mismo tamano que el globo del catalogo.
              </div>
            </div>
            <div class="col-12">
              <div class="form-check form-switch mt-1">
                <input
                  id="arc-group"
                  v-model="arc.group"
                  class="form-check-input"
                  type="checkbox"
                />
                <label class="form-check-label xsmall" for="arc-group"> Insertar agrupado </label>
              </div>
            </div>
            <div class="col-12">
              <div class="form-check form-switch">
                <input
                  id="arc-guide"
                  v-model="arc.guide"
                  class="form-check-input"
                  type="checkbox"
                />
                <label class="form-check-label xsmall" for="arc-guide">
                  Modo guia (fantasma)
                </label>
              </div>
            </div>
          </div>

          <button
            class="btn btn-sm btn-outline-primary w-100 mt-3"
            type="button"
            @click="insertArc"
            v-show="arcAdvanced"
          >
            Insertar arco avanzado
          </button>

          <div class="preset-row mt-2" v-show="arcAdvanced">
            <button class="btn btn-sm btn-light" type="button" @click="insertArcPreset('front')">
              Arco frontal
            </button>
            <button class="btn btn-sm btn-light" type="button" @click="insertArcPreset('back')">
              Arco trasero
            </button>
          </div>

          <div class="preset-previews mt-2" v-show="arcAdvanced">
            <div class="preset-preview">
              <div class="text-muted xsmall">Front</div>
              <svg viewBox="0 0 140 70" width="140" height="70" aria-hidden="true">
                <circle
                  v-for="(p, i) in frontPreview"
                  :key="`front-${i}`"
                  :cx="p.x"
                  :cy="p.y"
                  :r="p.r"
                  :fill="p.color"
                  fill-opacity="0.35"
                />
              </svg>
            </div>
            <div class="preset-preview">
              <div class="text-muted xsmall">Back</div>
              <svg viewBox="0 0 140 70" width="140" height="70" aria-hidden="true">
                <circle
                  v-for="(p, i) in backPreview"
                  :key="`back-${i}`"
                  :cx="p.x"
                  :cy="p.y"
                  :r="p.r"
                  :fill="p.color"
                  fill-opacity="0.35"
                />
              </svg>
            </div>
          </div>
        </div>

        <div class="template-card" v-if="showCluster">
          <div class="d-flex align-items-center justify-content-between">
            <div class="fw-semibold">Cluster</div>
            <div class="d-flex align-items-center gap-2">
              <span class="text-muted xsmall">Color actual</span>
              <span class="color-dot" :style="{ backgroundColor: currentColor }"></span>
            </div>
          </div>

          <div class="template-preview mt-2">
            <svg viewBox="0 0 140 90" width="140" height="90" aria-hidden="true">
              <circle
                v-for="(p, i) in clusterPreview"
                :key="`cluster-${i}`"
                :cx="p.x"
                :cy="p.y"
                :r="p.r"
                :fill="p.color"
                fill-opacity="0.35"
              />
            </svg>
          </div>

          <div class="cluster-picker mt-2">
            <div class="d-flex align-items-center justify-content-between">
              <label class="form-label xsmall mb-0">Globos del cluster</label>
              <span v-if="clusterGroup" class="text-muted xsmall">
                {{ clusterGroupLabel }} · {{ clusterNodes.length }}
              </span>
              <span v-else class="text-muted xsmall">Selecciona un grupo</span>
            </div>
            <div v-if="clusterNodes.length" class="cluster-grid">
              <button
                v-for="node in clusterNodes"
                :key="node.id"
                type="button"
                class="cluster-dot"
                :class="{ active: node.id === activeClusterId }"
                @click="selectClusterNode(node)"
              >
                <span class="cluster-dot__balloon" :style="{ backgroundColor: node.color }"></span>
              </button>
            </div>
            <div v-else class="text-muted xsmall mt-1">
              Selecciona un grupo o un globo agrupado para editar.
            </div>
          </div>

          <div class="row g-2 mt-2">
            <div class="col-6">
              <label class="form-label xsmall">Columnas</label>
              <input
                v-model.number="cluster.cols"
                type="number"
                min="1"
                step="1"
                class="form-control form-control-sm"
              />
            </div>
            <div class="col-6">
              <label class="form-label xsmall">Filas</label>
              <input
                v-model.number="cluster.rows"
                type="number"
                min="1"
                step="1"
                class="form-control form-control-sm"
              />
            </div>
            <div class="col-6">
              <label class="form-label xsmall">Radio</label>
              <input
                v-model.number="cluster.radius"
                type="number"
                min="4"
                step="1"
                class="form-control form-control-sm"
              />
            </div>
            <div class="col-6">
              <label class="form-label xsmall">Gap interno</label>
              <input
                v-model.number="cluster.innerGap"
                type="number"
                min="0"
                step="1"
                class="form-control form-control-sm"
              />
            </div>
            <div class="col-12">
              <label class="form-label xsmall">Separacion clusters</label>
              <input
                v-model.number="cluster.clusterGap"
                type="number"
                min="0"
                step="1"
                class="form-control form-control-sm"
              />
            </div>
            <div class="col-12">
              <div class="form-check form-switch mt-1">
                <input
                  id="cluster-group"
                  v-model="cluster.group"
                  class="form-check-input"
                  type="checkbox"
                />
                <label class="form-check-label xsmall" for="cluster-group">
                  Insertar agrupado
                </label>
              </div>
            </div>
            <div class="col-12">
              <div class="form-check form-switch">
                <input
                  id="cluster-guide"
                  v-model="cluster.guide"
                  class="form-check-input"
                  type="checkbox"
                />
                <label class="form-check-label xsmall" for="cluster-guide">
                  Modo guia (fantasma)
                </label>
              </div>
            </div>
          </div>

          <button class="btn btn-sm btn-primary w-100 mt-3" type="button" @click="insertCluster">
            Insertar cluster
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useEditorStore } from '@/stores/editor.store'
import { useCatalogStore } from '@/stores/catalog.store'

const editor = useEditorStore()
const catalog = useCatalogStore()

const currentColor = computed(() => editor.selectedNode?.color || '#ff3b30')
const arc = ref({
  width: 520,
  height: 240,
  count: 32,
  rows: 2,
  radius: 22,
  spacing: 4,
  typeId: 'round-11',
  group: false,
  guide: false,
})
const arcAdvanced = ref(false)
const cluster = ref({
  cols: 6,
  rows: 4,
  radius: 10,
  innerGap: 2,
  clusterGap: 14,
  group: false,
  guide: false,
})
const templateColorsText = ref('')
const templateColorMode = ref('sequence')
const showCluster = ref(false)

const templateColors = computed(() => parseColorList(templateColorsText.value))
const arcPreview = computed(() => buildArcPreview(arc.value, 140, 90))
const catalogTypes = computed(() => catalog.types || [])
const arcType = computed(() => (arc.value.typeId ? catalog.typeById(arc.value.typeId) : null))
const frontPreview = computed(() => buildArcPreview(getArcPreset('front'), 140, 70))
const backPreview = computed(() => buildArcPreview(getArcPreset('back'), 140, 70))
const clusterPreview = computed(() => buildClusterPreview(cluster.value, 140, 90))
const hasGuides = computed(() => (editor.nodes || []).some((n) => n?.meta?.guide))
const activeClusterId = computed(() => editor.selectedId)
const clusterGroup = computed(() => {
  const groups = Array.isArray(editor.groups) ? editor.groups : []
  const groupId = editor.selectedGroupId || editor.selectedNode?.groupId
  if (!groupId) return null
  return groups.find((g) => String(g.id) === String(groupId)) || null
})
const clusterGroupLabel = computed(() => clusterGroup.value?.name || 'Cluster')
const clusterNodes = computed(() => {
  const group = clusterGroup.value
  if (!group || !Array.isArray(group.childIds)) return []
  const nodeById = new Map((editor.nodes || []).map((n) => [String(n.id), n]))
  return group.childIds.map((id) => nodeById.get(String(id))).filter((n) => n && !n?.meta?.guide)
})
const guideRemoveOnFill = computed({
  get: () => editor.ui?.guideRemoveOnFill ?? true,
  set: (value) => {
    if (editor.ui) editor.ui.guideRemoveOnFill = !!value
  },
})
const guideBoxActive = computed(() => !!editor.ui?.guideBoxMode?.active)
const guideColorFilterEnabled = ref(false)
const guideColorFilterValue = ref('')
const guideColorOptions = computed(() => {
  const list = [...new Set([...templateColors.value, currentColor.value])].filter(Boolean)
  return list.length ? list : [currentColor.value]
})

function parseColorList(value) {
  return String(value || '')
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean)
}

function resolveTemplateColors() {
  const list = templateColors.value
  return list.length ? list : [currentColor.value]
}

function defaultMetaForType(type) {
  const def = type?.default
  const meta = def && typeof def === 'object' ? { ...def } : {}
  if (type?.inflation?.defaultScale) {
    meta.inflationScale = type.inflation.defaultScale
  }
  return meta
}

function arcRadiusFromType(type) {
  if (!type?.default) return null
  const rx = Number(type.default.radiusX)
  const ry = Number(type.default.radiusY)
  if (Number.isFinite(rx) && Number.isFinite(ry)) return Math.max(rx, ry)
  if (Number.isFinite(rx)) return rx
  if (Number.isFinite(ry)) return ry
  return null
}

function applyArcTypeDefaults() {
  const type = arcType.value
  if (!type) return
  const radius = arcRadiusFromType(type)
  if (Number.isFinite(radius)) {
    arc.value = { ...arc.value, radius: Math.max(6, Math.round(radius)) }
  }
}

onMounted(() => {
  if (typeof catalog.init === 'function') catalog.init()
})

watch(
  catalogTypes,
  (types) => {
    if (!types?.length) return
    if (!arcType.value) {
      arc.value = { ...arc.value, typeId: types[0].id }
    }
    applyArcTypeDefaults()
  },
  { immediate: true },
)

watch(
  () => arc.value.typeId,
  () => {
    applyArcTypeDefaults()
  },
)

function useCurrentColor() {
  templateColorsText.value = currentColor.value
}

function selectClusterNode(node) {
  if (!node?.id) return
  editor.select(node.id, { append: false })
}

function getStageSize(stage) {
  try {
    const width = typeof stage.width === 'function' ? stage.width() : stage.width
    const height = typeof stage.height === 'function' ? stage.height() : stage.height
    return { w: Number(width || 0), h: Number(height || 0) }
  } catch {
    return { w: 0, h: 0 }
  }
}

function getCanvasSize() {
  const stage = editor.stage
  const view = editor.view || { x: 0, y: 0, scale: 1 }
  if (!stage) return null
  const { w, h } = getStageSize(stage)
  const displayScale = Number(editor.canvas?.displayScale || 1)
  const scale = Number(view.scale || 0) * displayScale
  if (!w || !h || !scale) return null
  return { w: w / scale, h: h / scale }
}

function getVisibleRect() {
  const stage = editor.stage
  const view = editor.view || { x: 0, y: 0, scale: 1 }
  if (!stage) return null
  const { w, h } = getStageSize(stage)
  const displayScale = Number(editor.canvas?.displayScale || 1)
  const scale = Number(view.scale || 0) * displayScale
  if (!w || !h || !scale) return null
  return {
    x: -(view.x * displayScale) / scale,
    y: -(view.y * displayScale) / scale,
    width: w / scale,
    height: h / scale,
  }
}

function getAddPoint({ center = false } = {}) {
  const stage = editor.stage
  const view = editor.view || { x: 0, y: 0, scale: 1 }

  if (center && stage) {
    const { w, h } = getStageSize(stage)
    const scale = Number(view.scale || 0)
    if (w > 0 && h > 0 && scale > 0) {
      return { x: (w / 2 - view.x) / scale, y: (h / 2 - view.y) / scale }
    }
  }

  return { x: 200, y: 200 }
}

function colorPicker(colors) {
  const palette = Array.isArray(colors) ? colors.filter(Boolean) : []
  const mode = templateColorMode.value
  let idx = 0
  return () => {
    if (!palette.length) return '#ff3b30'
    if (mode === 'random') return palette[Math.floor(Math.random() * palette.length)]
    if (mode === 'solid') return palette[0]
    const color = palette[idx % palette.length]
    idx += 1
    return color
  }
}

function normalizePoints(points, boxW, boxH, padding = 6) {
  if (!points.length) return { scale: 1, points: [] }
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const p of points) {
    minX = Math.min(minX, p.x)
    minY = Math.min(minY, p.y)
    maxX = Math.max(maxX, p.x)
    maxY = Math.max(maxY, p.y)
  }

  const w = Math.max(1, maxX - minX)
  const h = Math.max(1, maxY - minY)
  const scale = Math.min((boxW - padding * 2) / w, (boxH - padding * 2) / h)
  return {
    scale,
    points: points.map((p) => ({
      x: padding + (p.x - minX) * scale,
      y: padding + (p.y - minY) * scale,
    })),
  }
}

function buildArcPreview(config, boxW = 140, boxH = 90) {
  const cfg = config || arc.value
  const safeCount = Math.max(1, Math.round(Number(cfg.count) || 1))
  const safeRows = Math.max(1, Math.min(6, Math.round(Number(cfg.rows) || 1)))
  const safeWidth = Math.max(120, Math.round(Number(cfg.width) || 520))
  const safeHeight = Math.max(80, Math.round(Number(cfg.height) || 260))
  const safeRadius = Math.max(6, Math.round(Number(cfg.radius) || 22))
  const safeSpacing = Math.max(0, Math.round(Number(cfg.spacing) || 0))
  const baseCount = Math.floor(safeCount / safeRows)
  const extra = safeCount % safeRows
  const points = []

  for (let row = 0; row < safeRows; row += 1) {
    const rowCount = Math.max(1, baseCount + (row < extra ? 1 : 0))
    const inset = row * (safeRadius * 2 + safeSpacing)
    const a = Math.max(safeRadius * 2, safeWidth / 2 - inset)
    const b = Math.max(safeRadius * 2, safeHeight - inset)
    for (let i = 0; i < rowCount; i += 1) {
      const t = rowCount === 1 ? 0.5 : i / (rowCount - 1)
      const angle = Math.PI - t * Math.PI
      points.push({ x: a * Math.cos(angle), y: -b * Math.sin(angle) })
    }
  }

  const normalized = normalizePoints(points, boxW, boxH)
  const pick = colorPicker(resolveTemplateColors())
  const r = Math.max(2.5, Math.min(boxW, boxH) * 0.03, safeRadius * normalized.scale)
  return normalized.points.map((p) => ({ ...p, r, color: pick() }))
}

function buildClusterPreview(config, boxW = 140, boxH = 90) {
  const cfg = config || cluster.value
  const safeCols = Math.max(1, Math.min(6, Math.round(Number(cfg.cols) || 1)))
  const safeRows = Math.max(1, Math.min(4, Math.round(Number(cfg.rows) || 1)))
  const safeRadius = Math.max(4, Math.round(Number(cfg.radius) || 10))
  const offset = 6
  const step = 22
  const points = []

  for (let r = 0; r < safeRows; r += 1) {
    for (let c = 0; c < safeCols; c += 1) {
      const cx = c * step
      const cy = r * step
      points.push(
        { x: cx - offset, y: cy - offset },
        { x: cx + offset, y: cy - offset },
        { x: cx - offset, y: cy + offset },
        { x: cx + offset, y: cy + offset },
      )
    }
  }

  const normalized = normalizePoints(points, boxW, boxH)
  const pick = colorPicker(resolveTemplateColors())
  const r = Math.max(2.2, Math.min(boxW, boxH) * 0.025, safeRadius * normalized.scale)
  return normalized.points.map((p) => ({ ...p, r, color: pick() }))
}

function getArcPreset(kind) {
  const base = arc.value
  const presets = {
    front: {
      width: Math.max(200, Math.round(Number(base.width || 520) * 0.92)),
      height: Math.max(120, Math.round(Number(base.height || 240) * 0.88)),
      count: Math.max(6, Math.round(Number(base.count || 32) * 0.9)),
      rows: base.rows || 2,
      radius: Math.max(8, Math.round(Number(base.radius || 22) * 0.95)),
      spacing: base.spacing || 0,
      name: 'Arco frontal',
    },
    back: {
      width: Math.max(240, Math.round(Number(base.width || 520) * 1.06)),
      height: Math.max(140, Math.round(Number(base.height || 240) * 1.08)),
      count: Math.max(8, Math.round(Number(base.count || 32) * 1.08)),
      rows: base.rows || 2,
      radius: Math.max(8, Math.round(Number(base.radius || 22) * 1.05)),
      spacing: base.spacing || 0,
      name: 'Arco trasero',
    },
  }

  return presets[kind] || null
}

function applyArcSizePreset(size) {
  const canvas = getCanvasSize()
  const factor = size === 's' ? 0.55 : size === 'l' ? 0.95 : 0.75
  if (canvas) {
    const nextWidth = Math.max(200, Math.round(canvas.w * factor))
    const nextHeight = Math.max(140, Math.round(canvas.h * (factor * 0.6)))
    const baseRadius = Math.max(8, Math.round((arc.value.radius || 22) * factor))
    const estCount = Math.max(6, Math.round((nextWidth / (baseRadius * 1.3)) * arc.value.rows))
    arc.value = {
      ...arc.value,
      width: nextWidth,
      height: nextHeight,
      radius: baseRadius,
      count: estCount,
    }
    return
  }

  const scale = size === 's' ? 0.75 : size === 'l' ? 1.15 : 0.95
  arc.value = {
    ...arc.value,
    width: Math.max(120, Math.round(Number(arc.value.width || 520) * scale)),
    height: Math.max(80, Math.round(Number(arc.value.height || 240) * scale)),
    radius: Math.max(6, Math.round(Number(arc.value.radius || 22) * scale)),
    count: Math.max(6, Math.round(Number(arc.value.count || 32) * scale)),
  }
}

function fitArcToCanvas() {
  const canvas = getCanvasSize()
  if (!canvas) return
  const padding = 40
  const nextWidth = Math.max(200, Math.round((canvas.w - padding) * 0.9))
  const nextHeight = Math.max(140, Math.round((canvas.h - padding) * 0.62))
  const baseRadius = Math.max(8, Math.round(Math.min(nextWidth, nextHeight) * 0.04))
  const estCount = Math.max(8, Math.round((nextWidth / (baseRadius * 1.25)) * arc.value.rows))

  arc.value = {
    ...arc.value,
    width: nextWidth,
    height: nextHeight,
    radius: baseRadius,
    count: estCount,
  }
}

function insertArc() {
  if (typeof editor.addArcTemplate !== 'function') return
  const p = getAddPoint({ center: true })
  const height = Number(arc.value.height || 0)
  const baselineY = Number.isFinite(height) && height > 0 ? p.y + height / 2 : p.y
  const metaDefaults = arcType.value ? defaultMetaForType(arcType.value) : null

  editor.addArcTemplate({
    centerX: p.x,
    centerY: baselineY,
    width: arc.value.width,
    height: arc.value.height,
    count: arc.value.count,
    rows: arc.value.rows,
    radius: arc.value.radius,
    spacing: arc.value.spacing,
    typeId: arc.value.typeId,
    metaDefaults,
    colors: resolveTemplateColors(),
    colorMode: templateColorMode.value,
    group: arc.value.group,
    guide: arc.value.guide,
  })
}

function insertArcQuick() {
  if (typeof editor.addArcTemplate !== 'function') return
  const p = getAddPoint({ center: true })
  const type = arcType.value
  const radius = arcRadiusFromType(type) || arc.value.radius
  const baseWidth = Math.max(200, Math.round(Number(arc.value.width || 520)))
  const baseHeight = Math.max(140, Math.round(Number(arc.value.height || 240)))
  const metaDefaults = type ? defaultMetaForType(type) : null

  editor.addArcTemplate({
    centerX: p.x,
    centerY: p.y + baseHeight / 2,
    width: baseWidth,
    height: baseHeight,
    count: arc.value.count,
    rows: arc.value.rows,
    radius: radius,
    spacing: arc.value.spacing,
    typeId: arc.value.typeId,
    metaDefaults,
    colors: resolveTemplateColors(),
    colorMode: templateColorMode.value,
    group: true,
    guide: false,
  })
}

function insertArcPreset(kind) {
  if (typeof editor.addArcTemplate !== 'function') return
  const p = getAddPoint({ center: true })
  const preset = getArcPreset(kind)
  if (!preset) return
  const baselineY = p.y + preset.height / 2
  const metaDefaults = arcType.value ? defaultMetaForType(arcType.value) : null

  editor.addArcTemplate({
    centerX: p.x,
    centerY: baselineY,
    width: preset.width,
    height: preset.height,
    count: preset.count,
    rows: preset.rows,
    radius: preset.radius,
    spacing: preset.spacing,
    typeId: arc.value.typeId,
    metaDefaults,
    colors: resolveTemplateColors(),
    colorMode: templateColorMode.value,
    group: arc.value.group,
    guide: arc.value.guide,
    name: preset.name,
  })
}

function insertCluster() {
  if (typeof editor.addClusterTemplate !== 'function') return
  const p = getAddPoint({ center: true })

  editor.addClusterTemplate({
    centerX: p.x,
    centerY: p.y,
    cols: cluster.value.cols,
    rows: cluster.value.rows,
    radius: cluster.value.radius,
    innerGap: cluster.value.innerGap,
    clusterGap: cluster.value.clusterGap,
    colors: resolveTemplateColors(),
    colorMode: templateColorMode.value,
    group: cluster.value.group,
    guide: cluster.value.guide,
  })
}

function fillGuides() {
  if (typeof editor.fillGuides !== 'function') return
  editor.fillGuides({ removeGuides: guideRemoveOnFill.value })
}

function convertGuides() {
  if (typeof editor.convertGuidesToBalloons !== 'function') return
  editor.convertGuidesToBalloons()
}

function fillVisibleGuides() {
  if (typeof editor.fillGuidesInRect !== 'function') return
  const rect = getVisibleRect()
  if (!rect) return
  const color = guideColorFilterEnabled.value ? guideColorFilterValue.value : null
  editor.fillGuidesInRect(rect, { removeGuides: guideRemoveOnFill.value, color })
}

function startGuideArea(action) {
  if (typeof editor.startGuideBoxMode !== 'function') return
  editor.startGuideBoxMode({ action, removeGuides: guideRemoveOnFill.value })
}

function cancelGuideArea() {
  if (typeof editor.endGuideBoxMode !== 'function') return
  editor.endGuideBoxMode()
}
</script>

<style lang="less" scoped>
.templates-panel {
  border-radius: 16px;
}

.panel-subtitle {
  font-size: 0.72rem;
}

.head {
  position: sticky;
  top: 0;
  z-index: 2;
  background: #fff;
  padding-bottom: 10px;
}

.templates {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 12px;
}

.xsmall {
  font-size: 11px;
}

.template-colors {
  border: 1px dashed rgba(0, 0, 0, 0.12);
  border-radius: 14px;
  padding: 10px;
  background: #fbfbfc;
}

.template-colors__row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  margin-top: 8px;
}

.template-palette {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
}

.template-card {
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 16px;
  background: #fff;
  padding: 12px;
  box-shadow: 0 8px 20px -18px rgba(0, 0, 0, 0.45);
}

.template-guide {
  background: #fdfdfd;
}

.template-guide__actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 8px;
}

.template-guide__status {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.template-guide__filter {
  display: grid;
  grid-template-columns: 1fr;
  gap: 6px;
  margin-top: 10px;
}

.template-preview {
  display: flex;
  justify-content: center;
  align-items: center;
  border: 1px dashed rgba(0, 0, 0, 0.1);
  border-radius: 12px;
  background: #f7f8fa;
  padding: 6px;
}

.cluster-picker {
  border: 1px dashed rgba(0, 0, 0, 0.12);
  border-radius: 12px;
  padding: 8px;
  background: #fbfbfc;
}

.cluster-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(26px, 1fr));
  gap: 8px;
  margin-top: 8px;
}

.cluster-dot {
  width: 28px;
  height: 28px;
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  background: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.cluster-dot__balloon {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.cluster-dot.active {
  border-color: #0d6efd;
  box-shadow: 0 0 0 2px rgba(13, 110, 253, 0.2);
}

.preset-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(60px, 1fr));
  gap: 8px;
}

.preset-previews {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.preset-preview {
  border: 1px dashed rgba(0, 0, 0, 0.1);
  border-radius: 12px;
  background: #f7f8fa;
  padding: 6px;
  text-align: center;
}

.color-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.1);
}
</style>
