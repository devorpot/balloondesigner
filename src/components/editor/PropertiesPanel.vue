<template>
  <div class="card border-0 shadow-sm props">
    <div class="card-body">

      <div class="d-flex align-items-start justify-content-between mb-2">
        <div>
          <div class="fw-bold">Propiedades</div>
          <div v-if="selected" class="text-muted small">
            ID: <span class="font-monospace">{{ selected.id }}</span>
          </div>
          <div v-else class="text-muted small">
            Selecciona un elemento
          </div>
        </div>
      </div>

      <hr class="my-3" />

      <div v-if="!selected" class="text-muted small">
        Haz clic en un globo o selecciónalo desde Capas.
      </div>

      <div v-else class="vstack gap-3">

        <!-- Acciones -->
        <div class="d-grid gap-2">
          <button class="btn btn-sm btn-outline-primary" type="button" @click="editor.duplicateSelected()">
            <i class="bi bi-files me-1"></i> Duplicar
          </button>
          <button class="btn btn-sm btn-outline-danger" type="button" @click="remove">
            <i class="bi bi-trash me-1"></i> Eliminar
          </button>
        </div>

        <!-- Tipo -->
        <section>
          <div class="section-title">Tipo</div>

          <label class="form-label">Globo</label>
          <select class="form-select form-select-sm" v-model="local.typeId" @change="commitType">
            <option v-for="t in catalogTypes" :key="t.id" :value="t.id">
              {{ t.name }}
            </option>
          </select>

          <div class="d-flex gap-2 mt-2">
            <button class="btn btn-sm btn-outline-secondary w-100" type="button" @click="applyTypeDefaults">
              Aplicar tamaño del tipo
            </button>
          </div>

          <div class="text-muted small mt-2">
            Al cambiar tipo, se conserva posición/rotación/escala/color.
          </div>
        </section>

        <!-- Meta (tamaño / forma) -->
        <section>
          <div class="section-title">Forma</div>

          <div class="row g-2">
            <div class="col-6">
              <label class="form-label">Radius X</label>
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
              <label class="form-label">Radius Y</label>
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

        <!-- Estado -->
        <section>
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
        <section>
          <div class="section-title">Transformación</div>

          <div class="row g-2">
            <div class="col-6">
              <label class="form-label">Scale X</label>
              <input
                type="number"
                class="form-control form-control-sm"
                step="0.01"
                v-model.number="local.scaleX"
                @blur="commitField('scaleX')"
              />
            </div>
            <div class="col-6">
              <label class="form-label">Scale Y</label>
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
            <button class="btn btn-sm btn-outline-secondary" type="button" @click="flipX">
              Flip X
            </button>
            <button class="btn btn-sm btn-outline-secondary" type="button" @click="flipY">
              Flip Y
            </button>
          </div>
        </section>

        <!-- Estilo -->
        <section>
          <div class="section-title">Color</div>
          <div class="row g-2 align-items-end">
            <div class="col-7">
              <input
                type="color"
                class="form-control form-control-color w-100"
                v-model="local.color"
                @change="commitField('color')"
              />
            </div>
            <div class="col-5">
              <button class="btn btn-sm btn-outline-secondary w-100" type="button" @click="randomColor">
                Aleatorio
              </button>
            </div>
          </div>
        </section>

      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, watch } from 'vue'
import { useEditorStore } from '@/stores/editor.store'
import { useCatalogStore } from '@/stores/catalog.store'

const editor = useEditorStore()
const catalog = useCatalogStore()

const selected = computed(() => editor.selectedNode)
const catalogTypes = computed(() => catalog.types || [])

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
})

watch(selected, hydrate, { immediate: true })

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

function commitType() {
  if (!selected.value) return
  const type = catalogTypes.value.find(t => t.id === local.typeId) || null
  editor.setNodeType(selected.value.id, {
    typeId: local.typeId,
    metaDefaults: type?.default || null,
    replaceMeta: true,
  })
  hydrate()
}

function applyTypeDefaults() {
  if (!selected.value) return
  const type = catalogTypes.value.find(t => t.id === (selected.value.typeId || local.typeId)) || null
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

function randomColor() {
  local.color = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')
  commitField('color')
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

.section-title {
  font-weight: 800;
  font-size: 0.9rem;
  margin-bottom: 0.4rem;
}

.form-label {
  font-size: 0.75rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
}

.font-monospace {
  font-size: 0.75rem;
}
</style>
