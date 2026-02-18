<template>
  <div class="card border-0 shadow-sm props">
    <div class="card-body">
      <div class="props-header">
        <div>
          <div class="fw-bold">Propiedades</div>
          <div v-if="selected" class="text-muted xsmall">Tipo: {{ selectedTypeName }}</div>
          <div v-if="selected" class="text-muted xsmall">
            ID: <span class="font-monospace">{{ selected.id }}</span>
          </div>
          <div v-else class="text-muted small">Selecciona un elemento</div>
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

      <div v-if="!selected" class="text-muted small" v-show="!collapsed">
        Haz clic en un globo o selecciónalo desde Capas.
      </div>

      <div v-else class="vstack gap-3" v-show="!collapsed">
        <!-- Acciones -->
        <div class="props-actions">
          <button
            class="btn btn-sm btn-outline-primary"
            type="button"
            @click="editor.duplicateSelected()"
          >
            <i class="bi bi-files me-1"></i> Duplicar
          </button>
          <button class="btn btn-sm btn-outline-danger" type="button" @click="remove">
            <i class="bi bi-trash me-1"></i> Eliminar
          </button>
        </div>

        <!-- Texto -->
        <section v-if="isText" class="props-section">
          <div class="section-title">Texto</div>

          <label class="form-label">Nombre</label>
          <input
            type="text"
            class="form-control form-control-sm"
            v-model.trim="local.text"
            @blur="commitText"
          />

          <label class="form-label mt-2">Fuente</label>
          <select
            class="form-select form-select-sm"
            v-model="local.fontFamily"
            @change="commitTextMeta"
          >
            <option v-for="font in fontOptions" :key="font.value" :value="font.value">
              {{ font.label }}
            </option>
          </select>

          <div class="row g-2 mt-2">
            <div class="col-6">
              <label class="form-label">Tamaño</label>
              <input
                type="number"
                class="form-control form-control-sm"
                min="8"
                step="1"
                v-model.number="local.fontSize"
                @blur="commitTextMeta"
              />
            </div>
            <div class="col-6">
              <label class="form-label">Alineación</label>
              <div class="d-flex gap-2">
                <button
                  class="btn btn-sm btn-outline-secondary flex-fill"
                  type="button"
                  :class="{ active: local.textAlign === 'left' }"
                  @click="setTextAlign('left')"
                >
                  <i class="bi bi-text-left"></i>
                </button>
                <button
                  class="btn btn-sm btn-outline-secondary flex-fill"
                  type="button"
                  :class="{ active: local.textAlign === 'center' }"
                  @click="setTextAlign('center')"
                >
                  <i class="bi bi-text-center"></i>
                </button>
                <button
                  class="btn btn-sm btn-outline-secondary flex-fill"
                  type="button"
                  :class="{ active: local.textAlign === 'right' }"
                  @click="setTextAlign('right')"
                >
                  <i class="bi bi-text-right"></i>
                </button>
              </div>
            </div>
          </div>

          <label class="form-label mt-2">Color de relleno</label>
          <input
            type="color"
            class="form-control form-control-color"
            v-model="local.textFill"
            @change="commitTextMeta"
          />

          <div class="d-flex gap-2 mt-2">
            <button
              class="btn btn-sm btn-outline-secondary"
              type="button"
              @click="editor.bringToFrontSelected()"
            >
              Al frente
            </button>
            <button
              class="btn btn-sm btn-outline-secondary"
              type="button"
              @click="editor.sendToBackSelected()"
            >
              Al fondo
            </button>
          </div>

          <div class="text-muted small mt-2">Carga fuentes externas con URL.</div>
          <div class="row g-2 mt-1">
            <div class="col-6">
              <input
                type="text"
                class="form-control form-control-sm"
                placeholder="Nombre"
                v-model.trim="local.customFontName"
              />
            </div>
            <div class="col-6">
              <input
                type="text"
                class="form-control form-control-sm"
                placeholder="URL"
                v-model.trim="local.customFontUrl"
              />
            </div>
          </div>
          <button
            class="btn btn-sm btn-outline-primary w-100 mt-2"
            type="button"
            @click="addCustomFont"
          >
            Cargar fuente
          </button>
        </section>

        <!-- Tipo -->
        <section v-else class="props-section">
          <div class="section-title">Tipo</div>

          <label class="form-label">Globo</label>
          <select class="form-select form-select-sm" v-model="local.typeId" @change="commitType">
            <option v-for="t in catalogTypes" :key="t.id" :value="t.id">
              {{ t.name }}
            </option>
          </select>

          <div class="d-flex gap-2 mt-2">
            <button
              class="btn btn-sm btn-outline-secondary w-100"
              type="button"
              @click="applyTypeDefaults"
            >
              Aplicar tamaño del tipo
            </button>
          </div>

          <div class="text-muted small mt-2">
            Al cambiar tipo, se conserva posición/rotación/escala/color.
          </div>
        </section>

        <!-- Estilo -->
        <section v-if="!isText" class="props-section">
          <div class="section-title">Color</div>
          <div class="d-flex align-items-center gap-2">
            <span class="color-chip" :style="{ background: local.color }"></span>
            <span class="text-muted small">{{ local.color }}</span>
          </div>

          <div v-if="availableColors.length" class="color-options">
            <button
              v-for="color in availableColors"
              :key="color"
              type="button"
              class="color-swatch"
              :class="{ active: local.color === color }"
              :style="{ background: color }"
              @click="selectColor(color)"
            ></button>
          </div>
          <div v-else class="text-muted small mt-2">Este tipo no tiene colores definidos.</div>
        </section>

        <section v-if="!isText && inflationRange" class="props-section">
          <div class="section-title">Inflado</div>
          <div class="d-flex align-items-center justify-content-between">
            <div class="text-muted small">{{ inflationRange.min }}x</div>
            <div class="fw-semibold small">{{ local.inflationCm }}x</div>
            <div class="text-muted small">{{ inflationRange.max }}x</div>
          </div>
          <input
            type="range"
            class="form-range"
            :min="inflationRange.min"
            :max="inflationRange.max"
            step="0.05"
            v-model.number="local.inflationCm"
            @change="commitInflation"
          />
        </section>

        <!-- Meta (tamaño / forma) -->
        <section class="props-section">
          <div class="section-title">Forma</div>

          <div class="row g-2">
            <div class="col-6">
              <label class="form-label">Radio X</label>
              <input
                type="number"
                class="form-control form-control-sm"
                min="1"
                step="1"
                v-model.number="local.radiusX"
                @blur="commitMeta"
              />
            </div>

            <div class="col-6">
              <label class="form-label">Radio Y</label>
              <input
                type="number"
                class="form-control form-control-sm"
                min="1"
                step="1"
                v-model.number="local.radiusY"
                @blur="commitMeta"
              />
            </div>

            <div class="col-12">
              <div class="form-check form-switch mt-1">
                <input
                  class="form-check-input"
                  type="checkbox"
                  v-model="local.knot"
                  @change="commitMeta"
                />
                <label class="form-check-label small">Nudo visible</label>
              </div>
            </div>
          </div>
        </section>

        <!-- Posición -->
        <section>
          <div class="section-title">Posición</div>
          <div class="row g-2">
            <div class="col-6">
              <label class="form-label">X</label>
              <input
                type="number"
                class="form-control form-control-sm"
                v-model.number="local.x"
                @blur="commitField('x')"
              />
            </div>
            <div class="col-6">
              <label class="form-label">Y</label>
              <input
                type="number"
                class="form-control form-control-sm"
                v-model.number="local.y"
                @blur="commitField('y')"
              />
            </div>
          </div>
        </section>

        <!-- Transformación -->
        <section class="props-section">
          <div class="section-title">Transformación</div>

          <div class="row g-2">
            <div class="col-6">
              <label class="form-label">Escala X</label>
              <input
                type="number"
                class="form-control form-control-sm"
                step="0.01"
                v-model.number="local.scaleX"
                @blur="commitField('scaleX')"
              />
            </div>
            <div class="col-6">
              <label class="form-label">Escala Y</label>
              <input
                type="number"
                class="form-control form-control-sm"
                step="0.01"
                v-model.number="local.scaleY"
                @blur="commitField('scaleY')"
              />
            </div>

            <div class="col-12">
              <label class="form-label">Rotación ({{ Math.round(local.rotation) }}°)</label>
              <input
                type="range"
                class="form-range"
                min="-180"
                max="180"
                step="1"
                v-model.number="local.rotation"
                @change="commitField('rotation')"
              />
            </div>

            <div class="col-12">
              <label class="form-label">Opacidad ({{ Math.round(local.opacity * 100) }}%)</label>
              <input
                type="range"
                class="form-range"
                min="0"
                max="1"
                step="0.01"
                v-model.number="local.opacity"
                @change="commitField('opacity')"
              />
            </div>
          </div>

          <div class="d-flex flex-wrap gap-2 mt-2">
            <button class="btn btn-sm btn-outline-secondary" type="button" @click="resetTransform">
              Reset
            </button>
          </div>

          <div class="mt-3">
            <div class="form-label">Flip</div>
            <div class="d-flex gap-2">
              <button
                class="btn btn-sm btn-outline-secondary flex-fill"
                type="button"
                @click="flipX"
              >
                <i class="bi bi-arrow-left-right"></i> Horizontal
              </button>
              <button
                class="btn btn-sm btn-outline-secondary flex-fill"
                type="button"
                @click="flipY"
              >
                <i class="bi bi-arrow-up-down"></i> Vertical
              </button>
            </div>
          </div>
        </section>

        <!-- Estado -->
        <section class="props-section">
          <div class="section-title">Estado</div>
          <div class="row g-2">
            <div class="col-6">
              <div class="form-check form-switch">
                <input
                  class="form-check-input"
                  type="checkbox"
                  v-model="local.visible"
                  @change="commitField('visible')"
                />
                <label class="form-check-label small">Visible</label>
              </div>
            </div>
            <div class="col-6">
              <div class="form-check form-switch">
                <input
                  class="form-check-input"
                  type="checkbox"
                  v-model="local.locked"
                  @change="commitField('locked')"
                />
                <label class="form-check-label small">Bloqueado</label>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useEditorStore } from '@/stores/editor.store'
