# Blackstar feature parity plan

This plan defines the work needed to reach a complete Blackstar release with no accidental Fleetbase/Navigator leftovers in shipped code paths.

## Goals

- Deliver Blackstar-branded apps (Android, iOS, and shared RN layers) with consistent naming, assets, and runtime defaults.
- Confirm functional parity for Blackstar launch-critical workflows.
- Lock in CI/CD and release metadata so future builds remain Blackstar-native.

## Scope and assumptions

- Scope includes `app/`, mobile native projects, release pipelines, and any shared runtime configuration used by production builds.
- Intentional third-party references (e.g., SDK package names that cannot be changed) are allowed if documented.
- `legacy/` treatment must be explicitly decided to avoid split-brand releases.

## 1) Source-of-truth feature inventory (Week 1)

Create and maintain `docs/blackstar-feature-matrix.csv` as the launch source of truth.

Required columns:

- `feature_name`
- `in_blackstar` (yes/no)
- `required_for_launch` (yes/no)
- `status_in_this_repo` (present/partial/missing)
- `owner`
- `target_release`
- `notes`

Execution:

1. Hold a 60-minute product + ops + engineering review to agree launch-critical capabilities.
2. Populate matrix with all domains (auth, orders, routing, POD, fuel reports, issues, chat, fleet/vehicles).
3. Mark each required row with an engineering owner and target release.

Deliverable:

- Complete matrix checked into version control and referenced by weekly status updates.

## 2) Branding and identifier refactor (Weeks 1–2)

### Android

- Rename package path from `com.fleetbase.navigator` to final Blackstar package ID.
- Update `applicationId`/namespace and all manifest references.
- Replace deep-link scheme `flbnavigator` with Blackstar scheme.
- Audit/remove Fleetbase domains in network security config unless explicitly required.

### iOS

- Rename target/product from `NavigatorApp` to Blackstar naming.
- Update bundle identifier(s), URL schemes, and associated domains.
- Validate Info.plist keys and entitlements for old Fleetbase naming.

### Shared JS/React Native

- Remove Fleetbase/Navigator naming from user-facing copy and diagnostics (e.g., user agent labels).
- Centralize brand constants (app name, links, support labels, scheme identifiers) in one config module.

Gate:

- `yarn audit:branding` passes in CI, and any allowlisted legacy token has documented justification.

## 3) Backend and integration alignment (Weeks 2–3)

Decide architecture path:

- **Path A: Blackstar backend/gateway**
  - Introduce Blackstar env keys for API/auth/realtime.
  - Document API contract deltas and add translation layer where needed.
  - Validate auth, orders, issues, fuel reports, and chat end-to-end.

- **Path B: Fleetbase APIs retained**
  - Keep SDK usage but move all tenant-specific defaults out of scattered constants.
  - Remove hardcoded Fleetbase labels and centralize runtime host/key configuration.

Deliverables:

- Architecture decision record (ADR) in `docs/`.
- Environment variable contract documented for local/dev/staging/prod.

## 4) Domain parity validation (Weeks 3–4)

For each domain:

- Authentication/account lifecycle
- Orders/task flow
- Navigation/routing
- Proof of delivery/signatures
- Fuel reports
- Issue management
- Chat/notifications
- Fleet/vehicle views

Run the same checklist:

1. Required Blackstar behaviors listed.
2. Current screens/components/API mappings documented.
3. Gaps tagged as missing field / business rule / UX state.
4. Validation added (automated test or manual test script with expected outcomes).

Deliverable:

- Matrix rows for `required_for_launch=yes` all moved to `present` or assigned blocker status with ETA.

## 5) Legacy folder decision (Week 1, blocking)

Choose one path and document in README/release runbook:

- **Option A (recommended):** De-scope `legacy/` from release artifacts and CI.
- **Option B:** Include `legacy/` and complete full rebrand + config alignment there.

No release should proceed until this decision is explicit.

## 6) CI/CD and release hardening (Weeks 4–5)

- Replace app icon/splash/store assets with approved Blackstar assets.
- Update pipeline bundle IDs/package names/version metadata.
- Confirm signing/provisioning references Blackstar identifiers.
- Add release checks preventing old branding strings in packaged builds.

Suggested automated guardrail:

- CI step that fails on disallowed branding tokens in release artifacts or source allowlist.

## 7) Definition of done (release gate)

- [ ] No unintended Fleetbase/Navigator naming remains in release code paths.
- [ ] Android package/app IDs, iOS bundle IDs, and deep links are Blackstar-specific.
- [ ] Runtime backend/auth/realtime configuration reflects final Blackstar architecture.
- [ ] Feature matrix shows all `required_for_launch=yes` items as `present`.
- [ ] Smoke/regression checks pass for shipped platforms.
- [ ] README and release runbooks match the final architecture and release process.

## Suggested owner model

- **Product owner:** feature matrix scope + launch criteria.
- **Mobile lead:** iOS/Android identifiers, deep links, native config.
- **Platform/backend lead:** env strategy + API integration path.
- **QA lead:** parity validation scripts and release sign-off checklist.

## Reporting cadence

- Weekly status update anchored to matrix deltas:
  - Newly `present` features
  - Remaining blockers
  - Risk level (low/medium/high) per launch-critical domain
