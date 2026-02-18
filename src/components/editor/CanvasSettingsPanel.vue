<template>
  <div class="card border-0 shadow-sm canvas-settings">
    <div class="card-body">
      <div class="d-flex align-items-start justify-content-between">
        <div>
          <div class="fw-bold">Canvas</div>
          <div class="text-muted panel-subtitle">Ajusta tamaño y desplazamiento</div>
        </div>
        <div v-if="!collapsed" class="d-flex gap-2">
          <button
            class="btn btn-sm btn-outline-secondary"
            type="button"
            @click="applyPerformancePreset"
          >
            Rendimiento
          </button>
        </div>
        <div class="d-flex gap-2">
          <button
            class="btn btn-sm btn-outline-secondary lock-btn"
            type="button"
            @click="toggleLock"
            :title="local.locked ? 'Liberar proporción' : 'Mantener proporción'"
          >
            <i class="bi" :class="lockIcon"></i>
          </button>
          <button
            class="btn btn-sm btn-outline-secondary lock-btn"
            type="button"
            @click="collapsed = !collapsed"
            :title="collapsed ? 'Expandir' : 'Contraer'"
          >
            <i class="bi" :class="collapsed ? 'bi-chevron-down' : 'bi-chevron-up'"></i>
          </button>
        </div>
      </div>

      <div v-show="!collapsed" class="row g-2 mt-3">
        <div class="col">
          <label class="form-label small">Ancho (cm)</label>
          <input
            type="number"
            class="form-control form-control-sm"
            step="0.01"
            min="1"
            v-model.number="local.widthCm"
            @blur="handleWidthBlur"
          />
        </div>
        <div class="col">
          <label class="form-label small">Alto (cm)</label>
          <input
            type="number"
            class="form-control form-control-sm"
            step="0.01"
            min="1"
            v-model.number="local.heightCm"
            @blur="handleHeightBlur"
          />
        </div>
      </div>

      <div v-show="!collapsed" class="row g-2 mt-3">
        <div class="col">
          <label class="form-label small">Desplazamiento X (cm)</label>
          <input
            type="number"
            class="form-control form-control-sm"
            step="0.1"
            v-model.number="local.offsetX"
          />
        </div>
        <div class="col">
          <label class="form-label small">Desplazamiento Y (cm)</label>
          <input
            type="number"
            class="form-control form-control-sm"
            step="0.1"
            v-model.number="local.offsetY"
          />
        </div>
      </div>

      <div v-show="!collapsed" class="row g-2 mt-3">
        <div class="col">
          <label class="form-label small">Escala visual</label>
          <input
            type="number"
            class="form-control form-control-sm"
            step="0.05"
            min="0.3"
            max="1.5"
            v-model.number="local.displayScale"
            @blur="commitDisplayScale"
          />
          <div class="text-muted panel-subtitle mt-1">No afecta materiales ni precios</div>
        </div>
      </div>

      <div v-show="!collapsed" class="row g-2 mt-3">
        <div class="col">
          <label class="form-label small">Calidad de render</label>
          <select
            v-model="local.renderQuality"
            class="form-select form-select-sm"
            @change="commitRenderQuality"
          >
            <option value="high">Alta</option>
            <option value="medium">Media</option>
            <option value="low">Baja</option>
          </select>
        </div>
      </div>

      <div v-show="!collapsed" class="row g-2 mt-3">
        <div class="col">
          <div class="fw-bold small">Apilado automatico</div>
          <div class="text-muted panel-subtitle">Auto-encaja globos nuevos</div>
          <div class="form-check form-switch mt-2">
            <input
              id="stack-grid"
              v-model="local.stackGridEnabled"
              class="form-check-input"
              type="checkbox"
              @change="commitStackGridEnabled"
            />
            <label class="form-check-label small" for="stack-grid">Activar apilado</label>
          </div>
        </div>
      </div>

      <div v-show="!collapsed && local.stackGridEnabled" class="row g-2 mt-3">
        <div class="col">
          <label class="form-label small">Columnas</label>
          <input
            type="number"
            class="form-control form-control-sm"
            min="1"
            step="1"
            v-model.number="local.stackGridCols"
            @blur="commitStackGridConfig"
          />
        </div>
        <div class="col">
          <label class="form-label small">Separacion X (px)</label>
          <input
            type="number"
            class="form-control form-control-sm"
            min="0"
            step="1"
            v-model.number="local.stackGridGapX"
            @blur="commitStackGridConfig"
          />
        </div>
      </div>

      <div v-show="!collapsed && local.stackGridEnabled" class="row g-2 mt-2">
        <div class="col">
          <label class="form-label small">Separacion Y (px)</label>
          <input
            type="number"
            class="form-control form-control-sm"
            min="0"
            step="1"
            v-model.number="local.stackGridGapY"
            @blur="commitStackGridConfig"
          />
        </div>
      </div>

      <div v-show="!collapsed && local.stackGridEnabled" class="row g-2 mt-2">
        <div class="col">
          <label class="form-label small">Direccion</label>
          <select
            class="form-select form-select-sm"
            v-model="local.stackGridDirection"
            @change="commitStackGridConfig"
          >
            <option value="row">Por filas</option>
            <option value="col">Por columnas</option>
          </select>
        </div>
      </div>

      <div v-show="!collapsed && local.stackGridEnabled" class="row g-2 mt-2">
        <div class="col">
          <label class="form-label small">Patron</label>
          <select
            class="form-select form-select-sm"
            v-model="local.stackGridPattern"
            @change="commitStackGridConfig"
          >
            <option value="normal">Normal</option>
            <option value="snake">Serpiente (zig-zag)</option>
          </select>
        </div>
      </div>

      <div v-show="!collapsed && local.stackGridEnabled" class="row g-2 mt-2">
        <div class="col">
          <div class="form-check form-switch">
            <input
              id="stack-grid-reset"
              v-model="local.stackGridResetOnConfig"
              class="form-check-input"
              type="checkbox"
              @change="commitStackGridResetOnConfig"
            />
            <label class="form-check-label small" for="stack-grid-reset">
              Reiniciar al cambiar config
            </label>
          </div>
        </div>
      </div>

      <button
        v-show="!collapsed && local.stackGridEnabled"
        class="btn btn-outline-secondary w-100 mt-2"
        type="button"
        @click="setStackOriginToCenter"
      >
        Usar centro visible como origen
      </button>

      <div v-show="!collapsed && local.stackGridEnabled" class="mt-2">
        <div class="d-flex flex-wrap gap-2">
          <button
            v-for="(origin, index) in local.stackGridRecentOrigins"
            :key="`origin-${origin.x}-${origin.y}-${index}`"
            class="btn btn-sm btn-outline-secondary"
            type="button"
            @click="applyRecentOrigin(index)"
          >
            Origen {{ index + 1 }}
          </button>
        </div>
        <div v-if="local.stackGridRecentOrigins.length" class="text-muted panel-subtitle mt-1">
          Ultimos origenes usados.
        </div>
      </div>

      <button
        v-show="!collapsed && local.stackGridEnabled"
        class="btn w-100 mt-2"
        :class="local.stackGridPickOrigin ? 'btn-primary' : 'btn-outline-secondary'"
        type="button"
        @click="toggleStackGridPickOrigin"
      >
        {{
          local.stackGridPickOrigin ? 'Haciendo click en el canvas...' : 'Definir origen con click'
        }}
      </button>

      <button
        v-show="!collapsed && local.stackGridEnabled"
        class="btn btn-outline-secondary w-100 mt-2"
        type="button"
        @click="resetStackRow"
      >
        {{ local.stackGridDirection === 'col' ? 'Reiniciar columna' : 'Reiniciar fila' }}
      </button>

      <div v-show="!collapsed && local.stackGridEnabled" class="mt-3">
        <div class="fw-bold small">Anclas de apilado</div>
        <div class="text-muted panel-subtitle">Guarda y vuelve a origen + cursor</div>
        <div class="d-flex gap-2 mt-2">
          <input
            type="text"
            class="form-control form-control-sm"
            placeholder="Nombre de ancla"
            v-model.trim="local.stackGridAnchorName"
          />
          <button class="btn btn-sm btn-outline-primary" type="button" @click="addStackAnchor">
            Guardar
          </button>
        </div>
        <div v-if="local.stackGridAnchors.length" class="mt-2 d-grid gap-2">
          <div
            v-for="(anchor, index) in local.stackGridAnchors"
            :key="`${anchor.label}-${index}`"
            class="d-flex align-items-center justify-content-between gap-2"
          >
            <button
              class="btn btn-sm btn-outline-secondary flex-grow-1 text-start"
              type="button"
              @click="applyStackAnchor(index)"
            >
              {{ anchor.label || `Ancla ${index + 1}` }}
            </button>
            <button
              class="btn btn-sm btn-outline-danger"
              type="button"
              title="Eliminar"
              @click="removeStackAnchor(index)"
            >
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
        </div>
      </div>

      <div v-show="!collapsed && local.stackGridEnabled" class="mt-3">
        <div class="fw-bold small">Presets</div>
        <div class="text-muted panel-subtitle">Guarda la configuracion actual</div>
        <div class="d-flex gap-2 mt-2">
          <input
            type="text"
            class="form-control form-control-sm"
            placeholder="Nombre del preset"
            v-model.trim="local.stackGridPresetName"
          />
          <button class="btn btn-sm btn-outline-primary" type="button" @click="addStackPreset">
            Guardar
          </button>
        </div>
        <div v-if="local.stackGridPresets.length" class="mt-2 d-grid gap-2">
          <div
            v-for="(preset, index) in local.stackGridPresets"
            :key="`${preset.label}-${index}`"
            class="d-flex align-items-center justify-content-between gap-2"
          >
            <button
              class="btn btn-sm btn-outline-secondary flex-grow-1 text-start"
              type="button"
              @click="applyStackPreset(index)"
            >
              {{ preset.label || `Preset ${index + 1}` }}
            </button>
            <button
              class="btn btn-sm btn-outline-danger"
              type="button"
              title="Eliminar"
              @click="removeStackPreset(index)"
            >
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
        </div>
      </div>

      <div v-show="!collapsed" class="row g-2 mt-3">
        <div class="col">
          <label class="form-label small">Raster durante pan</label>
          <div class="form-check form-switch">
            <input
              id="raster-pan"
              v-model="local.rasterOnPan"
              class="form-check-input"
              type="checkbox"
              @change="commitRasterOnPan"
            />
            <label class="form-check-label small" for="raster-pan">
              Cachear mientras se mueve
            </label>
          </div>
        </div>
      </div>

      <div v-show="!collapsed" class="row g-2 mt-3">
        <div class="col">
          <label class="form-label small">Limite de nodos visibles</label>
          <input
            type="number"
            class="form-control form-control-sm"
            min="200"
            step="100"
            v-model.number="local.maxVisibleNodes"
            @blur="commitMaxVisibleNodes"
          />
        </div>
      </div>

      <button
        v-show="!collapsed"
        class="btn btn-outline-primary w-100 mt-3"
        type="button"
        :disabled="!hasOffset"
        @click="applyOffset"
      >
        Aplicar desplazamiento
      </button>

      <div v-show="!collapsed" class="mt-4">
        <div class="fw-bold small">Fondo</div>
        <div class="text-muted panel-subtitle">Color</div>
        <div class="d-flex align-items-center gap-2 mt-2 flex-wrap">
          <button
            v-for="color in swatches"
            :key="color"
            type="button"
            class="swatch"
            :class="{ active: local.backgroundColor === color }"
            :style="{ backgroundColor: color }"
            @click="setBackground(color)"
          ></button>
          <input
            type="color"
            class="form-control form-control-color"
            v-model="local.backgroundColor"
            @change="setBackground(local.backgroundColor)"
            aria-label="Canvas color"
          />
          <button class="btn btn-sm btn-outline-secondary" type="button" @click="resetBackground">
            Resetear
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useEditorStore } from '@/stores/editor.store'

