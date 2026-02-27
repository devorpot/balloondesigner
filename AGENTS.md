# AGENTS — Balloon Designer Repository Guide

This guide orients agentic coding assistants for this repo: commands, architecture, and style rules.

## 1. Agent role and success criteria

- Be a full collaborator: deliver complete code, not fragments.
- Stack: Vue 3 + `<script setup>` + Pinia + Vue Konva + Bootstrap utilities.
- Prioritize correctness in Pinia actions and component stores before polish.
- Preserve multi-selection, grouping, autosave, and Transformer wiring.
- Never mutate Konva nodes directly; update the store and let Konva re-render.
- Keep `selectedIds` as the source of truth; `selectedId` only when length is 1.

## 2. Commands (build/lint/test)

1. Install: `npm install` (uses `package-lock.json`).
2. Node: `^20.19.0 || >=22.12.0` (see `package.json` engines).
3. Dev server: `npm run dev` (Vite, hot reload).
4. Build: `npm run build`; Preview: `npm run preview`.
5. Lint all: `npm run lint` (runs `lint:oxlint` and `lint:eslint`, both with `--fix`).
6. Lint single file: `npx oxlint path/to/file` and `npx eslint path/to/file`.
7. Format: `npm run format` (Prettier on `src/`).
8. Tests: no test runner or `npm run test` script configured yet.
9. Single-test guidance: when adding tests, create scripts like `test:unit` and support `npm run test:unit -- path/to/test` (or framework equivalent).
10. Manual QA: run `npm run dev` and exercise catalog, canvas selection/move, and autosave.

## 3. Project map and key files

- App entry: `src/main.js` bootstraps Vue + Pinia.
- Root shell: `src/App.vue` and layouts in `src/layouts/`.
- Routing: `src/router/index.js` and pages in `src/pages/`.
- Editor canvas: `src/components/editor/CanvasStage.vue`.
- Guide/structure canvases: `src/components/guide/CanvasStage.vue`, `src/components/structure/CanvasStage.vue`.
- Stores: `src/stores/editor.store.js`, `catalog.store.js`, `guide.store.js`, `structure.store.js`.
- Catalog UI: `src/components/editor/SidebarCatalog.vue` and families panel.
- Architecture docs: `docs/` (start with `docs/overview.md`).

## 4. Delivery expectations (AGENT_PROMPT.md)

- Provide complete, runnable code; avoid partial snippets.
- Keep existing structure, imports, and naming conventions intact.
- If refactoring substantially, include verification steps or examples.
- Prefer minimal, focused diffs over large rewrites.

## 5. Architecture reminders (docs/\*.md + AGENT_PROMPT.md)

### Pinia store rules (docs/02-state-architecture.md)

- `editor` store holds nodes, selection, view/settings, clipboard, and autosave metadata.
- Never duplicate state locally; derive via getters/computed.
- `selectedIds` governs selection; `selectedId` is only for compatibility.
- Store actions should validate inputs and return useful values to callers.

### Canvas and Konva rules (docs/03-canvas-architecture.md)

- `CanvasStage.vue` controls zoom, pan, selection, and Transformer binding.
- Avoid storing rehydrated Konva nodes locally; rely on store + refs.
- Every rendered shape must carry an `id` that matches a store node.
- Keep event names consistent: `onNodeClick`, `onNodeDragMove`, `onStageClick`.

### Selection/Grouping rules (docs/04-grouping-and-selection.md)

- Normal click replaces selection; Shift/Ctrl extends; stage click clears.
- Grouping is virtual: `selectedIds` represents the group.
- Multi-drag uses a delta computed from the store for all selected nodes.

### Catalog expectations (docs/05-catalog-integration.md)

- Catalog UI builds nodes via store actions; search/filtering stays separate.
- `SidebarCatalog` should only create nodes; cost stays outside.
- Preserve autosave state after adding catalog nodes.

## 6. Imports and module conventions

