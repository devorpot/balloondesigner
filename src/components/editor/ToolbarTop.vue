<template>
  <div class="d-flex gap-2 align-items-center w-100">
    <!-- Archivo -->
    <div class="btn-group btn-group-sm" role="group">
      <button
        class="btn btn-outline-secondary dropdown-toggle"
        type="button"
        data-bs-toggle="dropdown"
      >
        <i class="bi bi-folder2-open me-1"></i> Archivo
      </button>

      <ul class="dropdown-menu">
        <li>
          <button class="dropdown-item" type="button" @click="store.newDesign()">
            Nuevo diseño
          </button>
        </li>

        <li>
          <button
            class="dropdown-item"
            type="button"
            @click="store.restoreDesignPrompt()"
            :disabled="!store.canRestore"
          >
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
          <button class="dropdown-item" type="button" @click="openExportPng">Exportar PNG</button>
        </li>

        <li>
          <button class="dropdown-item" type="button" @click="exportJson">Exportar JSON</button>
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
      <button class="btn btn-outline-secondary" type="button" @click="add" title="Agregar globo">
        <i class="bi bi-plus-lg"></i>
      </button>
      <button
        class="btn btn-outline-secondary"
        type="button"
        @click="addText"
        title="Agregar texto"
      >
        <i class="bi bi-type"></i>
      </button>
      <button
        class="btn btn-outline-secondary"
        type="button"
        @click="triggerImage"
        title="Agregar imagen"
      >
        <i class="bi bi-image"></i>
      </button>
      <input
        ref="imageInput"
        type="file"
        accept="image/png,image/jpeg"
        class="d-none"
        @change="onImageFile"
      />
      <button
        class="btn btn-outline-secondary"
        type="button"
        @click="duplicate"
        :disabled="selCount === 0"
        title="Duplicar (Ctrl/Cmd+D)"
      >
        <i class="bi bi-files"></i>
      </button>
      <button
        class="btn btn-outline-secondary"
        type="button"
        @click="groupSelection"
        :disabled="selCount < 2"
        title="Agrupar selección"
      >
        <i class="bi bi-folder-plus"></i>
      </button>
      <button
        class="btn btn-outline-secondary"
        type="button"
        @click="ungroup"
        :disabled="!store.selectedGroupId"
        title="Desagrupar"
      >
        <i class="bi bi-folder-symlink"></i>
      </button>

      <button
        class="btn btn-outline-secondary"
        type="button"
        @click="toggleLock"
        :disabled="selCount === 0"
        :title="lockLabel"
      >
        <i class="bi" :class="lockIcon"></i>
      </button>
    </div>

    <div class="btn-group btn-group-sm" role="group">
      <button
        class="btn btn-outline-secondary"
        type="button"
        @click="sendBackward"
        :disabled="selCount === 0"
        title="Enviar atrás (Ctrl/Cmd+[)"
      >
        <i class="bi bi-chevron-down"></i>
      </button>
      <button
        class="btn btn-outline-secondary"
        type="button"
        @click="bringForward"
        :disabled="selCount === 0"
        title="Traer adelante (Ctrl/Cmd+])"
      >
        <i class="bi bi-chevron-up"></i>
      </button>
      <button
        class="btn btn-outline-secondary"
        type="button"
        @click="sendToBack"
        :disabled="selCount === 0"
        title="Enviar al fondo (Ctrl/Cmd+Shift+[)"
      >
        <i class="bi bi-chevron-double-down"></i>
      </button>
      <button
        class="btn btn-outline-secondary"
        type="button"
        @click="bringToFront"
        :disabled="selCount === 0"
        title="Traer al frente (Ctrl/Cmd+Shift+])"
      >
        <i class="bi bi-chevron-double-up"></i>
      </button>
    </div>

    <div class="btn-group btn-group-sm" role="group">
      <button
        class="btn btn-outline-danger"
        type="button"
        @click="del"
        :disabled="selCount === 0"
        title="Eliminar (Supr)"
      >
        <i class="bi bi-trash"></i>
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
      <button class="btn btn-outline-secondary" type="button" @click="openMaterialsModal">
        <i class="bi bi-boxes me-1"></i> Materiales
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
            <button
              type="button"
              class="btn-close"
              @click="closeExportPng"
              aria-label="Cerrar"
            ></button>
          </div>

          <div class="modal-body">
            <div class="mb-3">
              <label class="form-label">Nombre de archivo</label>
              <input
                class="form-control"
                v-model.trim="exportForm.fileName"
                placeholder="diseno.png"
              />
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
              <input
                class="form-check-input"
                type="checkbox"
                role="switch"
                v-model="exportForm.cropToContent"
              />
              <label class="form-check-label">Recortar al contenido</label>
            </div>

            <div class="text-muted small mt-2">
              Si recortas, se exporta solo el área donde hay globos (con margen).
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-outline-secondary" type="button" @click="closeExportPng">
              Cancelar
            </button>
            <button class="btn btn-primary" type="button" @click="doExportPng">Exportar</button>
          </div>
        </div>
      </div>
    </div>
    <div class="modal fade" ref="materialsModalEl" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-xl modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Materiales</h5>
            <button
              type="button"
              class="btn-close"
              @click="closeMaterialsModal"
              aria-label="Cerrar"
            ></button>
          </div>
          <div class="modal-body">
            <MaterialsPanel />
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
import MaterialsPanel from '@/components/editor/MaterialsPanel.vue'

