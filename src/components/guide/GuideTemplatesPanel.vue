<template>
  <div class="card border-0 shadow-sm panel-card guide-panel">
    <div class="card-body panel-body">
      <div class="panel-head">
        <div class="panel-title"><i class="bi bi-folder2-open me-2"></i>Plantillas</div>
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
        <div class="text-muted panel-subtitle">Guarda y reutiliza guias.</div>

        <div class="mt-2">
          <label class="form-label xsmall">Nombre</label>
          <input
            :value="templateName"
            class="form-control form-control-sm"
            type="text"
            placeholder="Mi guia"
            @input="updateField('name', $event.target.value)"
          />
        </div>
        <div class="mt-2">
          <label class="form-label xsmall">Descripción</label>
          <textarea
            :value="templateDescription"
            class="form-control form-control-sm"
            rows="2"
            placeholder="Describe esta guia"
            @input="updateField('description', $event.target.value)"
          ></textarea>
        </div>
        <div class="mt-2 d-flex flex-wrap gap-2">
          <button class="btn btn-sm btn-outline-primary" type="button" @click="$emit('save')">
            Guardar plantilla
          </button>
          <label class="btn btn-sm btn-outline-secondary mb-0">
            Importar plantilla
            <input
              type="file"
              accept="application/json"
              class="d-none"
              @change="$emit('import', $event)"
            />
          </label>
          <button
            class="btn btn-sm btn-outline-secondary"
            type="button"
            :disabled="!selectedId"
            @click="$emit('export')"
          >
            Exportar plantilla
          </button>
        </div>

        <div class="mt-3">
          <label class="form-label xsmall">Plantillas guardadas</label>
          <select
            class="form-select form-select-sm"
            :value="selectedId"
            @change="updateField('selectedId', $event.target.value)"
          >
            <option value="">Selecciona una plantilla</option>
            <option v-for="tpl in templates" :key="tpl.id" :value="tpl.id">
              {{ tpl.name }}
            </option>
          </select>
          <div v-if="selectedDescription" class="text-muted xsmall mt-1">
            {{ selectedDescription }}
          </div>
          <div v-if="selectedMeta" class="text-muted xsmall mt-1">{{ selectedMeta }}</div>
        </div>
        <div class="mt-2 d-flex gap-2">
          <button
            class="btn btn-sm btn-outline-secondary"
            type="button"
            :disabled="!selectedId"
            @click="$emit('apply')"
          >
            Cargar plantilla
          </button>
          <button
            class="btn btn-sm btn-outline-danger"
            type="button"
            :disabled="!selectedId"
            @click="$emit('remove')"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'

const collapsed = ref(false)

onMounted(() => {
  try {
    const saved = localStorage.getItem('guide_panel_templates_collapsed')
    if (saved !== null) collapsed.value = saved === 'true'
  } catch {
    // ignore
  }
})

watch(collapsed, (value) => {
  try {
    localStorage.setItem('guide_panel_templates_collapsed', String(value))
  } catch {
    // ignore
  }
})
defineProps({
  templateName: { type: String, default: '' },
  templateDescription: { type: String, default: '' },
  selectedId: { type: String, default: '' },
  templates: { type: Array, default: () => [] },
  selectedDescription: { type: String, default: '' },
  selectedMeta: { type: String, default: '' },
})

const emit = defineEmits(['update', 'save', 'import', 'export', 'apply', 'remove'])

function updateField(key, value) {
  emit('update', { [key]: value })
}
</script>
