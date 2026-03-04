<template>
  <EditorCanvasStage
    @toolbar-inflate="(payload) => emit('toolbar-inflate', payload)"
    @toolbar-rotate-cluster="(payload) => emit('toolbar-rotate-cluster', payload)"
  />
</template>

<script setup>
import EditorCanvasStage from '@/components/editor/CanvasStage.vue'

const emit = defineEmits(['toolbar-inflate', 'toolbar-rotate-cluster'])
</script>
