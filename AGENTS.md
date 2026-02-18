# AGENTS — Balloon Designer Repository Guide

This document answers the main questions an agent needs to stay productive: how to set up, which commands matter, what architecture principles to honor, and how to keep the code base consistent. It compiles information from the existing docs (`docs/07-coding-rules.md`, `docs/02-state-architecture.md`, `docs/03-canvas-architecture.md`, `docs/04-grouping-and-selection.md`, `docs/05-catalog-integration.md`) plus the AGENT_PROMPT that governs expectations for every change.

## 1. Agent role and success criteria

- Be a full collaborator: deliver complete code, not fragments, so consumers can copy/paste the entire modified file.
- Remember the stack: Vue 3 + `<script setup>` + Pinia + Konva + Bootstrap utility classes, then tailor suggestions to that environment.
- Prioritize logic correctness, especially in Pinia actions and component stores, before polish.
- Preserve `selectedIds` as the single source of truth for multi-selection; `selectedId` is tolerated only when `selectedIds.length === 1`.
- Never mutate Konva nodes directly: change the store and let Konva re-render through bindings.
- Keep multiple-selection, grouping, autosave, and Transformer wiring intact—those systems depend on existing watchers and derived state.

## 2. Setup and developer commands

1. Install dependencies:
   - `npm install` (uses `package-lock.json`).
2. Node version:
   - Use Node `^20.19.0 || >=22.12.0` (see `package.json` engines).
3. Run the app locally:
   - `npm run dev` (Vite dev server, hot reloads).
4. Preview a production build:
   - `npm run build` to compile.
   - `npm run preview` to serve the generated output.
5. Linting and formatting:
   - `npm run lint` runs both `lint:oxlint` and `lint:eslint` via `run-s`.
   - `npm run lint:oxlint` uses `oxlint . --fix` for style + Vue recommended rules.
   - `npm run lint:eslint` runs `eslint . --fix --cache` to catch standard JS issues.
   - `npm run format` applies Prettier with the existing `src/` pattern.
6. Testing guidance (there is no automated `npm run test` script yet):
   - Run the UI manually via `npm run dev` and exercise scenarios (catalog, canvas, autosave) to validate behavior.
   - When you add tests, introduce a descriptive npm script (for example, `test:unit`, `test:e2e`, or `test:unit -- path/to/test`) and describe it here so future agents can run a single test by name.

## 3. Architecture reminders (captures docs + AGENT_PROMPT)

### Pinia store rules (docs/02-state-architecture)

- `editor` store holds nodes, selectedId(s), view + settings, clipboard, and autosave metadata.
- Never duplicate state properties or copy data from the store into local component state; derive through getters/computed instead.
- `selectedIds` governs selection logic; `selectedId` is for compatibility only when the length is exactly one.
- Store actions should return values for callers when possible and include defensive validation before mutating state.

### Canvas and Konva rules (docs/03-canvas-architecture)

- `CanvasStage.vue` controls zoom, pan, selection, multi-drag, and pins the Transformer to `selectedIds`.
- Avoid storing rehydrated Konva nodes locally; rely on the store and refs that track id-based configs.
- Every rendered shape must carry an `id` that matches the node in the store.
- Common events: `onNodeClick`, `onNodeDragMove`, `onStageClick` (clears selection) — keep naming consistent.

### Selection/Grouping rules (docs/04-grouping-and-selection)

- Normal click replaces selection; `Shift`/`Ctrl` extends it; clicking on the canvas resets it.
- Grouping is virtual: `selectedIds` is the “group” until a real Konva `Group` shape is introduced.
- Dragging multiple nodes uses the delta computed from the store to move all selected nodes consistently.

### Catalog expectations (docs/05-catalog-integration)

- The catalog UI builds nodes via store actions. Keep logic for catalog search/filtering separate from canvas mutations.
- `SidebarCatalog` should only create nodes; cost calculation stays outside the catalog component.
- Preserve autosave state after adding catalog nodes to ensure downstream persistence logic continues to work.

## 4. Imports and module conventions

- This repo uses ESM (`"type": "module"` in `package.json`); prefer `import`/`export` consistently.
- Prefer absolute aliases (`@/stores/...`, `@/components/...`) for stores/components inside `src/` so refactors move cleanly.
- Keep `import` statements grouped: Vue/core (`ref`, `computed`, `watch`, `onMounted`), third-party libs (Pinia, Konva wrappers), and local files last.
- Always annotate store usage with `const store = useXStore()` at the top of script setup so actions and getters are hoisted.
- Avoid deep destructuring from Pinia stores; reference getters via functions (`catalog.filteredLines`) to keep reactivity intact.

## 5. Vue component style

- Use `<script setup>` with the Composition API everywhere; legacy Options API only when the component heavily relies on `defineComponent` for advanced typing.
- Keep template and script sections separated by functionality: template for markup, script for logic, and style blocks (if any) at the bottom.
- Prefer `ref`/`computed` for reactive state; use `const count = ref(0)` rather than storing primitives on `data`.
- Derived data should be `computed` and reused instead of recalculating inside the template.
- Use `v-model` and `:prop` syntax over manual event handling when possible.
- When a component exposes events, name them semantically (`onAddNode`, `onAlignNodes`), and document them with inline comments if usage is not obvious.
- Keep watchers near computed logic to avoid jumps and keep the reason for a watcher close to the state it observes.
- Avoid mixing DOM refs (template `ref`) with raw `document` queries; prefer `onMounted` + store state for DOM interactions.

