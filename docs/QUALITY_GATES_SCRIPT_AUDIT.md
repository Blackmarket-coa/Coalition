# Quality Gates Script Audit

## Package-by-package script status

| Package | lint | test | typecheck | Status | Notes |
|---|---|---|---|---|---|
| @blackstar/mobile | ✅ implemented (`eslint` scoped to active TS/TSX files) | ✅ implemented (`jest --passWithNoTests`) | ✅ implemented (`tsc --noEmit` scoped to chat hooks) | Active | Typecheck starts with targeted high-churn hooks to keep signal stable while broader TS config is matured. |
| @blackstar/gateway | ✅ implemented (`eslint src`) | ✅ implemented (`node --test`) | ✅ implemented (`tsc --noEmit`) | Active | Full source lint/typecheck wired; tests are node test-runner baseline. |
| @blackstar/web | ✅ implemented (`eslint webpack config`) | ✅ implemented (`node --test`) | ✅ implemented (`tsc --checkJs` on webpack config) | Active | Web app currently config-driven; quality gates cover current surface. |
| @blackstar/core | ✅ implemented (`eslint src`) | ✅ implemented (`node --test`) | ✅ implemented (`tsc --noEmit` entrypoint graph) | Active | Shared package now has executable gates instead of placeholders. |
| @blackstar/ui | ✅ implemented (`eslint src`) | ✅ implemented (`node --test`) | ✅ implemented (`tsc --noEmit` entrypoint graph) | Active | Shared package now has executable gates instead of placeholders. |

## Monorepo pipeline updates

- Root `typecheck` script: `yarn check:lockfiles && turbo run typecheck`.
- Turbo `typecheck` task uses workspace dependency propagation (`^typecheck`).

## Follow-up improvements (non-blocking)

1. Expand `@blackstar/mobile` typecheck scope from targeted hooks to full app project once mobile tsconfig is finalized.
2. Add real unit/integration tests in each package so `node --test` transitions from baseline runner to meaningful test suites.
3. Add package-level lint configs where rule divergence from root React Native config is required.
