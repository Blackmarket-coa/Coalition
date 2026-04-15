# Legacy Runtime Migration Status

_Last updated: 2026-04-15_

## Consolidation Decision

Legacy runtime code is now consolidated in one bounded location: `legacy/runtime/`.

- Previous split locations: `src/legacy/` and `legacy/`.
- Current bounded location for legacy runtime modules: `legacy/runtime/`.
- Approved adapter boundary: `src/adapters/legacy-runtime/`.

## Import Guard Policy

- Active app paths (`src/`, `apps/`, `packages/`) **must not** import legacy runtime modules directly.
- Direct imports from `legacy/runtime/**` (or previous `src/legacy/**` paths) are blocked by root ESLint `no-restricted-imports` rules.
- Any required legacy interop must go through `src/adapters/legacy-runtime`.

## Production-Critical Legacy Modules (Current)

The following legacy compatibility surfaces are still production-critical in the active app runtime:

1. **Driver navigator fallback contract**
   - `src/navigation/coalition-config.ts`
   - Why critical: if `COALITION_NAV_ENABLED=false`, authenticated users are routed to legacy-compatible driver navigation.

2. **Legacy route-name compatibility in coalition navigator**
   - `src/navigation/CoalitionNavigator.tsx`
   - Why critical: preserves route names and deep-link contracts used by existing order/chat flows.

3. **Legacy fallback action routing behavior**
   - `src/services/action-router.ts`
   - Why critical: when `COALITION_ACTION_ROUTER_ENABLED=false`, actions are routed through legacy-safe behavior.

## Legacy Runtime Module Status

| Module area | Path | Runtime status | Deprecation target |
|---|---|---|---|
| Legacy configuration | `legacy/runtime/config.js` | Reference-only (not directly imported by active app code paths) | Remove by **2026-09-30** if no adapter consumers remain |
| Legacy UI components | `legacy/runtime/components/**` | Reference-only | Remove by **2026-10-31** after fallback route retirement |
| Legacy feature stacks | `legacy/runtime/features/**` | Reference-only | Remove by **2026-10-31** after fallback route retirement |
| Legacy services/hooks/utils/constants | `legacy/runtime/services/**`, `legacy/runtime/hooks/**`, `legacy/runtime/utils/**`, `legacy/runtime/constant/**` | Reference-only | Remove by **2026-09-30** after adapter usage reaches zero |

## Exit Criteria

Legacy runtime code can be removed after all of the following are true:

- `src/adapters/legacy-runtime` has no active runtime consumers.
- Feature flags `COALITION_NAV_ENABLED` and `COALITION_ACTION_ROUTER_ENABLED` no longer require legacy compatibility paths.
- Route aliases for legacy deep links have migration coverage and sunset communications.