const store = useEditorStore()

const local = reactive({
  widthCm: store.canvas.widthCm,
  heightCm: store.canvas.heightCm,
  offsetX: 0,
  offsetY: 0,
  locked: !!store.canvas.lockRatio,
  backgroundColor: store.canvas.backgroundColor || '#ffffff',
  displayScale: store.canvas.displayScale || 1,
  renderQuality: store.ui?.renderQuality || 'high',
  stackGridEnabled: !!store.ui?.stackGrid?.enabled,
  stackGridCols: store.ui?.stackGrid?.cols || 8,
  stackGridGapX: store.ui?.stackGrid?.gapX ?? store.ui?.stackGrid?.gap ?? 6,
  stackGridGapY: store.ui?.stackGrid?.gapY ?? store.ui?.stackGrid?.gap ?? 6,
  stackGridDirection: store.ui?.stackGrid?.direction || 'row',
  stackGridPattern: store.ui?.stackGrid?.pattern || 'normal',
  stackGridPickOrigin: !!store.ui?.stackGrid?.pickOrigin,
  stackGridResetOnConfig: !!store.ui?.stackGrid?.resetOnConfig,
  stackGridAnchors: Array.isArray(store.ui?.stackGrid?.anchors) ? store.ui.stackGrid.anchors : [],
  stackGridAnchorName: '',
  stackGridPresets: Array.isArray(store.ui?.stackGrid?.presets) ? store.ui.stackGrid.presets : [],
  stackGridPresetName: '',
  stackGridRecentOrigins: Array.isArray(store.ui?.stackGrid?.recentOrigins)
    ? store.ui.stackGrid.recentOrigins
    : [],
})

