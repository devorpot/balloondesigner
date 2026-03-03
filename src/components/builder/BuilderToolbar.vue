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
      </ul>
    </div>
  </div>
</template>

<script setup>
const emit = defineEmits(['go-home', 'import-guide'])
</script>