## 6. Template & CSS guidance

- Templates follow Bootstrap utility classes; avoid reinventing layouts when there is already existing markup (cards, rows, flex helpers).
- Keep indentation to two spaces; stay consistent with the surrounding code (see `SidebarCatalog.vue`).
- Use descriptive `:class` and `:style` bindings rather than inline calculations inside template strings.
- Favor semantic structure: sections, headers, and buttons should reflect their function (`button` for actions, `div` for layout helpers).
- Use CSS variables (custom properties) when tuning backgrounds so themes remain consistent with the global palette.
- Avoid inline `style` that overrides Bootstrap defaults; wrap new classes inside module `<style scoped>` blocks if you need bespoke rules.

## 7. JavaScript formatting

- Follow Prettier defaults (double quotes for JSON keys, trailing commas only where Prettier places them, 2-space indentation) since `npm run format` enforces that style.
- Prefer `const` for values that do not change, and `let` only when reassignment is necessary.
- When iterating arrays, prefer early returns/filter + `localeCompare` for strings to maintain readability (see `filtered` computed in `SidebarCatalog`).
- Always coerce optional fields before using them (`String(t.name || '')`, `Number(t.cost || 0)`).

## 8. Naming conventions

- Component names are PascalCase and match the filename (e.g., `CanvasStage.vue`, `SidebarCatalog.vue`).
- Stores follow the pattern `useXStore()` and the file is `src/stores/x.store.js`.
- Reactive refs/computed variables are noun-based (`filtered`, `families`, `catalogReady`) and actions are verbs (`clearFilters`, `addType`).
- Event handlers use `handle` or `on` prefixes (e.g., `onDragStartType`, `handleZoom`).
- When naming getters, describe what they return (`lineSummaries`, `materialOptions`).

## 9. Error handling & guards

- Wrap DOM-dependent code in `try/catch` when it could run before the stage exists (see `getStageSize`).
- Always check for undefined stores, arrays, or methods before invoking them: `if (typeof catalog.init === 'function') catalog.init()`.
- Log errors with enough context; avoid swallowing exceptions silently.
- Fail fast if a required store entry is missing, but prefer user-friendly fallbacks (empty arrays, zero cost, `'Sin familia'`, etc.).
- Guard async actions with `if (!window)` checks when they may run server-side (Vite dev server SSR augmentation).
- Favor early returns in guards so `actions` remain flat; complex branching should live in well-named helper functions.

## 10. Comments and documentation

- Keep comments in Spanish where the project already uses them (`Catálogo` labels, function hints) but keep them minimal and informative.
- Use comments to explain intent, not to restate the code; i.e., comment why something is necessary (autosave, selectedIds) rather than how the code reads.
- When adding new features, update `docs/*.md` and reference the doc in this file if it changes any architecture rule.

## 11. Cursor / Copilot rules

- There are currently no `.cursor/rules/` or `.cursorrules` files inside this repo.
- No `.github/copilot-instructions.md` exists right now, so agents should rely on the instructions in `AGENT_PROMPT.md` and other docs.

## 12. Verification and handover

- After modifying stores or canvas logic, run the lint suite (`npm run lint`) and manually test the editor flow (open dev server, add nodes, move nodes, apply filters).
- When you add new commands or scripts, update this `AGENTS.md` so future agents know how to run them.
- Note any unresolved questions or manual steps in GitHub PR descriptions or follow-up instructions so the human owner can verify.

## 13. Store interaction patterns

- Always update the `editor` store via actions; avoid drifting into one-off mutations inside components.
- Keep selectors derived and memoized with `computed` so that the canvas, controls, and catalog stay in sync without manual watchers.
- When adding new getters, expose them as functions (e.g., `const selected = editor.selectedNodes`) to keep reactivity predictable.
- Prefer returning mutated payloads from actions so callers can react (`const node = editor.createNode(payload)`), especially for catalog-driven flows.
- Document store mutations that change autosave flags so reviewers know why `isDirty` flips.

## 14. Canvas interaction naming

- Stick to `handleX`/`onX` naming for canvas hooks: `onStageClick`, `onDragStart`, `onTransform` keeps the intent clear.
- Keep multi-node transforms centralized in `CanvasStage.vue` and mirror the `selectedIds` delta to the store on `dragmove` events.
- When a helper or command needs to reach the `Transformer`, read `editor.selectedIds` instead of storing local state.
- Use `Konva` event payloads sparingly; convert to store-friendly primitives before passing them around.

## 15. Autosave & persistence

- Autosave metadata lives in `editor.autosave`; actions that change `nodes` should mark `autosave.isDirty = true` before returning.
- Keep persistence logic decoupled: catalog or UI components should never talk directly to backend hooks—leave that responsibility to dedicated modules or future services.
- Log `autosave.lastSavedAt` only after the store has been flushed to the persistence layer; use ISO timestamps for clarity.
- When introducing new persistence hooks, document expected side effects in `docs/` so future reviewers understand the flow.
- Batch autosave updates by toggling `isDirty` once per action so watchers and saves do not thrash the store.