const collapsed = ref(false)

const aspectRatio = ref(local.heightCm ? local.widthCm / Math.max(1, local.heightCm) : 1)

const lockIcon = computed(() => (local.locked ? 'bi-lock' : 'bi-unlock'))
const hasOffset = computed(() => !!local.offsetX || !!local.offsetY)
const swatches = ['#ffffff', '#f1f3f5', '#cfd4da', '#868e96', '#212529']

watch(
  () => [store.canvas.widthCm, store.canvas.heightCm],
  ([w, h]) => {
    local.widthCm = w
    local.heightCm = h
    aspectRatio.value = Math.max(0.01, Number(w || 1) / Math.max(0.01, Number(h || 1)))
  },
  { immediate: true },
)

watch(
  () => store.canvas.displayScale,
  (value) => {
    local.displayScale = Number(value || 1)
  },
  { immediate: true },
)

watch(
  () => store.ui?.renderQuality,
  (value) => {
    local.renderQuality = value || 'high'
  },
  { immediate: true },
)

watch(
  () => store.ui?.stackGrid,
  (value) => {
    local.stackGridEnabled = !!value?.enabled
    local.stackGridCols = Number(value?.cols || 8)
    const fallbackGap = value?.gap ?? 6
    local.stackGridGapX = Number(value?.gapX ?? fallbackGap)
    local.stackGridGapY = Number(value?.gapY ?? fallbackGap)
    local.stackGridDirection = value?.direction || 'row'
    local.stackGridPattern = value?.pattern || 'normal'
    local.stackGridPickOrigin = !!value?.pickOrigin
    local.stackGridResetOnConfig = !!value?.resetOnConfig
    local.stackGridAnchors = Array.isArray(value?.anchors) ? value.anchors : []
    local.stackGridPresets = Array.isArray(value?.presets) ? value.presets : []
    local.stackGridRecentOrigins = Array.isArray(value?.recentOrigins) ? value.recentOrigins : []
  },
  { immediate: true, deep: true },
)

