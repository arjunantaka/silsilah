Code Style & Conventions:
- JavaScript modules (ESM) with TypeScript configured mainly for tooling (svelte-check); minimal explicit type annotations inside .js
- Svelte components: PascalCase filenames, colocated in components directory
- Data-test attributes: data-testid used extensively; selectors centralized in tests/utils/selectors.ts
- Store pattern: Svelte writable/derived stores; exported store object (keluargaStore) with imperative methods
- Naming: Bahasa Indonesia domain terms (keluarga, orang, pernikahan, hubungan, lineagePreference) mixed with English utility verbs
- Error handling: Throw errors for invalid operations in store methods; catch at higher-level UI expected
- Layout constants: Hard-coded numeric spacing for positions (e.g., 160, 220)
- No explicit lint/format config present (no ESLint/Prettier in package.json); follow existing spacing & semicolon minimalism
- Tests: Playwright with data-testid; placeholders and TODOs indicate test suite incomplete
Design Patterns:
- Central store orchestrates DB sync; DB functions abstracted in simple-manager.js
- Derived stores for filtered views (filteredPersons, selectedPerson)
- Tree layout incremental position assignment (ensureNodePositions) with persistence
Refactor Principles (plan.md): Progressive disclosure, atomic operations (create person then link relations), unified form.