- Repo is ESM (`"type": "module"`); use `import`/`export`.
- Prefer `@/` aliases for `src/` modules (e.g., `@/stores/editor.store.js`).
- Group imports: Vue/core, third-party libs, then local files.
- Declare stores at top of `<script setup>`: `const editor = useEditorStore()`.
- Avoid deep destructuring from Pinia stores; access getters as properties to keep reactivity.

## 7. Vue component style

- Use `<script setup>` + Composition API; avoid Options API unless required.
- Keep template for markup, script for logic, styles last.
- Prefer `ref`/`computed` for reactive state; keep templates lean.
- Prefer `v-model` and `:prop` bindings over manual event plumbing.
- Name emitted events semantically (`onAddNode`, `onAlignNodes`).
- Keep watchers near the computed state they track.
- Avoid raw `document` queries; use refs + lifecycle hooks.

## 8. Template & CSS guidance

- Use Bootstrap utility classes; reuse existing layout patterns.
- Indentation is 2 spaces; keep consistent with nearby files.
- Prefer `:class`/`:style` bindings over string concatenation.
- Use semantic elements (buttons for actions, sections for panels).
- Prefer CSS variables for theming; avoid overriding Bootstrap inline.
- Add scoped styles only when necessary.

## 9. Formatting & linting settings

- Prettier config in `.prettierrc.json`: `semi: false`, `singleQuote: true`, `printWidth: 100`.
- EditorConfig in `.editorconfig`: 2 spaces, LF, trim trailing whitespace, final newline, 100 max line length.
- ESLint config in `eslint.config.js` uses Vue essential + oxlint; follow automated fixes.
- Oxlint config lives in `.oxlintrc.json` (invoked by eslint plugin and `oxlint`).

## 10. Types & data

- No TypeScript config present; keep code in plain JS and Vue SFCs.
- Avoid TS-only syntax; use simple JS objects and runtime guards instead.
- Coerce optional fields before use (e.g., `String(name || '')`, `Number(cost || 0)`).

## 11. Naming conventions

- Components are PascalCase and match filenames (e.g., `CanvasStage.vue`).
- Stores follow `useXStore()` in `src/stores/x.store.js`.
- Refs/computed variables are noun-based; actions are verb-based.
- Event handlers use `handle`/`on` prefixes.
- Getter names describe returned data (`lineSummaries`, `materialOptions`).

## 12. Error handling & guards

- Wrap DOM-dependent logic in `try/catch` when stage refs may be missing.
- Check for undefined stores, arrays, or methods before use.
- Log errors with context; avoid silent failures.
- Fail fast on missing required data but return user-friendly fallbacks.
- Guard browser-only code with `if (!window)` in async actions if needed.
- Prefer early returns and small helpers for complex branching.

## 13. Comments and documentation

- Keep comments in Spanish where the project already uses them.
- Comment intent, not obvious code.
- If architecture rules change, update `docs/*.md` and this file.

## 14. Cursor / Copilot rules

- No `.cursor/rules/` or `.cursorrules` files present.
- No `.github/copilot-instructions.md` present.

## 15. Verification and handoff

- After store/canvas changes, run `npm run lint` and manual UI checks.
- Note any manual steps or open questions in your handoff.
- When adding new scripts, update this file.

## 16. Store interaction patterns

- Always mutate the `editor` store via actions, not direct component writes.
- Keep selectors derived with `computed` to stay reactive.
- Actions should return created/updated payloads when possible.
- Mark `autosave.isDirty` in actions that mutate nodes.

## 17. Canvas interaction naming

- Use `handleX`/`onX` naming for canvas hooks (e.g., `onStageClick`).
- Keep multi-node transforms centralized in `CanvasStage.vue`.
- Read `editor.selectedIds` when driving the Transformer.
- Convert Konva event payloads to store-friendly primitives early.

## 18. Autosave & persistence

- Autosave metadata lives under `editor.autosave`.
- Toggle `autosave.isDirty` once per action to avoid thrash.
- Set `autosave.lastSavedAt` after persistence completes (ISO timestamps).
- Keep persistence logic out of UI components.