watch(
  () => store.canvas.backgroundColor,
  (value) => {
    local.backgroundColor = value || '#ffffff'
  },
  { immediate: true },
)

watch(
  () => store.canvas.lockRatio,
  (value) => {
    local.locked = !!value
  },
  { immediate: true },
)

onMounted(() => {
  try {
    const saved = localStorage.getItem('panel_collapsed_canvas')
    if (saved !== null) collapsed.value = saved === 'true'
  } catch {
    // ignore
  }
})

watch(collapsed, (value) => {
  try {
    localStorage.setItem('panel_collapsed_canvas', String(value))
  } catch {
    // ignore
  }
})

function commitDimensions() {
  store.setCanvasDimensions({ widthCm: Number(local.widthCm), heightCm: Number(local.heightCm) })
  aspectRatio.value = Math.max(
    0.01,
    Number(local.widthCm || 1) / Math.max(0.01, Number(local.heightCm || 1)),
  )
}

function handleWidthBlur() {
  local.widthCm = Math.max(1, Number(local.widthCm || 1))
  if (local.locked) {
    local.heightCm = Math.max(1, local.widthCm / Math.max(0.01, aspectRatio.value))
  }
  commitDimensions()
}

function handleHeightBlur() {
  local.heightCm = Math.max(1, Number(local.heightCm || 1))
  if (local.locked) {
    local.widthCm = Math.max(1, local.heightCm * Math.max(0.01, aspectRatio.value))
  }
  commitDimensions()
}

