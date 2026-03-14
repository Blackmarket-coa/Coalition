# Coalition Convergence Work Plan

## Objective
Design and deliver a controlled, auditable rollout plan for Coalition as the orchestration layer across Blackout (Matrix), Blackstar, and FreeBlackMarket—while preserving user safety, legal compliance, and operational reliability.

## Scope
This work plan covers seven converging capability areas in Coalition:
1. Spatial feed as layered broadcast surface.
2. Matrix rooms as ephemeral coordination/dead-drop workflows.
3. Action router as compartmentalization (cell) enforcement.
4. Steganography-aware content handling in feed/marketplace.
5. Gateway API as cross-system multiplexer.
6. Location privacy hardening against traffic analysis.
7. Onboarding as trust-tiered access progression.

## Guiding Principles
- **Safety by design:** default to explicit, consented, E2EE channels over hidden signaling.
- **Least privilege:** every role only sees what it must see.
- **Feature-flagged rollout:** every capability must be kill-switchable.
- **Auditability:** all sensitive transitions leave policy-level (not content-level) audit records.
- **Abuse resistance:** anti-enumeration, anomaly detection, and revocation are first-class.

## Workstreams

### WS1 — Spatial Feed Layering (Numbers-Station Analogue)
**Goal:** Support optional encrypted metadata in GeoJSON features for authorized clients.

**Deliverables**
- Feature schema extension for encrypted payload envelope in `Feature.properties`.
- Client capability check + key availability checks before attempting decrypt.
- Server-side policy engine to determine who receives encrypted envelopes.
- Telemetry for decrypt success/failure rates (without payload logging).

**Dependencies**
- Key management policy (WS8 governance/security).
- Feed performance budget validation (Redis/PostGIS + payload size impact).

**Exit Criteria**
- No regression in feed P95 latency budget.
- Unauthorized clients can render map safely without parsing errors.
- Authorized clients decrypt successfully under load test.

### WS2 — Matrix Ephemeral Coordination Rooms
**Goal:** Add ephemeral room type (e.g., `m.bmc.deadrop`) with E2EE and expiry controls.

**Deliverables**
- Room lifecycle API: create, join via scoped invite/QR, auto-expire.
- Client UI extension in chat/channel management for ephemeral rooms.
- Expiry worker + retention policy enforcement.
- Fallback user messaging for expired/invalid room access.

**Dependencies**
- Matrix permissions model updates.
- Push notification mapping and deep link routing.

**Exit Criteria**
- Rooms expire deterministically per policy.
- Expired room content is inaccessible via normal client flows.
- No breakage to existing room types (`m.bmc.feed`, `m.bmc.governance`, `m.bmc.chat`).

### WS3 — Action Router Compartmentalization
**Goal:** Formalize role-cell boundaries across navigation, API scopes, and data visibility.

**Deliverables**
- Role-to-capability matrix for Grower/Maker/Mover/Healer/Teacher/Builder/Organizer.
- Router guard middleware tied to capability claims.
- API-level authorization parity checks (client and gateway both enforce).
- Session-compromise blast-radius tests.

**Dependencies**
- Identity/claims normalization across systems.

**Exit Criteria**
- Disallowed actions/routes blocked consistently client + server.
- Pen-test scenario demonstrates cell isolation under compromised token conditions.

### WS4 — Marketplace/Feed Hidden-Layer Handling
**Goal:** Add controlled support for hidden payload workflows in media, with strict safeguards.

**Deliverables**
- Optional client detector/decoder module behind permission + feature flag.
- Explicit user-facing control to enable/disable hidden-layer processing.
- Content scanning and abuse checks before rendering decoded metadata.
- Governance policy for allowed hidden payload classes.

**Dependencies**
- Security review and legal policy sign-off.

**Exit Criteria**
- Hidden-layer decoding disabled by default.
- Decoder cannot execute active content; data-only parse path verified.

### WS5 — Gateway Multiplexer
**Goal:** Establish gateway orchestration patterns that coordinate cross-system workflows per request.

**Deliverables**
- Request orchestration contracts for feed/jobs/market/govern/message surfaces.
- Structured metadata envelope for non-content coordination signals.
- Idempotency and replay protections.
- Unified tracing across Blackstar, Matrix, Medusa/PostGIS calls.

**Dependencies**
- Observability upgrades (trace IDs, service maps, error taxonomy).

**Exit Criteria**
- Multi-backend orchestration works within latency SLOs.
- No undocumented side-effects in read endpoints.

### WS6 — Location Privacy Hardening
**Goal:** Reduce traffic-analysis exposure while preserving core product function.

