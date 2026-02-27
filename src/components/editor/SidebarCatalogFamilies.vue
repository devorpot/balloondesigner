<template>
  <div class="card border-0 shadow-sm catalog">
    <div class="card-body">
      <div class="head">
        <div class="d-flex align-items-start justify-content-between gap-2">
          <div class="minw0">
            <div class="fw-bold">Catálogo por familia</div>
            <div class="text-muted panel-subtitle">Familias y tipos de globo</div>
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

        <div v-show="!collapsed" class="mt-3">
          <div class="text-muted panel-subtitle">
            Selecciona una familia y elige el tipo de globo.
          </div>
          <div class="mt-2 d-flex gap-2 flex-wrap align-items-center">
            <select v-model="selectedFamily" class="form-select form-select-sm w-auto">
              <option v-for="family in families" :key="family" :value="family">
                {{ family }}
              </option>
            </select>
            <div class="palette" v-if="selectedCategory?.colors?.length">
              <span
                v-for="color in selectedCategory.colors"
                :key="color"
                class="palette-dot"
                :style="{ backgroundColor: color }"
              ></span>
            </div>
          </div>
          <div class="mt-2">
            <button
              class="btn btn-sm btn-primary w-100"
              type="button"
              :disabled="!quickAddType"
              @click="addQuickType"
            >
              Agregar globo
            </button>
            <div class="text-muted xsmall mt-1">Usa el primer tipo de la familia seleccionada.</div>
          </div>
        </div>
      </div>

      <div v-show="!collapsed" class="types">
        <article v-if="selectedCategory" class="category-tree">
          <header class="category-title">
            <div class="family-title">{{ selectedCategory.label }}</div>
            <div class="family-subtitle">{{ familySubtitle }}</div>
          </header>

          <div class="category-types tree">
            <section v-for="group in groupedTypes" :key="group.key" class="type-group">
              <button class="type-group__head" type="button" @click="toggleGroup(group.key)">
                <div class="type-group__title">{{ group.label }}</div>
                <span class="type-group__chevron" aria-hidden="true">
                  {{ groupIsExpanded(group.key) ? '▾' : '▸' }}
                </span>
              </button>
              <div v-if="groupIsExpanded(group.key)" class="type-group__body">
                <div
                  v-for="t in group.types"
                  :key="t.id"
                  class="type-row"
                  draggable="true"
                  @dragstart="onDragStartType(t, $event)"
                >
                  <div class="type-row__header">
                    <div class="fw-semibold text-truncate">{{ t.name }}</div>
                    <div class="text-muted xsmall">{{ sizeLabel(t) }}</div>
                  </div>

                  <div class="type-row__body">
                    <div class="type-row__preview" :title="`Preview ${t.id}`">
                      <img
                        class="type-thumb"
                        alt="Preview"
                        src="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40'><rect width='40' height='40' rx='10' fill='%23f1f3f5'/><circle cx='20' cy='20' r='10' fill='%23d0d5dd'/></svg>"
                      />
                    </div>

                    <div class="type-row__meta">
                      <div class="type-row__colors" v-if="t.colors?.length">
                        <span
                          v-for="color in t.colors"
                          :key="color"
                          class="color-dot"
                          :style="{ backgroundColor: color }"
                        ></span>
                      </div>
                      <div class="text-muted xsmall" v-else>Sin colores definidos</div>
                      <div class="text-muted xsmall" v-if="inflationLabel(t)">
                        {{ inflationLabel(t) }}
                      </div>
                    </div>

                    <div class="type-row__actions">
                      <button
                        class="btn btn-sm btn-light icon-btn"
                        type="button"
                        title="Agregar"
                        @click.stop="addType(t)"
                      >
                        ＋
                      </button>
                      <button
                        class="btn btn-sm btn-light icon-btn"
                        type="button"
                        title="Agregar al centro visible"
                        @click.stop="addType(t, { center: true })"
                      >
                        ◎
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </article>

        <div v-if="!categories.length" class="empty text-muted small">
          No hay familias cargadas aún.
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useCatalogStore } from '@/stores/catalog.store'
import { useActiveEditorStore } from '@/stores/editor-context'

