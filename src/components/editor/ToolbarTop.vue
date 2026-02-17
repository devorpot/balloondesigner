<template>
  <div class="d-flex gap-2 align-items-center w-100">
    <!-- Archivo -->
    <div class="btn-group btn-group-sm" role="group">
      <button class="btn btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown">
        <i class="bi bi-folder2-open me-1"></i> Archivo
      </button>

      <ul class="dropdown-menu">
        <li>
          <button class="dropdown-item" type="button" @click="store.newDesign()">
            Nuevo diseño
          </button>
        </li>

        <li>
          <button class="dropdown-item" type="button" @click="store.restoreDesignPrompt()" :disabled="!store.canRestore">
            Restaurar autosave
          </button>
        </li>

        <li><hr class="dropdown-divider" /></li>

        <li>
          <button class="dropdown-item" type="button" @click="store.flushAutosaveNow()">
            Guardar ahora
          </button>
        </li>

        <li><hr class="dropdown-divider" /></li>

        <li>
          <button class="dropdown-item" type="button" @click="openExportPng">
            Exportar PNG
          </button>
        </li>

        <li>
          <button class="dropdown-item" type="button" @click="exportJson">
            Exportar JSON
          </button>
        </li>

        <li>
          <label class="dropdown-item file-item">
            Importar JSON
            <input type="file" accept="application/json" class="d-none" @change="onImportFile" />
          </label>
        </li>
      </ul>
    </div>

    <!-- Edición -->
    <div class="btn-group btn-group-sm" role="group">
      <button class="btn btn-outline-secondary" type="button" @click="add">
        <i class="bi bi-plus-lg me-1"></i> Agregar
      </button>
      <button class="btn btn-outline-secondary" type="button" @click="duplicate" :disabled="(store.selectedIds?.length || 0) === 0">
        <i class="bi bi-files me-1"></i> Duplicar
      </button>
      <button class="btn btn-outline-secondary" type="button" @click="duplicate5" :disabled="(store.selectedIds?.length || 0) === 0">
        <i class="bi bi-stack me-1"></i> x5
      </button>

      <button class="btn btn-outline-secondary" type="button" @click="group" :disabled="!canGroup">
        <i class="bi bi-collection me-1"></i> Agrupar
      </button>

      <button class="btn btn-outline-secondary" type="button" @click="ungroup" :disabled="!canUngroup">
        <i class="bi bi-collection me-1"></i> Desagrupar
      </button>

      <button
        class="btn btn-outline-secondary"
        type="button"
        @click="toggleLock"
        :disabled="(store.selectedIds?.length || 0) === 0"
      >
        <i :class="lockIcon" class="me-1"></i> {{ lockLabel }}
      </button>

      <button class="btn btn-outline-danger" type="button" @click="del" :disabled="(store.selectedIds?.length || 0) === 0">
        <i class="bi bi-trash me-1"></i> Eliminar
      </button>
    </div>

    <!-- Vista -->
    <div class="btn-group btn-group-sm" role="group">
      <button class="btn btn-outline-secondary" type="button" @click="store.toggleGrid()">
        <i class="bi bi-grid me-1"></i> {{ store.settings.grid ? 'Grid on' : 'Grid off' }}
      </button>

      <button class="btn btn-outline-secondary" type="button" @click="toggleSnap">
        <i class="bi bi-magnet me-1"></i> {{ store.settings.snap ? 'Snap on' : 'Snap off' }}
      </button>

      <button class="btn btn-outline-secondary" type="button" @click="store.resetView()">
        <i class="bi bi-aspect-ratio me-1"></i> Reset vista
      </button>
    </div>

    <div class="ms-auto d-flex align-items-center gap-2">
      <div class="small text-muted">
        <span v-if="store.autosave.isDirty">Cambios sin guardar</span>
        <span v-else>Guardado</span>
        <span v-if="store.autosave.lastSavedAt" class="ms-2">({{ lastSavedText }})</span>
      </div>

      <button class="btn btn-sm btn-primary" type="button" @click="openExportPng">
        <i class="bi bi-download me-1"></i> Exportar PNG
      </button>
    </div>

    <!-- Export PNG Modal -->
    <div class="modal fade" ref="modalEl" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Exportar PNG</h5>
            <button type="button" class="btn-close" @click="closeExportPng" aria-label="Cerrar"></button>
          </div>

          <div class="modal-body">
            <div class="mb-3">
              <label class="form-label">Nombre de archivo</label>
              <input class="form-control" v-model.trim="exportForm.fileName" placeholder="diseno.png" />
              <div class="form-text">Se descargará como PNG.</div>
            </div>

            <div class="mb-3">
              <label class="form-label">Calidad</label>
              <select class="form-select" v-model.number="exportForm.pixelRatio">
                <option :value="1">1x (rápido)</option>
                <option :value="2">2x (recomendado)</option>
                <option :value="3">3x (alta)</option>
              </select>
            </div>

            <div class="form-check form-switch">
              <input class="form-check-input" type="checkbox" role="switch" v-model="exportForm.cropToContent" />
              <label class="form-check-label">Recortar al contenido</label>
            </div>

            <div class="text-muted small mt-2">
              Si recortas, se exporta solo el área donde hay globos (con margen).
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-outline-secondary" type="button" @click="closeExportPng">Cancelar</button>
            <button class="btn btn-primary" type="button" @click="doExportPng">Exportar</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { Modal } from 'bootstrap'
