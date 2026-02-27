import { inject, provide } from 'vue'
import { useEditorStore } from '@/stores/editor.store'

export const editorStoreKey = Symbol('editor-store')

export function provideEditorStore(store) {
  provide(editorStoreKey, store)
}

export function useActiveEditorStore() {
  return inject(editorStoreKey, null) || useEditorStore()
}
