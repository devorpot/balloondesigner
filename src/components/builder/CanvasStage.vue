<template>
  <EditorCanvasStage
    @guide-paint="(payload) => emit('guide-paint', payload)"
    @guide-inflate="(payload) => emit('guide-inflate', payload)"
    @toolbar-inflate="(payload) => emit('toolbar-inflate', payload)"
    @toolbar-rotate-cluster="(payload) => emit('toolbar-rotate-cluster', payload)"
  />
</template>

<script setup>
import EditorCanvasStage from '@/components/editor/CanvasStage.vue'

const emit = defineEmits([
  'guide-paint',
  'guide-inflate',
  'toolbar-inflate',
  'toolbar-rotate-cluster',
])
</script>
