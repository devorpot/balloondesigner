<template>
  <div class="card border-0 shadow-sm costs">
    <div class="card-body">
      <!-- Header -->
      <div class="head">
        <div class="d-flex align-items-start justify-content-between gap-2">
          <div class="minw0">
            <div class="fw-bold">Costos y materiales</div>
            <div class="text-muted small">Configura precios y estima el costo del diseño</div>
          </div>

          <div class="d-flex align-items-center gap-2">
            <button
              class="btn btn-sm btn-outline-secondary"
              type="button"
              @click="toggleCompact"
              :title="compact ? 'Vista normal' : 'Vista compacta'"
            >
              {{ compact ? 'Normal' : 'Compacto' }}
            </button>

            <button class="btn btn-sm btn-outline-danger" type="button" @click="resetCatalog">
              Reset
            </button>
          </div>
        </div>

        <!-- Search + filters -->
        <div class="mt-3 d-flex gap-2">
          <div class="flex-grow-1">
            <input
              v-model.trim="q"
              type="text"
              class="form-control form-control-sm"
              placeholder="Buscar: round 11, 260, corazón, etc."
            />
          </div>

          <select v-model="family" class="form-select form-select-sm w-auto">
            <option value="">Todas</option>
            <option v-for="f in families" :key="f" :value="f">{{ f }}</option>
          </select>

          <select v-model="sortBy" class="form-select form-select-sm w-auto">
            <option value="name">Nombre</option>
            <option value="size">Tamaño</option>
            <option value="cost">Costo</option>
          </select>
        </div>

        <div class="small text-muted mt-2 d-flex align-items-center justify-content-between">
          <span>{{ filtered.length }} tipos</span>
          <button class="btn btn-link btn-sm p-0" type="button" @click="clearFilters" v-if="q || family">
            Limpiar filtros
          </button>
        </div>

        <!-- Materials summary -->
        <div class="summary mt-3">
          <div class="d-flex align-items-center justify-content-between">
            <div class="small text-muted">Materiales (visibles)</div>
            <div class="small">
              <span class="text-muted me-2">Total:</span>
              <span class="fw-semibold">{{ materials.total }}</span>
            </div>
          </div>

          <div class="d-flex align-items-center justify-content-between mt-1">
            <div class="small text-muted">Costo estimado</div>
            <div class="small">
              <span v-if="materials.hasCosts" class="fw-semibold">{{ formatMoney(materials.estimatedCost) }}</span>
              <span v-else class="text-muted">Define costos</span>
            </div>
          </div>

          <div class="hint small text-muted mt-2">
            Estos costos se aplican a la estimación del diseño actual.
          </div>
        </div>
      </div>

      <!-- List -->
      <div class="types" :class="{ compact }">
        <div v-for="t in filtered" :key="t.id" class="type-card">
          <div class="row g-2 align-items-start">
            <div class="col-7">
              <div class="d-flex gap-2 align-items-start">
                <div class="preview-wrap" :title="`Preview ${t.id}`">
                  <div class="preview" :style="previewStyle(t)"></div>
                </div>

                <div class="minw0">
                  <div class="fw-semibold text-truncate">{{ t.name }}</div>
                  <div class="text-muted small text-truncate">
                    {{ t.family || 'Sin familia' }}
                    <span v-if="t.sizeIn">· {{ t.sizeIn }}"</span>
                    <span class="text-muted"> · {{ t.id }}</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="col-5">
              <div class="cost">
                <input
                  type="number"
                  min="0"
                  step="1"
                  class="form-control form-control-sm text-end"
                  :value="Number(t.cost || 0)"
                  @input="onCostInput(t.id, $event)"
                  @change="onCostCommit(t.id, $event)"
                />
                <div class="text-muted small text-center">MXN</div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="!filtered.length" class="empty text-muted small">
          No hay resultados con los filtros actuales.
        </div>
      </div>

      <div class="text-muted small mt-3">
        Los costos se guardan automáticamente en el navegador.
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useCatalogStore } from '@/stores/catalog.store'
import { useEditorStore } from '@/stores/editor.store'

