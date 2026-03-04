<template>
  <div class="card border-0 shadow-sm panel-card guide-panel">
    <div class="card-body panel-body">
      <div class="panel-head">
        <div class="panel-title">Imagen de fondo</div>
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
        <div class="d-flex flex-column gap-2">
          <button class="btn btn-sm btn-outline-primary w-100" type="button" @click="$emit('pick')">
            <i class="bi bi-image me-1"></i>
            {{ hasBackground ? 'Reemplazar imagen' : 'Cargar imagen' }}
          </button>

          <div v-if="hasBackground" class="small text-muted">
            <div class="fw-semibold text-dark">{{ backgroundName || 'Fondo' }}</div>
            <div v-if="backgroundSize">{{ backgroundSize }}</div>
          </div>

          <div v-if="hasBackground" class="d-flex gap-2">
            <button
              class="btn btn-sm btn-outline-secondary flex-fill"
              type="button"
              @click="$emit('select')"
            >
              Seleccionar fondo
            </button>
            <button
              class="btn btn-sm btn-outline-danger flex-fill"
              type="button"
              @click="$emit('remove')"
            >
              Quitar
            </button>
          </div>

          <div class="small text-muted">Escala la imagen con los manejadores del canvas.</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const collapsed = ref(false)

defineProps({
  hasBackground: { type: Boolean, default: false },
  backgroundName: { type: String, default: '' },
  backgroundSize: { type: String, default: '' },
})

defineEmits(['pick', 'select', 'remove'])
</script>
