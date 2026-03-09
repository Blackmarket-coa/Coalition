# Coalition Social-First Migration Rollout (Feature-Flag Safe)

## Feature flags
- `COALITION_NAV_ENABLED` (existing): gates Coalition navigator vs legacy Driver navigator.
- `COALITION_ONBOARDING_ENABLED` (new): gates social onboarding surface.
- `COALITION_FEED_RANKING_ENABLED` (new): gates ranked social feed model params.
- `COALITION_ACTION_ROUTER_ENABLED` (new): gates unified action router (falls back safely).

## Rollout stages
1. Enable `COALITION_NAV_ENABLED=true` for internal cohort.
2. Enable `COALITION_ONBOARDING_ENABLED=true` for new-user cohorts.
3. Enable `COALITION_FEED_RANKING_ENABLED=true` for a % of feed traffic.
4. Enable `COALITION_ACTION_ROUTER_ENABLED=true` for CTA and post action flows.

## Smoke tests (critical journeys)
- New user onboarding -> feed -> room comment.
- Feed CTA -> marketplace/job flow.
- Location off -> explore fallback.

## Rollback paths
- Rollback nav: set `COALITION_NAV_ENABLED=false` (all auth routes return to Driver navigator).
- Rollback onboarding only: set `COALITION_ONBOARDING_ENABLED=false`.
- Rollback ranking only: set `COALITION_FEED_RANKING_ENABLED=false`.
- Rollback action routing only: set `COALITION_ACTION_ROUTER_ENABLED=false`.

## Error dashboards
- Conversion funnel payload: `coalition_social_discovery_v1`.
- Error categories dashboard: `coalition_errors_v1` with categories such as `feed_load_error` and `action_router_error`.
