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
          <button class="dropdown-item" type="button" @click="emit('new-file')">
            Nuevo archivo
          </button>
        </li>
        <li>
          <label class="dropdown-item file-item">
            Abrir archivo
            <input
              type="file"
              accept="application/json"
              class="d-none"
              @change="(e) => emit('open-file', e)"
            />
          </label>
        </li>
        <li><hr class="dropdown-divider" /></li>
        <li>
          <button class="dropdown-item" type="button" @click="emit('save-json')">
            Guardar JSON
          </button>
        </li>
        <li>
          <button class="dropdown-item" type="button" @click="emit('save-as')">
            Guardar como...
          </button>
        </li>
        <li>
          <button class="dropdown-item" type="button" @click="emit('export-image')">
            Exportar imagen (visible)
          </button>
        </li>
        <li>
          <button class="dropdown-item" type="button" @click="emit('export-image-content')">
            Exportar imagen (contenido)
          </button>
        </li>
        <li><hr class="dropdown-divider" /></li>
        <li>
          <label class="dropdown-item file-item">
            Importar guia JSON
            <input
              type="file"
              accept="application/json"
              class="d-none"
              @change="(e) => emit('import-guide', e)"
            />
          </label>
        </li>
        <li>
          <label class="dropdown-item file-item">
            Importar simbolo JSON
            <input
              type="file"
              accept="application/json"
              class="d-none"
              @change="(e) => emit('import-symbol', e)"
            />
          </label>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
const emit = defineEmits([
  'go-home',
  'save-json',
  'save-as',
  'open-file',
  'export-image',
  'export-image-content',
  'import-guide',
  'import-symbol',
  'new-file',
])
</script>