const catalog = useCatalogStore()
const editor = useActiveEditorStore()

const TYPE_LABELS = {
  Redondo: 'Globos redondos',
  Twisting: 'Globos Twisting (largos)',
  Especial: 'Globos Especiales',
}
const TYPE_ORDER = ['Redondo', 'Twisting', 'Especial']

onMounted(() => {
  if (Array.isArray(catalog.categories) && catalog.categories.length) return
  if (typeof catalog.init === 'function') return catalog.init()
})

onMounted(() => {
  try {
    const saved = localStorage.getItem('catalog_last_type_id')
    if (saved) lastAddedTypeId.value = saved
  } catch {
    // ignore
  }
})

onMounted(() => {
  try {
    const saved = localStorage.getItem('catalog_last_color')
    if (saved) lastAddedColor.value = saved
  } catch {
    // ignore
  }
})

const currentColor = computed(() => editor.selectedNode?.color || '#ff3b30')
const categories = computed(() => catalog.categories || [])
const families = computed(() => categories.value.map((category) => category.family))
const selectedFamily = ref('')
const collapsed = ref(false)
const lastAddedTypeId = ref('')
const lastAddedColor = ref('')

const selectedCategory = computed(() => {
  const cats = categories.value || []
  if (!cats.length) return null
  if (!selectedFamily.value) return cats[0]
  return cats.find((c) => c.family === selectedFamily.value) || cats[0]
})

const familySubtitle = computed(() => selectedCategory.value?.subtitle || 'Sólido y versátil')

const expandedGroups = ref(new Set())

const groupedTypes = computed(() => {
  const list = selectedCategory.value?.types || []
  const buckets = new Map()
  for (const t of list) {
    const key = String(t?.balloonType || 'Sin tipo')
    if (!buckets.has(key)) buckets.set(key, [])
    buckets.get(key).push(t)
  }

  const orderedKeys = [...TYPE_ORDER, ...[...buckets.keys()].filter((k) => !TYPE_ORDER.includes(k))]
  return orderedKeys
    .filter((key) => buckets.has(key))
    .map((key) => ({
      key,
      label: TYPE_LABELS[key] || `Globos ${key}`,
      types: buckets.get(key),
    }))
})

const quickAddType = computed(() => {
  if (lastAddedTypeId.value) {
    for (const category of categories.value || []) {
      const match = (category.types || []).find((t) => t.id === lastAddedTypeId.value)
      if (match) return match
    }
  }
  const cat = selectedCategory.value
  if (cat?.types?.length) return cat.types[0]
  return null
})

const quickAddColor = computed(() => lastAddedColor.value || currentColor.value)

watch(
  categories,
  (cats) => {
    if (!selectedFamily.value && cats?.length) selectedFamily.value = cats[0].family
  },
  { immediate: true },
)

watch(
  groupedTypes,
  (groups) => {
    expandedGroups.value = new Set((groups || []).map((group) => group.key))
  },
  { immediate: true },
)

onMounted(() => {
  try {
    const saved = localStorage.getItem('panel_collapsed_catalog_families')
    if (saved !== null) collapsed.value = saved === 'true'
  } catch {
    // ignore
  }
})

watch(collapsed, (value) => {
  try {
    localStorage.setItem('panel_collapsed_catalog_families', String(value))
  } catch {
    // ignore
  }
})

function sizeLabel(type) {
  const parts = []
  if (Number.isFinite(type?.sizeIn)) parts.push(`${type.sizeIn}"`)
  if (Number.isFinite(type?.sizeCm)) parts.push(`${type.sizeCm} cm`)
  if (type?.sizeCode) parts.push(String(type.sizeCode))
  return parts.join(' · ') || '—'
}

function inflationLabel(type) {
  const infl = type?.inflation
  if (!infl || typeof infl !== 'object') return ''
  const inMin = Number(infl.minIn)
  const inMax = Number(infl.maxIn)
  const cmMin = Number(infl.minCm)
  const cmMax = Number(infl.maxCm)
  if (Number.isFinite(inMin) && Number.isFinite(inMax)) return `Inflado: ${inMin}-${inMax}"`
  if (Number.isFinite(cmMin) && Number.isFinite(cmMax)) return `Inflado: ${cmMin}-${cmMax} cm`
  return ''
}