function toggleLock() {
  const next = !local.locked
  local.locked = next
  if (next) {
    aspectRatio.value = Math.max(
      0.01,
      Number(local.widthCm || 1) / Math.max(0.01, Number(local.heightCm || 1)),
    )
  }
  store.setCanvasLockRatio(next)
}

function applyOffset() {
  const dx = Number(local.offsetX) || 0
  const dy = Number(local.offsetY) || 0
  if (!dx && !dy) return
  store.applyCanvasOffset({ xCm: dx, yCm: dy, relative: true })
  local.offsetX = 0
  local.offsetY = 0
}

function commitDisplayScale() {
  const next = Math.max(0.3, Math.min(1.5, Number(local.displayScale || 1)))
  local.displayScale = next
  store.setCanvasDisplayScale(next)
}

function commitRenderQuality() {
  store.setRenderQuality(local.renderQuality)
}

function commitRasterOnPan() {
  store.setRasterOnPan(!!local.rasterOnPan)
}

function commitMaxVisibleNodes() {
  const next = Math.max(200, Number(local.maxVisibleNodes || 200))
  local.maxVisibleNodes = next
  store.setMaxVisibleNodes(next)
}

function setBackground(color) {
  store.setCanvasBackgroundColor(color)
}

function resetBackground() {
  setBackground('#ffffff')
}

function commitStackGridEnabled() {
  store.setStackGridEnabled?.(!!local.stackGridEnabled)
}

function commitStackGridConfig() {
  store.setStackGridConfig?.({
    cols: local.stackGridCols,
    gapX: local.stackGridGapX,
    gapY: local.stackGridGapY,
    direction: local.stackGridDirection,
    pattern: local.stackGridPattern,
  })
}

function commitStackGridResetOnConfig() {
  store.setStackGridResetOnConfig?.(!!local.stackGridResetOnConfig)
}

function setStackOriginToCenter() {
  const stage = store.stage
  const view = store.view || { x: 0, y: 0, scale: 1 }
  if (!stage) return
  const width = typeof stage.width === 'function' ? stage.width() : stage.width
  const height = typeof stage.height === 'function' ? stage.height() : stage.height
  const displayScale = Number(store.canvas?.displayScale || 1)
  const scale = Number(view.scale || 0) * displayScale
  if (!width || !height || !scale) return
  const dx = Number(view.x || 0) * displayScale
  const dy = Number(view.y || 0) * displayScale
  const x = (width / 2 - dx) / scale
  const y = (height / 2 - dy) / scale
  store.setStackGridOrigin?.({ x, y })
}

function resetStackRow() {
  store.resetStackGridRow?.()
}

function addStackAnchor() {
  store.addStackGridAnchor?.(local.stackGridAnchorName)
  local.stackGridAnchorName = ''
}

function applyStackAnchor(index) {
  store.applyStackGridAnchor?.(index)
}

function removeStackAnchor(index) {
  store.removeStackGridAnchor?.(index)
}

function addStackPreset() {
  store.addStackGridPreset?.(local.stackGridPresetName)
  local.stackGridPresetName = ''
}

function applyStackPreset(index) {
  store.applyStackGridPreset?.(index)
}

function removeStackPreset(index) {
  store.removeStackGridPreset?.(index)
}

function applyRecentOrigin(index) {
  store.applyRecentStackOrigin?.(index)
}

function toggleStackGridPickOrigin() {
  store.setStackGridPickOrigin?.(!local.stackGridPickOrigin)
}

function applyPerformancePreset() {
  local.displayScale = 0.75
  store.setCanvasDisplayScale(0.75)
  if (store.settings?.grid) store.toggleGrid()
  local.renderQuality = 'low'
  store.setRenderQuality('low')
  local.rasterOnPan = true
  store.setRasterOnPan(true)
  local.maxVisibleNodes = 800
  store.setMaxVisibleNodes(800)
}
</script>

<style lang="less" scoped>
.canvas-settings {
  border-radius: 16px;
}

.panel-subtitle {
  font-size: 0.72rem;
}

.lock-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.swatch {
  width: 28px;
  height: 22px;
  border-radius: 6px;
  border: 1px solid rgba(0, 0, 0, 0.15);
  padding: 0;
}

.swatch.active {
  border-color: #12a4b7;
  box-shadow: 0 0 0 2px rgba(18, 164, 183, 0.2);
}

.form-label {
  font-size: 0.7rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
}
</style>
