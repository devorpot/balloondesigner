<template>
  <div class="bmp card border-0 shadow-sm">
    <div class="card-body">
      <div class="d-flex align-items-start justify-content-between gap-2">
        <div class="minw0">
          <div class="fw-bold">{{ title }}</div>
          <div class="text-muted small">{{ subtitle }}</div>
        </div>

        <button
          v-if="showClear"
          class="btn btn-sm btn-outline-secondary"
          type="button"
          @click="clearAll"
        >
          Limpiar
        </button>
      </div>

      <div class="mt-3">
        <input
          v-model.trim="q"
          type="text"
          class="form-control form-control-sm"
          :placeholder="searchPlaceholder"
        />
      </div>

      <div class="list mt-3">
        <button
          v-for="it in filtered"
          :key="it.id"
          type="button"
          class="row-item"
          :class="{ active: selectedId === it.id }"
          @click="select(it)"
        >
          <div class="left">
            <div class="thumb" :style="thumbStyle(it)" aria-hidden="true"></div>
            <div class="meta minw0">
              <div class="name text-truncate">{{ it.name }}</div>
              <div class="sub text-muted small text-truncate">
                <span v-if="it.group">{{ it.group }}</span>
                <span v-if="it.group && it.code" class="mx-1">·</span>
                <span v-if="it.code">{{ it.code }}</span>
              </div>
            </div>
          </div>

          <div class="right">
            <div v-if="selectedId !== it.id" class="pill">
              <span class="text-muted small">+</span>
              <span class="qty">{{ qtyOf(it.id) }}</span>
            </div>

            <div v-else class="stepper" @click.stop>
              <button class="btn btn-sm btn-outline-secondary" type="button" @click="dec(it)">
                <i class="bi bi-dash"></i>
              </button>

              <input
                class="form-control form-control-sm text-center"
                inputmode="numeric"
                type="number"
                min="0"
                step="1"
                :value="qtyOf(it.id)"
                @input="onQtyInput(it, $event)"
                @change="onQtyCommit(it, $event)"
              />

              <button class="btn btn-sm btn-primary" type="button" @click="inc(it)">
                <i class="bi bi-plus"></i>
              </button>
            </div>
          </div>
        </button>

        <div v-if="!filtered.length" class="empty text-muted small">No hay resultados.</div>
      </div>

      <div class="footer small text-muted mt-3">
        Total seleccionados: <span class="fw-semibold">{{ totalQty }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  title: { type: String, default: 'Materiales' },
  subtitle: { type: String, default: 'Toca para seleccionar y asignar cantidad' },
  searchPlaceholder: { type: String, default: 'Buscar color o nombre…' },

  items: {
    type: Array,
    default: () => [],
    // shape sugerida:
    // { id, name, color, group?, code?, image? }
  },

  modelValue: {
    type: Object,
    default: () => ({}),
    // { [id]: qty }
  },

  defaultQtyOnSelect: { type: Number, default: 1 },
  showClear: { type: Boolean, default: true },
})

const emit = defineEmits(['update:modelValue', 'select', 'change'])

const q = ref('')
const selectedId = ref('')

watch(
  () => props.items,
  (list) => {
    if (selectedId.value && !list.some((x) => x.id === selectedId.value)) {
      selectedId.value = ''
    }
  },
  { deep: true },
)

const filtered = computed(() => {
  const text = q.value.trim().toLowerCase()
  const list = Array.isArray(props.items) ? props.items : []

  if (!text) return list

  return list.filter((it) => {
    const name = String(it?.name || '').toLowerCase()
    const group = String(it?.group || '').toLowerCase()
    const code = String(it?.code || '').toLowerCase()
    return name.includes(text) || group.includes(text) || code.includes(text)
  })
})

function normalizeQty(v) {
  const n = Number(v)
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.round(n)
}

function qtyOf(id) {
  return normalizeQty(props.modelValue?.[id] ?? 0)
}

function setQty(id, qty) {
  const base = props.modelValue
  const next = base && typeof base === 'object' ? { ...base } : {}
  const v = normalizeQty(qty)

  if (v <= 0) delete next[id]
  else next[id] = v

  emit('update:modelValue', next)
  emit('change', { id, qty: v, all: next })
}

function select(it) {
  selectedId.value = it.id
  emit('select', it)

  // si no tenía cantidad, al seleccionar ponemos 1
  if (qtyOf(it.id) === 0 && props.defaultQtyOnSelect > 0) {
    setQty(it.id, props.defaultQtyOnSelect)
  }
}

function inc(it) {
  setQty(it.id, qtyOf(it.id) + 1)
}

function dec(it) {
  setQty(it.id, Math.max(0, qtyOf(it.id) - 1))
}

function onQtyInput(it, e) {
  setQty(it.id, e?.target?.value)
}

function onQtyCommit(it, e) {
  setQty(it.id, e?.target?.value)
}

function clearAll() {
  emit('update:modelValue', {})
  emit('change', { id: null, qty: 0, all: {} })
  selectedId.value = ''
}

const totalQty = computed(() => {
  const mv = props.modelValue || {}
  return Object.values(mv).reduce((acc, v) => acc + normalizeQty(v), 0)
})

function thumbStyle(it) {
  // si luego quieres imagen real (mini globo), soporta it.image
  if (it?.image) {
    return {
      backgroundImage: `url(${it.image})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }
  }
  return { background: it?.color || '#e9ecef' }
}
</script>

<style lang="less" scoped>
.bmp {
  border-radius: 16px;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.row-item {
  width: 100%;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 14px;
  background: #fff;
  padding: 10px 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  text-align: left;
}

.row-item.active {
  border-color: rgba(13, 110, 253, 0.35);
  box-shadow: 0 0 0 3px rgba(13, 110, 253, 0.1);
}

.left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 1 1 auto;
}

.thumb {
  width: 34px;
  height: 34px;
  border-radius: 999px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.25);
  flex: 0 0 auto;
}

.meta {
  min-width: 0;
}

.name {
  font-weight: 700;
  line-height: 1.05;
}

.sub {
  line-height: 1.05;
  margin-top: 2px;
}

.right {
  flex: 0 0 auto;
}

.pill {
  min-width: 54px;
  height: 30px;
  border-radius: 999px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: rgba(0, 0, 0, 0.02);
  padding: 0 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.pill .qty {
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.stepper {
  display: grid;
  grid-template-columns: 34px 58px 34px;
  gap: 6px;
  align-items: center;
}

.stepper input {
  border-radius: 12px;
  font-variant-numeric: tabular-nums;
}

.stepper .btn {
  border-radius: 12px;
  padding-left: 0;
  padding-right: 0;
}

.empty {
  border: 1px dashed rgba(0, 0, 0, 0.15);
  border-radius: 14px;
  padding: 14px;
  text-align: center;
}

.footer {
  border-top: 1px dashed rgba(0, 0, 0, 0.12);
  padding-top: 10px;
}
</style>
