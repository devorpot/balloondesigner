<template>
  <div class="card border-0 shadow-sm panel-card guide-panel">
    <div class="card-body panel-body">
      <div class="panel-head">
        <div class="panel-title">Materiales</div>
        <button
          class="btn btn-sm btn-outline-secondary icon-btn"
          type="button"
          @click="collapsed = !collapsed"
          :title="collapsed ? 'Expandir' : 'Contraer'"
        >
          <i class="bi" :class="collapsed ? 'bi-chevron-down' : 'bi-chevron-up'"></i>
        </button>
      </div>

      <div v-show="!collapsed" class="panel-content">
        <div v-if="!summary.total" class="text-muted panel-subtitle">
          No hay globos para mostrar.
        </div>

        <template v-else>
          <div class="text-muted panel-subtitle">Total globos: {{ summary.total }}</div>
          <div class="text-muted panel-subtitle">Clusters: {{ summary.groupCount || 0 }}</div>
          <div class="text-muted panel-subtitle">
            Ancho: {{ summary.widthCm || 0 }} cm · {{ summary.widthIn || 0 }} in
          </div>
          <div class="text-muted panel-subtitle">
            Alto: {{ summary.heightCm || 0 }} cm · {{ summary.heightIn || 0 }} in
          </div>

          <div class="section">
            <div class="section-title">Detalle por color y tamano</div>
            <div v-if="!summary.details?.length" class="text-muted xsmall">Sin datos</div>
            <div v-else class="color-list">
              <div v-for="item in summary.details" :key="item.key" class="color-row">
                <span
                  class="color-dot"
                  :style="{ backgroundColor: item.color, opacity: item.alpha / 100 }"
                ></span>
                <div class="color-info">
                  <div class="fw-semibold">
                    {{ item.sizeIn ? `${item.sizeIn}\"` : 'N/A' }} · {{ item.color }}
                  </div>
                  <div class="text-muted xsmall">
                    Opacidad {{ item.alpha }}% · x{{ item.count }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const collapsed = ref(false)

const props = defineProps({
  summary: {
    type: Object,
    default: () => ({ total: 0, sizes: [], colors: [] }),
  },
})

const summary = computed(() => props.summary || { total: 0, sizes: [], colors: [] })
</script>

<style scoped>
.section {
  margin-top: 12px;
}

.section-title {
  font-size: 0.75rem;
  font-weight: 700;
  color: #4b5563;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.list {
  display: grid;
  gap: 6px;
  margin-top: 8px;
}

.list-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 8px;
  border-radius: 8px;
  background: #f8fafc;
}

.color-list {
  display: grid;
  gap: 8px;
  margin-top: 8px;
}

.color-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 8px;
  background: #f8fafc;
}

.color-dot {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.18);
}

.color-info {
  display: grid;
  gap: 2px;
}
</style>