import { useCatalogStore } from '@/stores/catalog.store'

const editor = useEditorStore()
const catalog = useCatalogStore()

const selected = computed(() => editor.selectedNode)
const isText = computed(() => selected.value?.kind === 'text')
const catalogTypes = computed(() => catalog.types || [])
const collapsed = ref(false)
const selectedType = computed(() =>
  selected.value?.typeId ? catalog.typeById(selected.value.typeId) : null,
)
const selectedTypeName = computed(() => {
  if (isText.value) return 'Texto'
  if (!selected.value?.typeId) return '—'
  return selectedType.value?.name || '—'
})
const availableColors = computed(() => selectedType.value?.colors || [])

const local = reactive({
  // tipo
  typeId: 'round-11',
  radiusX: 46,
  radiusY: 60,
  knot: true,

  // estado
  locked: false,
  visible: true,

  // props
  x: 0,
  y: 0,
  scaleX: 1,
  scaleY: 1,
  rotation: 0,
  opacity: 1,
  color: '#ff3b30',

  // texto
  text: 'New text',
  fontFamily: 'Times New Roman',
  fontSize: 24,
  textAlign: 'left',
  textFill: '#222222',
  customFontName: '',
  customFontUrl: '',

  // inflado
  inflationCm: 1,
})

const defaultFonts = [
  { label: 'Times New Roman', value: 'Times New Roman' },
  { label: 'Georgia', value: 'Georgia' },
  {
    label: 'Playfair Display',
    value: 'Playfair Display',
    url: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600&display=swap',
  },
  {
    label: 'Merriweather',
    value: 'Merriweather',
    url: 'https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700&display=swap',
  },
]

