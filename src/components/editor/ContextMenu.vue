<template>
  <div v-if="show" class="cm" :style="{ left: `${pos.x}px`, top: `${pos.y}px` }" @mousedown.stop @click.stop>
    <button class="item" type="button" :disabled="!canCopy" @click="emitAction('copy')">
      <i class="bi bi-clipboard me-2"></i> Copiar
      <span class="hint">Ctrl/Cmd+C</span>
    </button>

    <button class="item" type="button" :disabled="!canPaste" @click="emitAction('paste')">
      <i class="bi bi-clipboard-plus me-2"></i> Pegar
      <span class="hint">Ctrl/Cmd+V</span>
    </button>
    <button class="item" type="button" :disabled="!canPaste" @click="emitAction('paste-multi')">
    <i class="bi bi-clipboard-plus me-2"></i> Pegar varias veces
    <span class="hint">ESC para salir</span>
  </button>


    <button class="item" type="button" :disabled="!canCopy" @click="emitAction('duplicate')">
      <i class="bi bi-files me-2"></i> Duplicar
      <span class="hint">Ctrl/Cmd+D</span>
    </button>

    <button class="item" type="button" :disabled="!canCopy" @click="emitAction('duplicate-5')">
      <i class="bi bi-stack me-2"></i> Duplicar x5
      <span class="hint">Ctrl/Cmd+Shift+D</span>
    </button>

    <div class="sep"></div>

    <button class="item" type="button" :disabled="!canGroup" @click="emitAction('group')">
      <i class="bi bi-collection me-2"></i> Agrupar
      <span class="hint">Ctrl/Cmd+G</span>
    </button>

    <button class="item" type="button" :disabled="!canUngroup" @click="emitAction('ungroup')">
      <i class="bi bi-collection me-2"></i> Desagrupar
      <span class="hint">Ctrl/Cmd+Shift+G</span>
    </button>

    <button class="item" type="button" :disabled="!canLock" @click="emitAction('toggle-lock')">
      <i class="bi bi-lock me-2"></i> Bloquear / Desbloquear
      <span class="hint">Ctrl/Cmd+L</span>
    </button>

    <div class="sep"></div>

    <button class="item danger" type="button" :disabled="!canCopy" @click="emitAction('delete')">
      <i class="bi bi-trash me-2"></i> Eliminar
      <span class="hint">Del</span>
    </button>
  </div>
</template>

<script setup>
const props = defineProps({
  show: { type: Boolean, default: false },
  pos: { type: Object, default: () => ({ x: 0, y: 0 }) },
  canCopy: { type: Boolean, default: false },
  canPaste: { type: Boolean, default: false },
  canGroup: { type: Boolean, default: false },
  canUngroup: { type: Boolean, default: false },
  canLock: { type: Boolean, default: false },
})

const emit = defineEmits(['action', 'close'])

function emitAction(name) {
  emit('action', name)
  emit('close')
}
</script>

<style lang="less" scoped>
.cm {
  position: fixed;
  z-index: 9999;
  width: 240px;
  border-radius: 14px;
  border: 1px solid rgba(0,0,0,.12);
  background: #fff;
  box-shadow: 0 10px 30px rgba(0,0,0,.12);
  padding: 8px;
}

.item {
  width: 100%;
  border: 0;
  background: transparent;
  text-align: left;
  padding: 10px 10px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;

  &:hover {
    background: rgba(0,0,0,.05);
  }

  &:disabled {
    opacity: .5;
  }
}

.danger:hover {
  background: rgba(220,53,69,.10);
}

.sep {
  height: 1px;
  background: rgba(0,0,0,.10);
  margin: 6px 0;
}

.hint {
  font-size: 0.75rem;
  color: rgba(0,0,0,.45);
  white-space: nowrap;
}
</style>
