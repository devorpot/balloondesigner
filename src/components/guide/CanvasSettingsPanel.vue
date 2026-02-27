<template>
  <div class="card border-0 shadow-sm canvas-settings">
    <div class="card-body panel-body">
      <div class="panel-head">
        <div>
          <div class="panel-title"><i class="bi bi-grid-3x3-gap me-2"></i>Canvas</div>
          <div class="text-muted panel-subtitle">Ajusta tamaño y desplazamiento</div>
        </div>
        <button
          class="btn btn-sm btn-outline-secondary icon-btn"
          type="button"
          @click="collapsed = !collapsed"
          :title="collapsed ? 'Expandir' : 'Contraer'"
        >
          <i class="bi" :class="collapsed ? 'bi-chevron-down' : 'bi-chevron-up'"></i>
        </button>
      </div>

      <div v-show="!collapsed" class="row g-2 mt-3">
        <div class="col">
          <label class="form-label small"
            ><i class="bi bi-arrows-horizontal me-1"></i>Ancho (cm)</label
          >
          <input
            type="number"
            class="form-control form-control-sm"
            step="0.01"
            min="1"
            v-model.number="local.widthCm"
            @blur="handleWidthBlur"
          />
          <div class="text-muted xsmall mt-1">{{ widthCmLabel }}</div>
        </div>
        <div class="col">
          <label class="form-label small"
            ><i class="bi bi-arrows-vertical me-1"></i>Alto (cm)</label
          >
          <input
            type="number"
            class="form-control form-control-sm"
            step="0.01"
            min="1"
            v-model.number="local.heightCm"
            @blur="handleHeightBlur"
          />
          <div class="text-muted xsmall mt-1">{{ heightCmLabel }}</div>
        </div>
      </div>

      <div v-show="!collapsed" class="row g-2 mt-3">
        <div class="col">
          <label class="form-label small"
            ><i class="bi bi-arrows-move me-1"></i>Desplazamiento X (cm)</label
          >
          <input
            type="number"
            class="form-control form-control-sm"
            step="0.1"
            v-model.number="local.offsetX"
          />
          <div class="text-muted xsmall mt-1">{{ offsetXLabel }}</div>
        </div>
        <div class="col">
          <label class="form-label small"
            ><i class="bi bi-arrows-move me-1"></i>Desplazamiento Y (cm)</label
          >
          <input
            type="number"
            class="form-control form-control-sm"
            step="0.1"
            v-model.number="local.offsetY"
          />
          <div class="text-muted xsmall mt-1">{{ offsetYLabel }}</div>
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

      <button
        v-show="!collapsed"
        class="btn btn-outline-primary w-100 mt-3"
        type="button"
        :disabled="!hasOffset"
        @click="applyOffset"
      >
        <i class="bi bi-arrows-move me-1"></i>Aplicar desplazamiento
      </button>

      <div v-show="!collapsed" class="mt-4">
        <div class="fw-bold small"><i class="bi bi-palette me-1"></i>Fondo</div>
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
import { useActiveEditorStore } from '@/stores/editor-context'

const store = useActiveEditorStore()

const local = reactive({
  widthCm: store.canvas.widthCm,
  heightCm: store.canvas.heightCm,
  offsetX: 0,
  offsetY: 0,
  backgroundColor: store.canvas.backgroundColor || '#ffffff',
  renderQuality: store.ui?.renderQuality || 'high',
  rasterOnPan: !!store.ui?.rasterOnPan,
})

const collapsed = ref(false)

const widthCmLabel = computed(() => formatCmIn(local.widthCm))
const heightCmLabel = computed(() => formatCmIn(local.heightCm))
const offsetXLabel = computed(() => formatCmIn(local.offsetX))
const offsetYLabel = computed(() => formatCmIn(local.offsetY))
const hasOffset = computed(() => !!local.offsetX || !!local.offsetY)
const swatches = ['#ffffff', '#f1f3f5', '#cfd4da', '#868e96', '#212529']

watch(
  () => [store.canvas.widthCm, store.canvas.heightCm],
  ([w, h]) => {
    local.widthCm = w
    local.heightCm = h
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
  () => store.canvas.backgroundColor,
  (value) => {
    local.backgroundColor = value || '#ffffff'
  },
  { immediate: true },
)

watch(
  () => store.ui?.rasterOnPan,
  (value) => {
    local.rasterOnPan = !!value
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
  const widthCm = Number(local.widthCm)
  const heightCm = Number(local.heightCm)
  store.setCanvasDimensions({ widthCm, heightCm })
  const guideWall = store.ui?.guideWall
  if (guideWall && typeof guideWall === 'object') {
    store.setGuideWall({
      ...guideWall,
      widthCm,
      heightCm,
    })
  }
}

function handleWidthBlur() {
  local.widthCm = Math.max(1, Number(local.widthCm || 1))
  commitDimensions()
}

function handleHeightBlur() {
  local.heightCm = Math.max(1, Number(local.heightCm || 1))
  commitDimensions()
}

function formatCmIn(value) {
  const cm = roundNumber(value)
  const inch = roundNumber(Number(value || 0) / 2.54)
  return `${cm} cm · ${inch} in`
}

function roundNumber(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  return Math.round(n * 100) / 100
}

function applyOffset() {
  const dx = Number(local.offsetX) || 0
  const dy = Number(local.offsetY) || 0
  if (!dx && !dy) return
  store.applyCanvasOffset({ xCm: dx, yCm: dy, relative: true })
  local.offsetX = 0
  local.offsetY = 0
}

function commitRenderQuality() {
  store.setRenderQuality(local.renderQuality)
}

function commitRasterOnPan() {
  store.setRasterOnPan(!!local.rasterOnPan)
}

function setBackground(color) {
  store.setCanvasBackgroundColor(color)
}

function resetBackground() {
  setBackground('#ffffff')
}
</script>

<style lang="less" scoped>
.canvas-settings {
  border-radius: 16px;
}

.panel-subtitle {
  font-size: 0.72rem;
}

.icon-btn {
  width: 32px;
  height: 32px;
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