import { useEditorStore } from '@/stores/editor.store'

const store = useEditorStore()

const modalEl = ref(null)
let modal = null

const exportForm = reactive({
  fileName: 'diseno.png',
  pixelRatio: 2,
  cropToContent: true,
})

const lastSavedText = computed(() => {
  if (!store.autosave.lastSavedAt) return ''
  const d = new Date(store.autosave.lastSavedAt)
  return d.toLocaleTimeString()
})

const canGroup = computed(() => {
  const sel = store.selectedNodes || []
  const unlocked = sel.filter(n => !n.locked)
  return unlocked.length >= 2
})

const canUngroup = computed(() => {
  const sel = store.selectedNodes || []
  return sel.some(n => !!n.groupId)
})

const lockLabel = computed(() => {
  const sel = store.selectedNodes || []
  if (!sel.length) return 'Bloquear'
  const allLocked = sel.every(n => !!n.locked)
  return allLocked ? 'Desbloquear' : 'Bloquear'
})

const lockIcon = computed(() => {
  const sel = store.selectedNodes || []
  if (!sel.length) return 'bi bi-lock'
  const allLocked = sel.every(n => !!n.locked)
  return allLocked ? 'bi bi-unlock' : 'bi bi-lock'
})


onMounted(() => {
  if (modalEl.value) modal = new Modal(modalEl.value, { backdrop: 'static' })
})

onBeforeUnmount(() => {
  modal?.hide?.()
  modal = null
})

function add() {
  store.addNode()
}

function del() {
  store.deleteSelected()
}

function duplicate() {
  // si hay multi, duplica todo (si solo hay uno, igual funciona)
  if ((store.selectedIds?.length || 0) > 1) store.duplicateSelectedMany({ count: 1, stepX: 18, stepY: 18 })
  else store.duplicateSelected({ offset: 18 })
}

function duplicate5() {
  store.duplicateSelectedMany({ count: 5, stepX: 18, stepY: 18 })
}

function group() {
  store.groupSelection()
}

function ungroup() {
  store.ungroupSelection()
}

function toggleLock() {
  store.toggleLockSelection()
}

function toggleSnap() {
  store.settings.snap = !store.settings.snap
  store.markDirty()
}

function openExportPng() {
  modal?.show?.()
}

function closeExportPng() {
  modal?.hide?.()
}

function doExportPng() {
  const fileName = exportForm.fileName?.trim() || 'diseno.png'
  store.exportPng({
    pixelRatio: exportForm.pixelRatio,
    cropToContent: exportForm.cropToContent,
    fileName: fileName.endsWith('.png') ? fileName : `${fileName}.png`,
  })
  closeExportPng()
}

function exportJson() {
  const name = prompt('Nombre del archivo JSON:', 'diseno.json')
  if (name === null) return
  const fileName = (name || 'diseno.json').trim() || 'diseno.json'
  store.exportJson({ fileName })
}

async function onImportFile(e) {
  const file = e.target.files?.[0] || null
  e.target.value = '' // permitir reimportar el mismo archivo
  if (!file) return

  try {
    const text = await file.text()
    const data = JSON.parse(text)
    store.importJsonObject(data)
  } catch (err) {
    window.alert('No se pudo importar el JSON. Verifica que sea válido.')
  }
}
</script>

<style lang="less" scoped>
.file-item {
  cursor: pointer;
}
</style>
