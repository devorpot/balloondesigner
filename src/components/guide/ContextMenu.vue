<template>
  <div
    v-if="show"
    ref="menuRef"
    class="cm"
    :style="{ left: `${menuPos.x}px`, top: `${menuPos.y}px` }"
    @mousedown.stop
    @click.stop
  >
    <button class="item" type="button" :disabled="!canCopy" @click="emitAction('copy')">
      <span class="label"><i class="bi bi-clipboard"></i> Copiar</span>
      <span class="hint">Ctrl/Cmd+C</span>
    </button>

    <button class="item" type="button" :disabled="!canPaste" @click="emitAction('paste')">
      <span class="label"><i class="bi bi-clipboard-plus"></i> Pegar</span>
      <span class="hint">Ctrl/Cmd+V</span>
    </button>

    <button class="item" type="button" :disabled="!canPaste" @click="emitAction('paste-multi')">
      <span class="label"><i class="bi bi-clipboard-plus"></i> Pegar varias veces</span>
      <span class="hint">ESC</span>
    </button>

    <button class="item" type="button" :disabled="!canCopy" @click="emitAction('duplicate')">
      <span class="label"><i class="bi bi-files"></i> Duplicar</span>
      <span class="hint">Ctrl/Cmd+D</span>
    </button>

    <div class="sep"></div>

    <div
      class="submenu"
      :class="{ 'flip-x': submenuState.group.flipX, 'flip-y': submenuState.group.flipY }"
      @mouseenter="onSubmenuEnter('group', $event)"
    >
      <button class="item" type="button" :disabled="!canGroup && !canUngroup">
        <span class="label"><i class="bi bi-collection"></i> Agrupar</span>
        <span class="hint">▶</span>
      </button>
      <div ref="groupPanel" class="submenu-panel">
        <button class="item" type="button" :disabled="!canGroup" @click="emitAction('group')">
          <span class="label">Agrupar selección</span>
          <span class="hint">Ctrl/Cmd+G</span>
        </button>
        <button class="item" type="button" :disabled="!canUngroup" @click="emitAction('ungroup')">
          <span class="label">Desagrupar</span>
          <span class="hint">Ctrl/Cmd+Shift+G</span>
        </button>
      </div>
    </div>

    <div class="sep"></div>

    <button
      class="item"
      type="button"
      :disabled="!canCreateSymbol"
      @click="emitAction('create-symbol')"
    >
      <span class="label"><i class="bi bi-stars"></i> Crear simbolo</span>
    </button>

    <button
      class="item"
      type="button"
      :disabled="!canEditSymbol"
      @click="emitAction('edit-symbol')"
    >
      <span class="label"><i class="bi bi-pen"></i> Editar simbolo</span>
    </button>

    <button
      class="item"
      type="button"
      :disabled="!canExitSymbol"
      @click="emitAction('exit-symbol')"
    >
      <span class="label"><i class="bi bi-box-arrow-left"></i> Salir de simbolo</span>
    </button>

    <button
      class="item danger"
      type="button"
      :disabled="!canDetachSymbol"
      @click="emitAction('detach-symbol')"
    >
      <span class="label"><i class="bi bi-unlink"></i> Desvincular simbolo</span>
    </button>

    <button class="item" type="button" :disabled="!canCopy" @click="emitAction('toggle-lock')">
      <span class="label"><i class="bi bi-lock"></i> Bloquear</span>
      <span class="hint">Ctrl/Cmd+L</span>
    </button>

    <div
      class="submenu"
      :class="{ 'flip-x': submenuState.order.flipX, 'flip-y': submenuState.order.flipY }"
      @mouseenter="onSubmenuEnter('order', $event)"
    >
      <button class="item" type="button" :disabled="!canCopy">
        <span class="label"><i class="bi bi-layers"></i> Orden</span>
        <span class="hint">▶</span>
      </button>
      <div ref="orderPanel" class="submenu-panel">
        <button
          class="item"
          type="button"
          :disabled="!canCopy"
          @click="emitAction('bring-forward')"
        >
          <span class="label">Adelante</span>
          <span class="hint">Ctrl/Cmd+]</span>
        </button>
        <button
          class="item"
          type="button"
          :disabled="!canCopy"
          @click="emitAction('send-backward')"
        >
          <span class="label">Atrás</span>
          <span class="hint">Ctrl/Cmd+[</span>
        </button>
        <button class="item" type="button" :disabled="!canCopy" @click="emitAction('bring-front')">
          <span class="label">Al frente</span>
          <span class="hint">Ctrl/Cmd+Shift+]</span>
        </button>
        <button class="item" type="button" :disabled="!canCopy" @click="emitAction('send-back')">
          <span class="label">Al fondo</span>
          <span class="hint">Ctrl/Cmd+Shift+[</span>
        </button>
      </div>
    </div>

    <div class="sep"></div>

    <button class="item danger" type="button" :disabled="!canCopy" @click="emitAction('delete')">
      <span class="label"><i class="bi bi-trash"></i> Eliminar</span>
      <span class="hint">Del</span>
    </button>
  </div>
</template>

<script setup>
import { nextTick, reactive, ref, watch } from 'vue'

const props = defineProps({
  show: { type: Boolean, default: false },
  pos: { type: Object, default: () => ({ x: 0, y: 0 }) },
  canCopy: { type: Boolean, default: false },
  canPaste: { type: Boolean, default: false },
  canGroup: { type: Boolean, default: false },
  canUngroup: { type: Boolean, default: false },
  canCreateSymbol: { type: Boolean, default: false },
  canEditSymbol: { type: Boolean, default: false },
  canExitSymbol: { type: Boolean, default: false },
  canDetachSymbol: { type: Boolean, default: false },
})

const emit = defineEmits(['action', 'close'])

const menuRef = ref(null)
const menuPos = ref({ x: 0, y: 0 })
const groupPanel = ref(null)
const orderPanel = ref(null)
const submenuState = reactive({
  group: { flipX: false, flipY: false },
  order: { flipX: false, flipY: false },
})

const menuPadding = 8

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function updateMenuPosition() {
  const el = menuRef.value
  if (!el) return

  const rect = el.getBoundingClientRect()
  const maxX = Math.max(menuPadding, window.innerWidth - rect.width - menuPadding)
  const maxY = Math.max(menuPadding, window.innerHeight - rect.height - menuPadding)
  const next = {
    x: clamp(props.pos.x, menuPadding, maxX),
    y: clamp(props.pos.y, menuPadding, maxY),
  }

  if (next.x !== menuPos.value.x || next.y !== menuPos.value.y) {
    menuPos.value = next
  }
}

watch(
  () => [props.show, props.pos.x, props.pos.y],
  async ([show]) => {
    if (!show) return
    menuPos.value = { x: props.pos.x, y: props.pos.y }
    await nextTick()
    updateMenuPosition()
  },
)

function onSubmenuEnter(name, event) {
  const panel = name === 'group' ? groupPanel.value : orderPanel.value
  const trigger = event?.currentTarget
  if (!panel || !trigger) return

  const panelRect = panel.getBoundingClientRect()
  const triggerRect = trigger.getBoundingClientRect()
  const flipX = triggerRect.right + panelRect.width + menuPadding > window.innerWidth
  const flipY = triggerRect.top + panelRect.height + menuPadding > window.innerHeight

  submenuState[name].flipX = flipX
  submenuState[name].flipY = flipY
}

function emitAction(name) {
  emit('action', name)
  emit('close')
}
</script>

<style lang="less" scoped>
.cm {
  position: fixed;
  z-index: 9999;
  width: 210px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: #1f2430;
  color: #eef1f6;
  box-shadow: 0 14px 28px rgba(10, 12, 16, 0.35);
  padding: 6px;
}

.item {
  width: 100%;
  border: 0;
  background: transparent;
  text-align: left;
  padding: 8px 8px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 0.8rem;
  color: inherit;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
  }

  &:disabled {
    opacity: 0.45;
  }
}

.danger:hover {
  background: rgba(220, 53, 69, 0.18);
}

.sep {
  height: 1px;
  background: rgba(255, 255, 255, 0.08);
  margin: 6px 0;
}

.hint {
  font-size: 0.65rem;
  color: rgba(255, 255, 255, 0.55);
  white-space: nowrap;
}

.label {
  display: flex;
  align-items: center;
  gap: 8px;
}

.submenu {
  position: relative;
}

.submenu-panel {
  position: absolute;
  top: 0;
  left: calc(100% + 6px);
  width: 210px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: #1f2430;
  color: #eef1f6;
  box-shadow: 0 14px 28px rgba(10, 12, 16, 0.35);
  padding: 6px;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  z-index: 10000;
}

.submenu:hover .submenu-panel {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
}

.submenu.flip-x .submenu-panel {
  left: auto;
  right: calc(100% + 6px);
}

.submenu.flip-y .submenu-panel {
  top: auto;
  bottom: 0;
}
</style>
