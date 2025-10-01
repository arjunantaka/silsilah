Task Completion Checklist:
1. Implement feature/refactor in Svelte components & stores.
2. Update or add data-testid attributes for new UI parts to keep tests stable.
3. Run type and Svelte checks: npm run check (in frontend).
4. Start dev server (or Tauri) and manually verify CRUD & tree layout unaffected.
5. Run Playwright tests with proper BASE_URL export: BASE_URL=http://localhost:5173 npm run test:e2e.
6. Ensure no console errors in browser devtools.
7. Update documentation (README or plan.md status) if user-visible changes.
8. Commit with conventional concise message (e.g., feat:, fix:, refactor:, docs:).
9. Avoid removing legacy forms until unified form fully passes manual & automated tests per plan.md Phase gating.
Rollback Strategy:
- Keep old form components until Phase 4 sign-off.
- Revert by switching showUnifiedForm flag or restoring previous components.
Quality Gates:
- No uncaught exceptions on initialization.
- Linking parents/spouse/children functions still operate correctly (manual sanity check).
- Data export still functions after modifications.
