Core Commands (UPDATED AFTER MIGRATION):
- Install deps: npm install (dari root directory, bukan lagi frontend/)
- Dev server (web): npm run dev (port 1420)
- Desktop dev (Tauri): npm run tauri:dev
- Build web: npm run build
- Preview build: npm run preview
- Run type/check: npm run check
- Run e2e tests: npm run test:e2e

Testing Notes:
- Playwright baseURL defaults to http://localhost:1420 (Tauri port)
- For pure Vite dev testing use: BASE_URL=http://localhost:1420 npm run test:e2e

Data Operations:
- (In-app) Export/Import via UI buttons; persistence local

Refactor Workflow:
- Create feature branch: git checkout -b feature/unified-person-form
- After changes: git add <files>; git commit -m "refactor: unify person form"

Troubleshooting:
- If tree not arranged: use keluargaStore.autoArrange() via console after load
- TypeScript errors are expected (859 errors) - app still works

Environment:
- All npm scripts executed from root directory (NOT frontend/)
- Port 1420 for dev server (not 5173)
