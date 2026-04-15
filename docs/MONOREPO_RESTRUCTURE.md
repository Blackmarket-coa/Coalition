# Monorepo Restructure (Turborepo)

## New top-level structure

```text
.
├── apps/
│   ├── mobile/
│   │   ├── package.json
│   │   └── yarn.lock
│   ├── web/
│   │   └── package.json
│   └── gateway/
│       ├── package.json
│       └── src/
│           └── index.js
├── packages/
│   ├── core/
│   │   ├── package.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── contexts/
│   │       ├── hooks/
│   │       ├── services/
│   │       ├── utils/
│   │       └── constants/
│   └── ui/
│       ├── package.json
│       └── src/
│           ├── index.ts
│           └── components/
├── package.json
├── turbo.json
└── tsconfig.json
```

## Kept screens
- BootScreen
- LoginScreen
- OrderScreen
- ChatHomeScreen
- ChatChannelScreen
- EntityScreen

## Removed driver-specific screens
- DriverDashboardScreen
- DriverFleetScreen
- FuelReportScreen
- VehicleScreen
- DriverReportScreen

## Architecture ownership rules (April 2026)

- **`packages/core`**: reusable domain-layer hooks, services, and context primitives that are shared across app surfaces.
- **`packages/ui`**: reusable UI primitives (presentational components and UI-focused hooks/adapters).
- **App-local (`src/screens`, `src/navigation`, feature composition in `src/`)**: screen orchestration, navigation graphs, and product-specific composition logic.

### Audit summary (`src/components`, `src/contexts`, `src/hooks`, `src/services`)

**Migrate to `packages/core` (domain primitives):**
- `src/contexts/*` context providers and domain contexts (auth, location, notifications, chat state, order manager, etc.).
- `src/hooks/*` shared domain hooks (`use-auth`-adjacent hooks, storage hooks, data hooks, location, chat/event buffering).

**Migrate to `packages/ui` (UI primitives):**
- `src/components/*` reusable, screen-agnostic UI components (inputs, markers, chat UI atoms, loading wrappers, sheets, cards) when they do not encode screen flow.

**Keep app-local (composition and product behavior):**
- `src/navigation/*` and navigator stack files.
- `src/screens/*` and onboarding flow composition.
- `src/services/*` that are product/composition-specific (routing, feed orchestration, app-specific gateway usage, analytics wiring), unless they become cross-app domain services.
