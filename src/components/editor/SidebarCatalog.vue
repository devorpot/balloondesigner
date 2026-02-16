<template>
  <div class="card border-0 shadow-sm catalog">
    <div class="card-body">
      <div class="d-flex align-items-start justify-content-between mb-3">
        <div>
          <div class="fw-bold">Catálogo</div>
          <div class="text-muted small">Tipos y costos</div>
        </div>

        <button class="btn btn-sm btn-outline-danger" type="button" @click="resetCatalog">
          Reset
        </button>
      </div>

      <div class="types">
        <div v-for="t in catalog.types" :key="t.id" class="type-card">
          <div class="d-flex align-items-start justify-content-between gap-2">
            <div class="minw0">
              <div class="fw-semibold">{{ t.name }}</div>
              <div class="text-muted small">
                {{ t.family }}
                <span v-if="t.sizeIn">· {{ t.sizeIn }}"</span>
              </div>
            </div>

            <div class="cost">
              <input
                type="number"
                min="0"
                step="1"
                class="form-control form-control-sm"
                :value="t.cost"
                @change="updateCost(t.id, $event)"
              />
              <div class="text-muted small text-center">MXN</div>
            </div>
          </div>

          <button class="btn btn-sm btn-primary w-100 mt-2" type="button" @click="addType(t)">
            Agregar
          </button>
        </div>
      </div>

      <div class="text-muted small mt-3">
        Los costos se guardan automáticamente en el navegador.
      </div>
    </div>
  </div>
</template>

<script setup>
import { useCatalogStore } from '@/stores/catalog.store'
import { useEditorStore } from '@/stores/editor.store'

const catalog = useCatalogStore()
const editor = useEditorStore()

function updateCost(id, e) {
  const value = e.target.value
  catalog.updateTypeCost(id, value)
}

function resetCatalog() {
  const ok = window.confirm('Restaurar catálogo a valores originales?')
  if (!ok) return
  catalog.resetToDefaults()
}

function addType(type) {
  editor.addNode({
    x: 200,
    y: 200,
    color: '#ff3b30',
    typeId: type.id,
    meta: { ...(type.default || {}) },
  })
}
</script>

<style lang="less" scoped>
.catalog {
  border-radius: 16px;
}

.types {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.type-card {
  border: 1px solid rgba(0,0,0,.08);
  border-radius: 16px;
  padding: 12px;
  background: #fff;
}

.cost {
  width: 80px;
}
.minw0 { min-width: 0; }
</style>
