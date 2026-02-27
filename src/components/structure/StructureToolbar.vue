<template>
  <div class="d-flex gap-2 align-items-center w-100">
    <button class="btn btn-sm btn-outline-secondary" type="button" @click="emit('go-home')">
      <i class="bi bi-house-door me-1"></i>Inicio
    </button>

    <div class="btn-group btn-group-sm" role="group">
      <button class="btn btn-outline-secondary" type="button" @click="emit('new-structure')">
        <i class="bi bi-file-earmark-plus me-1"></i>Nuevo structure
      </button>
    </div>

    <div class="btn-group btn-group-sm" role="group">
      <button class="btn btn-outline-secondary" type="button" @click="emit('save-project')">
        <i class="bi bi-save me-1"></i>Guardar
      </button>
      <button class="btn btn-outline-secondary" type="button" @click="emit('save-project-as')">
        <i class="bi bi-save2 me-1"></i>Guardar como...
      </button>
    </div>

    <div class="btn-group btn-group-sm" role="group">
      <label class="btn btn-outline-secondary mb-0">
        <i class="bi bi-upload me-1"></i>Importar guía JSON
        <input
          type="file"
          accept="application/json"
          class="d-none"
          @change="(e) => emit('import-guide', e)"
        />
      </label>
      <label class="btn btn-outline-secondary mb-0">
        <i class="bi bi-upload me-1"></i>Importar JSON
        <input
          type="file"
          accept="application/json"
          class="d-none"
          @change="(e) => emit('import-json', e)"
        />
      </label>
    </div>

    <div class="btn-group btn-group-sm" role="group">
      <button class="btn btn-outline-secondary" type="button" @click="emit('export-png')">
        <i class="bi bi-filetype-png me-1"></i>Exportar PNG
      </button>
      <button class="btn btn-outline-secondary" type="button" @click="emit('export-jpg')">
        <i class="bi bi-filetype-jpg me-1"></i>Exportar JPG
      </button>
      <button class="btn btn-outline-secondary" type="button" @click="emit('export-json')">
        <i class="bi bi-filetype-json me-1"></i>Exportar JSON
      </button>
    </div>

    <div class="ms-auto">
      <span class="badge" :class="dirty ? 'text-bg-warning' : 'text-bg-success'">
        {{ dirty ? 'Sin guardar' : 'Guardado' }}
      </span>
    </div>
  </div>
</template>

<script setup>
defineProps({
  dirty: { type: Boolean, default: false },
})

const emit = defineEmits([
  'go-home',
  'new-structure',
  'save-project',
  'save-project-as',
  'import-guide',
  'import-json',
  'export-png',
  'export-jpg',
  'export-json',
])
</script>