const store = useEditorStore()

const selCount = computed(() => store.selectedIds?.length || 0)

const lockLabel = computed(() => {
  const sel = store.selectedNodes || []
  const anyUnlocked = sel.some((n) => !n.locked)
  return anyUnlocked ? 'Bloquear' : 'Desbloquear'
})

const lockIcon = computed(() => {
  const sel = store.selectedNodes || []
  const anyUnlocked = sel.some((n) => !n.locked)
  return anyUnlocked ? 'bi-lock' : 'bi-unlock'
})

const modalEl = ref(null)
const imageInput = ref(null)
let modal = null
const materialsModalEl = ref(null)
let materialsModal = null

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

onMounted(() => {
  if (modalEl.value) modal = new Modal(modalEl.value, { backdrop: 'static' })
  if (materialsModalEl.value)
    materialsModal = new Modal(materialsModalEl.value, { backdrop: 'static' })
})

onBeforeUnmount(() => {
  modal?.hide?.()
  modal = null
  materialsModal?.hide?.()
  materialsModal = null
})

function add() {
  store.addNode()
}

function addText() {
  store.addTextNode?.()
}

function triggerImage() {
  imageInput.value?.click?.()
}

function onImageFile(e) {
  const file = e.target?.files?.[0]
  if (!file) return
  if (!['image/png', 'image/jpeg'].includes(file.type)) return

  const reader = new FileReader()
  reader.onload = () => {
    const src = String(reader.result || '')
    store.addImageNode?.({ src })
    if (imageInput.value) imageInput.value.value = ''
  }
  reader.readAsDataURL(file)
}

function del() {
  store.deleteSelected()
}

function duplicate() {
  store.duplicateSelected()
}

function groupSelection() {
  store.groupSelection()
}

function ungroup() {
  store.ungroupSelected()
}

function toggleLock() {
  if (typeof store.toggleLockSelection === 'function') {
    store.toggleLockSelection()
    return
  }

  const ids = Array.isArray(store.selectedIds) ? store.selectedIds : []
  for (const id of ids) store.toggleLock(id)
}

function bringToFront() {
  store.bringToFrontSelected?.()
}

function sendToBack() {
  store.sendToBackSelected?.()
}

function bringForward() {
  store.bringForwardSelected?.()
}

function sendBackward() {
  store.sendBackwardSelected?.()
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

function openMaterialsModal() {
  materialsModal?.show?.()
}

function closeMaterialsModal() {
  materialsModal?.hide?.()
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
  } catch {
    window.alert('No se pudo importar el JSON. Verifica que sea válido.')
  }
}
</script>

<style lang="less" scoped>
.file-item {
  cursor: pointer;
}
</style>
