<template>
  <div class="d-flex gap-2 align-items-center w-100">
    <button class="btn btn-sm btn-outline-secondary" type="button" @click="emit('go-home')">
      <i class="bi bi-house-door me-1"></i>Inicio
    </button>

    <div class="btn-group btn-group-sm" role="group">
      <button
        class="btn btn-outline-secondary dropdown-toggle"
        type="button"
        data-bs-toggle="dropdown"
      >
        <i class="bi bi-folder2-open me-1"></i>Archivo
      </button>

      <ul class="dropdown-menu">
        <li>
          <button class="dropdown-item" type="button" @click="emit('new-guide')">
            Nuevo archivo
          </button>
        </li>
        <li>
          <label class="dropdown-item file-item">
            Abrir guia
            <input
              type="file"
              accept="application/json,.guide.json"
              class="d-none"
              @change="(e) => emit('open-guide', e)"
            />
          </label>
        </li>
        <li>
          <button class="dropdown-item" type="button" @click="emit('save-project')">Guardar</button>
        </li>
        <li>
          <button class="dropdown-item" type="button" @click="emit('save-project-as')">
            Guardar como...
          </button>
        </li>
        <li><hr class="dropdown-divider" /></li>
        <li>
          <button class="dropdown-item" type="button" @click="emit('export-guide')">
            Exportar guia JSON
          </button>
        </li>
        <li>
          <button class="dropdown-item" type="button" @click="emit('export-guide-visible')">
            Exportar guia JSON (visible)
          </button>
        </li>
        <li>
          <button class="dropdown-item" type="button" @click="emit('export-json')">
            Exportar JSON
          </button>
        </li>
      </ul>
    </div>

    <div class="btn-group btn-group-sm" role="group">
      <button
        class="btn btn-outline-secondary dropdown-toggle"
        type="button"
        data-bs-toggle="dropdown"
      >
        <i class="bi bi-upload me-1"></i>Importar
      </button>
      <ul class="dropdown-menu">
        <li>
          <label class="dropdown-item file-item">
            Importar JSON
            <input
              type="file"
              accept="application/json"
              class="d-none"
              @change="(e) => emit('import-json', e)"
            />
          </label>
        </li>
        <li><hr class="dropdown-divider" /></li>
        <li>
          <label class="dropdown-item file-item">
            Importar imagen
            <input
              type="file"
              accept="image/*"
              class="d-none"
              @change="(e) => emit('import-image', e)"
            />
          </label>
        </li>
      </ul>
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
  'new-guide',
  'open-guide',
  'save-project',
  'save-project-as',
  'export-guide',
  'export-guide-visible',
  'import-json',
  'import-image',
  'export-json',
])
</script>