const fontOptions = ref([...defaultFonts])
const loadedFonts = new Set()

const inflationRange = computed(() => {
  if (!selectedType.value || isText.value) return null
  const inflation = selectedType.value.inflation || {}
  const minScale = Number(inflation.minScale ?? 0.7)
  const maxScale = Number(inflation.maxScale ?? 1.0)
  const defScale = Number(inflation.defaultScale ?? 1.0)

  if (!Number.isFinite(minScale) || !Number.isFinite(maxScale)) return null

  return {
    min: Math.max(0.1, minScale),
    max: Math.max(minScale, maxScale),
    def: clamp(defScale, minScale, maxScale),
  }
})

onMounted(() => {
  for (const font of defaultFonts) {
    if (font.url) loadFont(font.url)
  }
})

watch(selected, hydrate, { immediate: true })

onMounted(() => {
  try {
    const saved = localStorage.getItem('panel_collapsed_properties')
    if (saved !== null) collapsed.value = saved === 'true'
  } catch {
    // ignore
  }
})

watch(collapsed, (value) => {
  try {
    localStorage.setItem('panel_collapsed_properties', String(value))
  } catch {
    // ignore
  }
})

function hydrate() {
  if (!selected.value) return

  const m = selected.value.meta || {}

  local.typeId = selected.value.typeId || 'round-11'
  local.radiusX = num(m.radiusX, 46)
  local.radiusY = num(m.radiusY, 60)
  local.knot = m.knot !== false

  local.locked = !!selected.value.locked
  local.visible = selected.value.visible !== false

  local.x = num(selected.value.x, 0)
  local.y = num(selected.value.y, 0)
  local.scaleX = num(selected.value.scaleX, 1)
  local.scaleY = num(selected.value.scaleY, 1)
  local.rotation = num(selected.value.rotation, 0)
  local.opacity = num(selected.value.opacity, 1)
  local.color = typeof selected.value.color === 'string' ? selected.value.color : '#ff3b30'
  if (availableColors.value.length && !availableColors.value.includes(local.color)) {
    local.color = availableColors.value[0]
    commitField('color')
  }

  if (!isText.value && inflationRange.value) {
    const value = num(m.inflationScale, inflationRange.value.def)
    local.inflationCm = clamp(value, inflationRange.value.min, inflationRange.value.max)
  }

  if (isText.value) {
    local.text = String(m.text || 'New text')
    local.fontFamily = String(m.fontFamily || 'Times New Roman')
    local.fontSize = num(m.fontSize, 24)
    local.textAlign = String(m.align || 'left')
    local.textFill = String(m.fill || '#222222')
  }
}