const catalog = useCatalogStore()
const editor = useEditorStore()

/* Auto init */
onMounted(() => {
  if (Array.isArray(catalog.types) && catalog.types.length) return
  if (typeof catalog.init === 'function') return catalog.init()
  if (typeof catalog.resetToDefaults === 'function') return catalog.resetToDefaults()
})

const q = ref('')
const family = ref('')
const sortBy = ref('name')
const compact = ref(false)

const currentColor = computed(() => {
  return editor.selectedNode?.color || '#ff3b30'
})

const families = computed(() => {
  const set = new Set()
  for (const t of catalog.types || []) {
    if (t?.family) set.add(String(t.family))
  }
  return [...set].sort((a, b) => a.localeCompare(b))
})

const filtered = computed(() => {
  const text = q.value.trim().toLowerCase()
  const fam = family.value

  let list = (catalog.types || []).slice()

  if (fam) list = list.filter(t => String(t.family || '') === fam)

  if (text) {
    list = list.filter(t => {
      const name = String(t.name || '').toLowerCase()
      const id = String(t.id || '').toLowerCase()
      const fam2 = String(t.family || '').toLowerCase()
      const size = String(t.sizeIn || '').toLowerCase()
      return name.includes(text) || id.includes(text) || fam2.includes(text) || size.includes(text)
    })
  }

  const sb = sortBy.value
  list.sort((a, b) => {
    if (sb === 'cost') return Number(b.cost || 0) - Number(a.cost || 0)
    if (sb === 'size') return Number(b.sizeIn || 0) - Number(a.sizeIn || 0)
    return String(a.name || '').localeCompare(String(b.name || ''))
  })

  return list
})

function clearFilters() {
  q.value = ''
  family.value = ''
}

function toggleCompact() {
  compact.value = !compact.value
}

/* Materials + cost estimate */
const materials = computed(() => {
  if (typeof editor.computeMaterials !== 'function') {
    return { total: 0, hasCosts: false, estimatedCost: 0 }
  }
  return editor.computeMaterials({
    includeHidden: false,
    includeLocked: true,
    catalogTypes: catalog.types || [],
  })
})

function formatMoney(n) {
  const v = Number(n || 0)
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v)
}

/* Cost update (debounced) */
const costDraft = new Map()
const timers = new Map()

function normalizeCost(v) {
  const n = Number(v)
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.round(n)
}

function onCostInput(id, e) {
  const value = normalizeCost(e?.target?.value)
  costDraft.set(id, value)

  if (timers.has(id)) clearTimeout(timers.get(id))
  timers.set(
    id,
    setTimeout(() => {
      catalog.updateTypeCost(id, costDraft.get(id) ?? 0)
      timers.delete(id)
    }, 350)
  )
}

function onCostCommit(id, e) {
  const value = normalizeCost(e?.target?.value)
  costDraft.set(id, value)

  if (timers.has(id)) {
    clearTimeout(timers.get(id))
    timers.delete(id)
  }

  catalog.updateTypeCost(id, value)
}

onBeforeUnmount(() => {
  for (const t of timers.values()) clearTimeout(t)
  timers.clear()
})

function resetCatalog() {
  const ok = window.confirm('Restaurar catálogo a valores originales?')
  if (!ok) return
  catalog.resetToDefaults()
}

/* Preview */
function previewStyle(t) {
  const rx = Number(t?.default?.radiusX ?? 20)
  const ry = Number(t?.default?.radiusY ?? 28)
  const max = 34
  const scale = Math.min(1, max / Math.max(rx, ry))
  const w = Math.max(18, Math.round(rx * 2 * scale))
  const h = Math.max(18, Math.round(ry * 2 * scale))

  return {
    width: `${w}px`,
    height: `${h}px`,
    background: currentColor.value,
  }
}
</script>

<style lang="less" scoped>
.costs {
  border-radius: 16px;
}

.head {
  position: sticky;
  top: 0;
  z-index: 2;
  background: #fff;
  padding-bottom: 10px;
}

.summa