**Deliverables**
- Batched location update mode with bounded randomization windows.
- Differential policy by consent mode (precise/approximate/off).
- UX indicators for delayed/approximate reporting state.
- Simulation suite for route quality vs privacy trade-off.

**Dependencies**
- Driver experience acceptance criteria.

**Exit Criteria**
- Demonstrable reduction in movement inference in red-team simulation.
- Delivery/navigation quality remains within agreed tolerance.

### WS7 — Onboarding Trust Ladder
**Goal:** Add trust-tier progression that gates deeper Coalition capabilities.

**Deliverables**
- Tier model (T0/T1/T2/...) with entry criteria and revocation rules.
- Scoring inputs: completed transactions, governance participation, vouching.
- Progressive entitlement grants mapped to router/feed/chat scopes.
- Risk/compliance review workflow for tier escalation events.

**Dependencies**
- Policy ownership and moderation operations.

**Exit Criteria**
- New users start in least-privilege tier by default.
- Tier changes are auditable and reversible.

### WS8 — Security, Policy, and Governance (Cross-Cutting)
**Goal:** Ensure all workstreams are safe, compliant, and operable.

**Deliverables**
- Threat model per workstream + abuse-case catalog.
- Key lifecycle policy (provisioning, rotation, revocation, device loss).
- Data retention matrix and legal/compliance controls.
- Incident kill-switch runbook using existing feature flags.

**Exit Criteria**
- Security sign-off completed before production launch of each stream.
- Rollback exercised in game-day drills.

## Delivery Phasing

### Phase 0 (2 weeks): Foundations
- Define capability matrix, policy owners, threat model baseline.
- Implement observability baseline (trace IDs, audit event taxonomy).
- Confirm feature-flag strategy and rollback semantics.

### Phase 1 (4–6 weeks): High-Leverage Core
- WS5 Gateway multiplexer (safe orchestration contracts).
- WS1 Spatial feed layering (schema + client-safe handling).
- WS3 Router compartmentalization (claims + guards).

### Phase 2 (4 weeks): Coordination and Privacy
- WS2 Ephemeral Matrix rooms.
- WS6 Location privacy batching/randomization.

### Phase 3 (4 weeks): Trust and Advanced Content
- WS7 Onboarding trust ladder.
- WS4 Hidden-layer media processing (strictly opt-in and policy constrained).

### Phase 4 (ongoing): Hardening and Expansion
- Red-team exercises, policy tuning, operational automation.
- Regional rollout with staged cohorts.

## Feature-Flag Plan
- Reuse and extend:
  - `COALITION_NAV_ENABLED`
  - `COALITION_FEED_RANKING_ENABLED`
  - `COALITION_ACTION_ROUTER_ENABLED`
- Add per-workstream kill switches:
  - `COALITION_FEED_ENCRYPTED_LAYER_ENABLED`
  - `COALITION_DEADROP_ROOMS_ENABLED`
  - `COALITION_GATEWAY_MULTIPLEXER_ENABLED`
  - `COALITION_LOCATION_BATCHING_ENABLED`
  - `COALITION_TRUST_TIER_ENABLED`
  - `COALITION_HIDDEN_LAYER_MEDIA_ENABLED`

## Metrics and Success Criteria
- **Reliability:** feed and gateway P95/P99 latency and error rate remain within SLO.
- **Security:** unauthorized access attempts blocked; no high-severity findings open.
- **Privacy:** measurable reduction in movement inference risk under simulation.
- **Adoption:** qualified-user enablement and successful task completion by stream.
- **Operability:** mean time to disable/rollback a stream under 15 minutes.

## RACI (Initial)
- **Product:** capability definition, rollout sequencing, user communication.
- **Platform/Gateway:** orchestration contracts, tracing, policy enforcement.
- **Mobile/Web:** client UX, decrypt/room/flag handling, safe fallbacks.
- **Security:** threat modeling, key policy, abuse prevention, go/no-go sign-off.
- **Ops/Trust:** moderation workflows, incident response, tier governance.

## Immediate Next 10 Actions
1. Approve this work plan and assign owners per workstream.
2. Publish role-to-capability matrix draft (WS3).
3. Finalize encrypted feed envelope schema draft (WS1).
4. Define gateway orchestration contract v1 and trace taxonomy (WS5).
5. Specify ephemeral room lifecycle states and retention rules (WS2).
6. Draft location batching policy by consent mode (WS6).
7. Define trust tiers and promotion/revocation criteria (WS7).
8. Establish security review checklist + threat model template (WS8).
9. Add new feature flags and default all to OFF in non-dev envs.
10. Plan a Phase 1 pilot cohort and rollback drill date.