function toggleGroup(key) {
  const next = new Set(expandedGroups.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  expandedGroups.value = next
}

function groupIsExpanded(key) {
  return expandedGroups.value.has(key)
}

function defaultMetaForType(type) {
  const def = type?.default
  const meta = def && typeof def === 'object' ? { ...def } : {}
  if (type?.inflation?.defaultScale) {
    meta.inflationScale = type.inflation.defaultScale
  }
  return meta
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

function addType(type, opts = {}) {
  const p = getAddPoint({ center: !!opts.center })
  lastAddedTypeId.value = type?.id || ''
  try {
    if (lastAddedTypeId.value) localStorage.setItem('catalog_last_type_id', lastAddedTypeId.value)
  } catch {
    // ignore
  }
  lastAddedColor.value = currentColor.value
  try {
    if (lastAddedColor.value) localStorage.setItem('catalog_last_color', lastAddedColor.value)
  } catch {
    // ignore
  }
  editor.addNode({
    x: p.x,
    y: p.y,
    color: quickAddColor.value,
    typeId: type.id,
    meta: defaultMetaForType(type),
    useStackGrid: true,
  })
}

function addQuickType() {
  if (!quickAddType.value) return
  addType(quickAddType.value, { center: true })
}

function onDragStartType(t, e) {
  lastAddedTypeId.value = t?.id || ''
  try {
    if (lastAddedTypeId.value) localStorage.setItem('catalog_last_type_id', lastAddedTypeId.value)
  } catch {
    // ignore
  }
  lastAddedColor.value = currentColor.value
  try {
    if (lastAddedColor.value) localStorage.setItem('catalog_last_color', lastAddedColor.value)
  } catch {
    // ignore
  }
  const payload = { typeId: t.id, meta: defaultMetaForType(t), color: quickAddColor.value }
  try {
    e.dataTransfer.effectAllowed = 'copy'
    e.dataTransfer.setData('application/x-ballon-type', JSON.stringify(payload))
    e.dataTransfer.setData('text/plain', t.id)
  } catch {
    // ignore
  }
}
</script>

<style lang="less" scoped>
.catalog {
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

.types {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 10px;
}

.category-tree {
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 10px 24px -20px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

.category-title {
  text-align: center;
  padding: 18px 16px 6px;
}

.family-title {
  font-size: 1.2rem;
  font-weight: 700;
}

.family-subtitle {
  font-size: 0.85rem;
  color: #6c757d;
}

.category-types.tree {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
}

.type-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.type-group__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  border: none;
  text-align: left;
  padding: 16px 18px;
  border-radius: 8px;
  background: #f58220;
  color: #fff;
  font-weight: 600;
}

.type-group__head:hover {
  background: #ee7b1c;
}

.type-group__title {
  font-size: 1rem;
}

.type-group__chevron {
  font-size: 1.1rem;
  line-height: 1;
}

.type-group__body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px 8px 6px;
}

.type-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid rgba(0, 0, 0, 0.05);
  background: #fafafa;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.type-row:hover {
  border-color: rgba(0, 0, 0, 0.12);
  box-shadow: 0 8px 18px -16px rgba(0, 0, 0, 0.5);
}

.type-row__header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  font-size: 0.85rem;
}

.type-row__header .xsmall {
  font-size: 11px;
}

.type-row__body {
  display: flex;
  align-items: center;
  gap: 10px;
}

.type-row__preview {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
}

.type-thumb {
  width: 40px;
  height: 40px;
  display: block;
}

.type-row__meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.type-row__colors {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.color-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.type-row__actions {
  display: flex;
  gap: 6px;
}

.icon-btn {
  border-radius: 999px;
  padding: 4px 8px;
  line-height: 1;
  font-size: 0.85rem;
}

.palette {
  display: flex;
  align-items: center;
  gap: 6px;
}

.palette-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.1);
}
</style>
