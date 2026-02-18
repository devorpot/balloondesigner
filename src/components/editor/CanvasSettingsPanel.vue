<template>
  <div class="card border-0 shadow-sm canvas-settings">
    <div class="card-body">
      <div class="d-flex align-items-start justify-content-between">
        <div>
          <div class="fw-bold">Canvas</div>
          <div class="text-muted panel-subtitle">Ajusta tamaño y desplazamiento</div>
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
