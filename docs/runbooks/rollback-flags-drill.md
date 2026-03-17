# Rollback Flags Drill Runbook

## Purpose
Validate that Coalition can disable newly introduced feature-flagged surfaces quickly and safely without redeploy.

## Flags in scope
- `new_nav`
- `new_onboarding`
- `feed_ranking_v2`
- `action_router_v1`

## Preconditions
1. Staging or production-like environment is healthy.
2. Current flag values are captured.
3. On-call primary + secondary are online in incident channel.
4. Dashboards are accessible and event freshness is under threshold.

## Drill Procedure
1. Record baseline metrics (crash-free sessions, API 5xx, feed P95, CTA handoff, onboarding completion, analytics lag).
2. Disable all in-scope flags.
3. Execute smoke journeys:
   - onboarding -> feed -> room comment
   - feed CTA -> marketplace/job flow
   - location off -> explore fallback
4. Verify legacy route aliases/deep links continue working.
5. Confirm rollback telemetry event is emitted and visible in dashboard.
6. Measure time-to-recover from rollback trigger to full smoke pass.

## Pass/Fail Criteria
- **Pass** if all smoke journeys succeed and time-to-recover <= 15 minutes.
- **Fail** if any P0 journey fails, dashboards stop updating, or deep links break.

## Evidence to attach
- Flag timeline (before/after values)
- Smoke test output and screenshots/logs
- Dashboard snapshots (before/after)
- Incident channel acknowledgment by Release Eng + QA + Product
