<template>
  <EditorLayout>
    <template #topbar>
      <ToolbarTop />
    </template>

    <div class="grid" @keydown="onKeyDown" tabindex="0" ref="wrap">
      <!-- Left column -->
      <div class="left">
        <SidebarCatalog />
        <PropertiesPanel />

       

        
      </div>

      <!-- Center -->
      <CanvasStage />

      <!-- Right column -->
      <div class="right">
        <LayerPanel />
         <AlignPanel />
         <MaterialsPanel />
      </div>
    </div>
  </EditorLayout>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useEditorStore } from '@/stores/editor.store'

import EditorLayout from '@/layouts/EditorLayout.vue'
import ToolbarTop from '@/components/editor/ToolbarTop.vue'
import SidebarCatalog from '@/components/editor/SidebarCatalog.vue'
import CanvasStage from '@/components/editor/CanvasStage.vue'
import LayerPanel from '@/components/editor/LayerPanel.vue'
import PropertiesPanel from '@/components/editor/PropertiesPanel.vue'
import MaterialsPanel from '@/components/editor/MaterialsPanel.vue'
import AlignPanel from '@/components/editor/AlignPanel.vue'

const store = useEditorStore()
const wrap = ref(null)

onMounted(() => {
  store.initAutosave()
  wrap.value?.focus?.()

})

onBeforeUnmount(() => {
  store.destroyAutosave()
})

function isTypingTarget(e) {
  const tag = (e.target?.tagName || '').toLowerCase()
  return tag === 'input' || tag === 'textarea' || tag === 'select' || e.target?.isContentEditable
}

function onKeyDown(e) {
  const key = e.key.toLowerCase()
  const isCmd = e.metaKey || e.ctrlKey

  if (key === 'escape') {
    store.clearSelection()
    return
  }

  if ((key === 'delete' || key === 'backspace') && !isTypingTarget(e)) {
    store.deleteSelected()
    return
  }

  if (isCmd && key === 'd') {
    e.preventDefault()
    store.duplicateSelected()
    return
  }

  if (isTypingTarget(e)) return

  const step = e.shiftKey ? 10 : 1

  // Mover todos los seleccionados
  if (key === 'arrowleft') {
    e.preventDefault()
    nudgeSelection(-step, 0)
    return
  }
  if (key === 'arrowright') {
    e.preventDefault()
    nudgeSelection(step, 0)
    return
  }
  if (key === 'arrowup') {
    e.preventDefault()
    nudgeSelection(0, -step)
    return
  }
  if (key === 'arrowdown') {
    e.preventDefault()
    nudgeSelection(0, step)
    return
  }
   // Undo / Redo (pro)
  if (isCmd && key === 'z' && !e.shiftKey) {
    e.preventDefault()
    store.undo()
    return
  }

  if (isCmd && key === 'z' && e.shiftKey) {
    e.preventDefault()
    store.redo()
    return
  }

  // Ctrl+Y (Windows) redo
  if ((e.ctrlKey && key === 'y') || (isCmd && key === 'y')) {
    e.preventDefault()
    store.redo()
    return
  }

}

function nudgeSelection(dx, dy) {
  const ids = Array.isArray(store.selectedIds) ? store.selectedIds : []
  if (!ids.length) return

  const snapOn = !!store.settings?.snap
  const s = Number(store.settings?.snapStep || 1)

  for (const id of ids) {
    const n = store.nodes.find(x => x.id === id)
    if (!n || n.locked) continue

    const nextX = Number(n.x || 0) + dx
    const nextY = Number(n.y || 0) + dy

    if (snapOn) {
      store.updateNode(n.id, { x: snap(nextX, s), y: snap(nextY, s) })
    } else {
      store.updateNode(n.id, { x: nextX, y: nextY })
    }
  }
}

function snap(v, step) {
  const s = Number(step) || 1
  return Math.round(v / s) * s
}
</script>

<style lang="less" scoped>
.grid {
  display: grid;
  grid-template-columns: 300px 1fr 320px;
  gap: 12px;
  height: calc(100vh - 56px - 24px);
  outline: none;
}

.left {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
}

.right {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
}
</style>
