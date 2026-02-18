<template>
  <div class="card border-0 shadow-sm catalog">
    <div class="card-body">
      <!-- Header -->
      <div class="head">
        <div class="d-flex align-items-start justify-content-between gap-2">
          <div class="minw0">
            <div class="fw-bold">Catálogo</div>
            <div class="text-muted panel-subtitle">Tipos y materiales</div>
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
            Selecciona una familia y arrastra el globo al lienzo.
          </div>
          <div class="mt-2">
            <select v-model="selectedFamily" class="form-select form-select-sm w-auto">
              <option v-for="family in families" :key="family" :value="family">
                {{ family }}
              </option>
            </select>
          </div>
        </div>
      </div>

      <!-- List -->
      <div v-show="!collapsed" class="types">
        <article
          v-for="category in visibleCategories"
          :key="category.id"
          class="category-tree"
          :class="{ collapsed: !categoryIsExpanded(category.id) }"
        >
          <header class="category-head" @click="toggleCategory(category.id)">
            <div class="category-info">
              <div class="d-flex align-items-center gap-2">
                <span class="category-toggle" aria-hidden="true">
                  {{ categoryIsExpanded(category.id) ? '▼' : '▶' }}
                </span>
                <div class="fw-semibold">{{ category.label }}</div>
              </div>
              <div class="text-muted small d-flex gap-2 align-items-center">
                <span>{{ category.measurementLabel }}</span>
                <span v-if="category.types.length">· {{ category.types.length }} tipos</span>
              </div>
            </div>

            <div class="palette">
              <span
                v-for="color in category.colors"
                :key="color"
                class="palette-dot"
                :style="{ backgroundColor: color }"
              ></span>
            </div>
          </header>

          <transition name="fade" mode="out-in">
            <div v-if="categoryIsExpanded(category.id)" class="category-types tree">
              <div
                v-for="t in category.types"
                :key="t.id"
                class="type-row"
                draggable="true"
                @dragstart="onDragStartType(t, $event)"
              >
                <div class="type-row__header">
                  <div class="fw-semibold text-truncate">{{ t.name }}</div>
                  <div class="text-muted xsmall">{{ measurementForType(t, category) }}</div>
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
          </transition>
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
import { useEditorStore } from '@/stores/editor.store'

const catalog = useCatalogStore()
const editor = useEditorStore()

onMounted(() => {
  if (Array.isArray(catalog.categories) && catalog.categories.length) return
  if (typeof catalog.init === 'function') return catalog.init()
})

const currentColor = computed(() => editor.selectedNode?.color || '#ff3b30')
const categories = computed(() => catalog.categories || [])
const families = computed(() => categories.value.map((category) => category.family))
const collapsed = ref(false)
const selectedFamily = ref('')
const visibleCategories = computed(() => {
  if (!selectedFamily.value) return categories.value
  return categories.value.filter((category) => category.family === selectedFamily.value)
})
const expandedCategories = ref(new Set())

watch(
  categories,
  (cats) => {
    const next = new Set(expandedCategories.value)
    for (const cat of cats || []) {
      if (cat?.id) next.add(cat.id)
    }
    expandedCategories.value = next
    if (!selectedFamily.value && cats?.length) selectedFamily.value = cats[0].family
  },
  { immediate: true },
)

onMounted(() => {
  try {
    const saved = localStorage.getItem('panel_collapsed_catalog')
    if (saved !== null) collapsed.value = saved === 'true'
  } catch {
    // ignore
  }
})

watch(collapsed, (value) => {
  try {
    localStorage.setItem('panel_collapsed_catalog', String(value))
  } catch {
    // ignore
  }
})

function toggleCategory(id) {
  const next = new Set(expandedCategories.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expandedCategories.value = next
}

function categoryIsExpanded(id) {
  return expandedCategories.value.has(id)
}

function measurementForType(type, category) {
  return typeof category?.measurement === 'function' ? category.measurement(type) : '—'
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
  editor.addNode({
    x: p.x,
    y: p.y,
    color: currentColor.value,
    typeId: type.id,
    meta: defaultMetaForType(type),
  })
}

function onDragStartType(t, e) {
  const payload = { typeId: t.id, meta: defaultMetaForType(t), color: currentColor.value }
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

.hint {
  border-top: 1px dashed rgba(0, 0, 0, 0.12);
  padding-top: 10px;
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

.category-tree + .category-tree {
  margin-top: 12px;
}

.category-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  cursor: pointer;
}

.category-toggle {
  font-size: 12px;
  display: inline-flex;
  width: 16px;
  justify-content: center;
}

.category-types.tree {
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 16px 16px;
}

.category-tree.collapsed .category-types.tree {
  padding: 0 16px;
  border-top: none;
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
  align-items: center;
  gap: 8px;
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

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