function commitField(field) {
  if (!selected.value) return
  const patch = {}

  if (field === 'visible') patch.visible = !!local.visible
  else if (field === 'locked') patch.locked = !!local.locked
  else patch[field] = local[field]

  editor.updateNode(selected.value.id, patch)
}

function commitMeta() {
  if (!selected.value) return
  editor.updateNodeMeta(selected.value.id, {
    radiusX: Math.max(1, Math.round(num(local.radiusX, 46))),
    radiusY: Math.max(1, Math.round(num(local.radiusY, 60))),
    knot: !!local.knot,
  })
}

function commitInflation() {
  if (!selected.value || !inflationRange.value) return
  const value = clamp(
    num(local.inflationCm, inflationRange.value.def),
    inflationRange.value.min,
    inflationRange.value.max,
  )
  local.inflationCm = value
  editor.updateNode(selected.value.id, {
    scaleX: value,
    scaleY: value,
  })
  editor.updateNodeMeta(selected.value.id, { inflationScale: value })
}

function commitText() {
  if (!selected.value) return
  editor.updateNodeMeta(selected.value.id, { text: local.text })
}

function commitTextMeta() {
  if (!selected.value) return
  const option = fontOptions.value.find((font) => font.value === local.fontFamily)
  if (option?.url) loadFont(option.url)
  editor.updateNodeMeta(selected.value.id, {
    fontFamily: local.fontFamily,
    fontSize: Math.max(8, Math.round(num(local.fontSize, 24))),
    align: local.textAlign,
    fill: local.textFill,
  })
}

function setTextAlign(value) {
  local.textAlign = value
  commitTextMeta()
}

function commitType() {
  if (!selected.value) return
  const type = catalogTypes.value.find((t) => t.id === local.typeId) || null
  editor.setNodeType(selected.value.id, {
    typeId: local.typeId,
    metaDefaults: type?.default || null,
    replaceMeta: true,
  })
  hydrate()
}

function applyTypeDefaults() {
  if (!selected.value) return
  const type =
    catalogTypes.value.find((t) => t.id === (selected.value.typeId || local.typeId)) || null
  if (!type) return

  editor.setNodeType(selected.value.id, {
    typeId: type.id,
    metaDefaults: type.default || null,
    replaceMeta: true,
  })
  hydrate()
}

function resetTransform() {
  if (!selected.value) return
  editor.updateNode(selected.value.id, { scaleX: 1, scaleY: 1, rotation: 0, opacity: 1 })
  hydrate()
}

function flipX() {
  if (!selected.value) return
  editor.updateNode(selected.value.id, { scaleX: -(selected.value.scaleX || 1) })
  hydrate()
}

function flipY() {
  if (!selected.value) return
  editor.updateNode(selected.value.id, { scaleY: -(selected.value.scaleY || 1) })
  hydrate()
}

function selectColor(color) {
  if (!color || !selected.value) return
  local.color = color
  commitField('color')
}

function clamp(v, min, max) {
  if (!Number.isFinite(v)) return min
  return Math.min(max, Math.max(min, v))
}

function loadFont(url) {
  if (!url || loadedFonts.has(url)) return
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = url
  document.head.appendChild(link)
  loadedFonts.add(url)
}

function addCustomFont() {
  const name = local.customFontName.trim()
  const url = local.customFontUrl.trim()
  if (!name || !url) return
  loadFont(url)
  fontOptions.value = [{ label: name, value: name, url }, ...fontOptions.value]
  local.customFontName = ''
  local.customFontUrl = ''
}

function remove() {
  const ok = window.confirm('¿Eliminar este elemento?')
  if (ok) editor.deleteSelected()
}

function num(v, fallback) {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}
</script>

<style lang="less" scoped>
.props {
  border-radius: 16px;
}

.props-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.icon-btn {
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.props-actions {
  display: flex;
  gap: 8px;
}

.props-section {
  padding: 12px;
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  background: #fff;
}

.section-title {
  font-weight: 800;
  font-size: 0.8rem;
  margin-bottom: 0.4rem;
}

.xsmall {
  font-size: 0.7rem;
}

.btn-outline-secondary.active {
  background: #12a4b7;
  border-color: #12a4b7;
  color: #fff;
}

.form-label {
  font-size: 0.7rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
}

.color-chip {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.color-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.color-swatch {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  border: 2px solid rgba(0, 0, 0, 0.12);
  padding: 0;
  cursor: pointer;
}

.color-swatch.active {
  border-color: #0d6efd;
  box-shadow: 0 0 0 2px rgba(13, 110, 253, 0.2);
}

.font-monospace {
  font-size: 0.75rem;
}
</style>
