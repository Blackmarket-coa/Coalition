# Coalition End-to-End Alignment Work Order

## Objective
Transform Coalition into a **general-user-first social media app** that:
1. Feels like modern social onboarding + TikTok-style discovery.
2. Connects users to the full Blackmarket ecosystem:
   - **freeblackmarket.com** (commerce)
   - **Blackout / Matrix** (rooms, messaging, governance, media threads)
   - **Blackstar** (jobs, gigs, logistics, service opportunities)
3. Converts engagement into real-world outcomes (buy/sell, jobs, aid, infra setup, local collaboration).

This work order operationalizes the alignment gaps captured in `docs/REPO_ALIGNMENT_AUDIT.md`.

---

## Product North Star
**Coalition = social discovery + trust + activation layer** for the ecosystem.

### Primary user outcomes
- New user quickly discovers identity + interests.
- User is routed into relevant local/global communities.
- Feed content is personalized by interests + location consent.
- In-feed actions produce conversion into ecosystem modules:
  - Shop locally / marketplace listing
  - Apply for or post jobs via Blackstar
  - Join encrypted Matrix rooms for communication and coordination
  - Join aid/governance/community activity

### Success metrics (90-day)
- Onboarding completion rate ≥ 70%
- 7-day retention ≥ 35%
- Feed-to-action conversion (shop/job/chat/map clickthrough) ≥ 12%
- % users joining at least one Matrix room in first 48h ≥ 50%
- % users taking one real-world action in first 14 days ≥ 20%

---

## Workstreams

## WS1 — Information Architecture & Navigation (General-User First)
### Goal
Replace driver-first primary shell with social-first IA while preserving Blackstar workflows as secondary role paths.

### Deliverables
- New root app shell for authenticated users:
  - Home
  - Feed (center primary action)
  - Explore/Map
  - Messages
  - You
- Driver/provider/operator paths moved into role-aware subroutes.
- Profile CTA: “Create Provider Profile” (optional progression).

### AI Prompt (implementation)
```text
You are updating a React Native + Tamagui app to move from a driver-first navigator to a general-user-first social navigator.

Repository context:
- Existing app currently routes authenticated users into DriverNavigator.
- Existing components include a vertical video feed and Matrix chat contexts.

Tasks:
1) Create a new root authenticated navigator named CoalitionNavigator with tabs: Home, Feed, Explore, Messages, You.
2) Make Feed the center-highlighted primary tab action.
3) Keep existing DriverNavigator available behind role-gated routing (not default).
4) Update AppNavigator so authenticated users land in CoalitionNavigator.
5) Add a migration-safe feature flag COALITION_NAV_ENABLED (default true). If false, fall back to DriverNavigator.
6) Preserve existing deep links and avoid breaking existing route names used in current flows.
7) Add minimal unit tests/snapshot checks for tab rendering and authenticated routing behavior.

Output requirements:
- Edit only relevant navigation/layout files.
- Include concise comments explaining backward compatibility.
- Provide a list of changed files and test commands.
```

### Acceptance Criteria
- Authenticated default route no longer lands on order management.
- All five social tabs render and navigate.
- Existing driver flows still accessible when role allows.

---

## WS2 — Social Onboarding & Interest Graph
### Goal
Create onboarding that mimics social apps: identity setup, interest capture, community suggestions, and consent choices.

### Deliverables
- Multi-step onboarding:
  - Welcome + value proposition
  - Identity (name/username/avatar)
  - Interest selection (topics + intent: buy/sell/work/learn/help)
  - Consent screen (location + data use clarity)
  - Suggested rooms/people/content
- Interest graph persisted in profile and used by feed ranking.

### AI Prompt (implementation)
```text
Implement a social-first onboarding flow in React Native.

Requirements:
1) Build onboarding screens: Welcome, ProfileSetup, InterestPicker, EcosystemIntent, Consent, SuggestedCommunities.
2) InterestPicker should support category chips and multi-select with at least 20 seed interests.
3) EcosystemIntent must map user goals to ecosystem actions:
   - buy/sell -> free-black-market
   - find work/provide service -> Blackstar
   - discuss/organize/vote -> Blackout Matrix rooms
4) Persist onboarding payload in local storage and sync to gateway endpoint `/v1/user/onboarding`.
5) If user skips location consent, onboarding still completes and map tab shows graceful fallback.
6) Add analytics events: onboarding_step_viewed/completed, interest_selected, consent_granted/declined, suggested_room_joined.
7) Add tests for state persistence and skip paths.

Output:
- Code + route integration.
- API contract assumptions documented in code comments.
```

### Acceptance Criteria
- New user can complete onboarding without location consent.
- At least one suggested room/action appears based on interests.
- Onboarding output influences first feed payload request.

---

## WS3 — TikTok-Style Feed + Matrix Comment Rooms
### Goal
Make short-video feed a first-class engagement surface that opens room-based encrypted discussion.

### Deliverables
- Feed tab shows vertical full-screen videos by default.
- Right-side action rail (like/comment/share/map).
- Comment action opens Matrix room thread panel (real-time, E2EE-capable context).
- Feed ranking supports location/interest/privacy filters.

### AI Prompt (implementation)
```text
Integrate existing VerticalVideoFeed into the main Feed tab and complete room-comment behavior.

Tasks:
1) Wire VerticalVideoFeed into active app navigation as primary Feed screen.
2) Ensure each feed item has a room_id and comment action opens ChatPanel for that room.
3) Add loading/empty/error states with retry.
4) Add feed request params: interests, consented_location_precision, joined_rooms, language.
5) Add in-feed CTA cards after every N videos: Shop, Jobs, Aid, Governance actions.
6) Ensure tapping CTA deep-links to relevant modules (marketplace, Blackstar job list, map layer, governance).
7) Add tests for room-open action and fallback when room is missing.

Constraints:
- Keep existing component APIs stable where possible.
- Do not regress performance while swiping.
```

### Acceptance Criteria
- Feed is reachable from primary nav in one tap.
- Comment panel opens correct room and sends messages.
- CTA cards appear contextually and deep-link correctly.

---

## WS4 — Consent-First Location + Privacy UX
### Goal
Upgrade consent UX from permission prompt to explicit, understandable privacy contract.

### Deliverables
- Explainers for what is shared, with whom, precision level, and revocation.
- Explicit controls:
  - Off / Approximate / Precise (if enabled)
  - Visibility audience controls
  - Session pause behavior
- Graceful degradation when location off.

### AI Prompt (implementation)
```text
Enhance the location consent flow to match privacy-first product requirements.

Requirements:
1) Replace simplistic permission-first screen copy with explicit consent contract language.
2) Add UI sections: What we collect, What we never collect, Who can see, How to turn off.
3) Keep two primary actions: Allow Approximate Location, Not Now.
4) Add secondary path for precise location where platform permits.
5) Save consent decisions to a structured model with timestamp + versioned policy text id.
6) Add Privacy Settings screen accessible from profile tab.
7) Ensure Explore tab and nearby modules degrade gracefully when location is off.
8) Add tests for consent transitions and persistence.
```

### Acceptance Criteria
- User can fully use app with location off.
- Consent can be changed from settings at any time.
- No blocking path requires precise location.

---

## WS5 — Ecosystem Integration Layer (freeblackmarket + Blackout + Blackstar)
### Goal
Make Coalition the unified front door while keeping source systems as execution backends.

### Deliverables
- Cross-system action router and deep-link schema.
- Unified profile identity mapping across systems.
- Service adapters for:
  - Marketplace entities/actions
  - Job/gig discovery and application
  - Matrix room discovery/join/send
- “Next Best Action” recommendations in Home.

### AI Prompt (implementation)
```text
Build a unified ecosystem action router for Coalition.

Tasks:
1) Define a typed action schema: SHOP_ITEM, POST_OFFERING, APPLY_JOB, JOIN_ROOM, OPEN_PROPOSAL, REQUEST_AID, etc.
2) Implement an ActionRouter service that resolves action -> module route/API call.
3) Add adapters for existing gateway/services so actions route to:
   - free-black-market flows
   - Blackstar jobs/claims flows
   - Matrix room join/chat flows
4) Add Home recommendations powered by interest + location consent + recent behavior.
5) Ensure unresolved actions show meaningful fallbacks instead of crashes.
6) Add integration tests for action resolution and route handoff.
```

### Acceptance Criteria
- Home cards and feed CTAs reliably resolve into ecosystem workflows.
- User can start in social feed and complete at least one real-world action.

---

## WS6 — Community Graph, Discovery, and Real-World Conversion
### Goal
Connect members with people/opportunities and drive offline participation.

### Deliverables
- Nearby people/communities rail (consent-aware).
- Explore map layers for commerce/jobs/aid/governance/infra.
- Conversion tracking funnel from content -> conversation -> transaction/participation.

### AI Prompt (implementation)
```text
Implement conversion-focused social discovery features.

Requirements:
1) Add a Home rail for nearby people/groups when location is consented.
2) Add Explore layer toggles for: marketplace, jobs, mutual aid, governance, infrastructure.
3) Add “Take Action” buttons in posts/videos mapped via ActionRouter.
4) Instrument conversion events and define a funnel dashboard payload format.
5) Add guardrails for spam/abuse reporting and trust signals.
6) Add tests for visibility filtering and action tracking.
```

### Acceptance Criteria
- Discoverability features are visible to all users (not just providers/drivers).
- Conversion events are emitted for key actions.

---

## WS7 — Platform Readiness, QA, and Rollout
### Goal
Ship safely with phased rollout and measurable impact.

### Deliverables
- Feature flags for all major new surfaces.
- Regression suite for auth/nav/feed/chat/privacy.
- Performance budgets for feed FPS and startup time.
- Rollout playbook and kill-switch paths.

### AI Prompt (implementation)
```text
Create a rollout-safe implementation plan and tests for Coalition social-first migration.

Tasks:
1) Add feature flags for new nav, onboarding, feed ranking, and action router.
2) Implement smoke tests for critical journeys:
   - new user onboarding -> feed -> room comment
   - feed CTA -> marketplace/job flow
   - location off -> explore fallback
3) Add performance checks for feed scroll and media start latency.
4) Add logging hooks and dashboards for error categories.
5) Document rollback paths by feature flag.
```

### Acceptance Criteria
- Critical user journeys pass in CI.
- New architecture can be disabled by flags without redeploy.

---

## Sequencing & Milestones (Suggested)
- **Milestone 1 (2 weeks):** WS1 + WS2 baseline (new nav + onboarding)
- **Milestone 2 (2 weeks):** WS3 + WS4 (feed primary + privacy UX)
- **Milestone 3 (2 weeks):** WS5 + WS6 (action router + conversion loops)
- **Milestone 4 (1 week):** WS7 hardening + launch gates

---

## Definition of Done (Program-Level)
Coalition is considered end-to-end aligned when:
1. Default UX is social/general-user-first.
2. Feed + Matrix room commenting is first-class and stable.
3. Location/privacy controls are explicit, consent-based, and optional.
4. Ecosystem actions route users into real workflows across marketplace, jobs, and coordination.
5. Conversion to real-world action is measurable and improving.

---

## Immediate Next Step
Run WS1 prompt first, then WS2, and only then wire ranking/CTA in WS3 so onboarding-derived interests can drive first-session feed relevance.

---

## Execution Readiness Addendum (Human + AI Co-Execution)

Use this addendum as the operational layer for assigning ownership, sequencing dependencies, and tracking delivery across both human and AI contributors.

### 1) Ownership Model (proposed staffing for kickoff)
| Workstream | Product Owner (Human) | Engineering Owner (Human) | AI Executor Scope | QA Owner | Target Start | Target Complete | Status |
|---|---|---|---|---|---|---|---|
| WS1 Nav/IA | Product Lead — Core App | Mobile Platform Lead | Scaffold navigator + tests + migration flag wiring | QA Lead — Mobile Journeys | 2026-03-17 | 2026-03-30 | Planned |
| WS2 Onboarding | Growth PM | Onboarding Squad Lead | Generate screens/state model/analytics hooks | QA Analyst — Activation | 2026-03-24 | 2026-04-06 | Planned |
| WS3 Feed + Rooms | Social Experience PM | Feed/Realtime Lead | Integrate feed rail/CTA placements/fallback behavior | QA Lead — Feed/Chat | 2026-04-07 | 2026-04-20 | Planned |
| WS4 Privacy UX | Trust & Safety PM | Privacy Engineering Lead | Consent copy structure + settings persistence paths | QA Analyst — Privacy | 2026-04-07 | 2026-04-20 | Planned |
| WS5 Action Router | Ecosystem PM | Integrations Lead | Typed schema + routing adapters + integration tests | QA Lead — Integrations | 2026-04-21 | 2026-05-04 | Planned |
| WS6 Discovery/Conversion | Marketplace PM | Growth Engineering Lead | Home/Explore conversion instrumentation | QA Analyst — Conversion | 2026-04-21 | 2026-05-04 | Planned |
| WS7 Rollout/QA | Release PM | Release Engineering Lead | Smoke tests + flag docs + rollback docs | QA Manager | 2026-05-05 | 2026-05-15 | Planned |

### 2) Dependency Matrix (proposed owners + due dates)
| Dependency | Blocking For | Owner | Due | Risk if delayed |
|---|---|---|---|---|
| Feature-flag infrastructure baseline | WS1, WS2, WS3, WS5, WS7 | Mobile Platform Lead | 2026-03-23 | Cannot safe-rollout or quickly rollback |
| Matrix room metadata (`room_id` on feed items) | WS3 | Feed/Realtime Lead | 2026-04-03 | Comment panel cannot reliably open room threads |
| Onboarding API endpoint contract (`/v1/user/onboarding`) | WS2, WS3, WS5 | Backend API Lead | 2026-03-31 | Feed personalization and recommendations blocked |
| Cross-system identity mapping strategy | WS5, WS6 | Integrations Lead | 2026-04-10 | CTA/action handoff reliability drops |
| Analytics event ingestion/dashboard schema | WS2, WS6, WS7 | Data Platform Lead | 2026-03-28 | No conversion visibility or launch confidence |

### 3) Delivery Cadence & Ceremonies
- **Daily**: 15-minute execution standup (yesterday/today/blockers by workstream).
- **Twice weekly**: Human+AI implementation review (prompt quality, diff quality, test quality).
- **Weekly**: Milestone demo + KPI trend check vs success metrics.
- **Release gate review**: Required before enabling each major flag cohort.

#### Weekly Execution Dashboard (proposal)
| Week Of | Primary Focus | Planned Deliverables | Exit Criteria | Accountable Owner |
|---|---|---|---|---|
| 2026-03-16 | Program setup + WS1 kickoff | Owners confirmed, dependency tickets filed, WS1 branches created | No unowned dependencies; WS1 implementation in progress | Release PM |
| 2026-03-23 | WS1 delivery + WS2 kickoff | Nav migration flag, deep-link regression tests, onboarding API contract draft | WS1 PRs in review, WS2 build started | Mobile Platform Lead |
| 2026-03-30 | WS2 delivery | Onboarding state model/screens/events wired | Onboarding smoke passes behind flag | Onboarding Squad Lead |
| 2026-04-06 | WS3 + WS4 kickoff | Feed rail integration + privacy consent flow scaffolds | Feed/privacy PR slices merged behind flags | Feed/Realtime Lead |
| 2026-04-13 | WS3 + WS4 delivery | Room comment path + privacy settings persistence | Feed-to-room and privacy journeys pass smoke | Privacy Engineering Lead |
| 2026-04-20 | WS5 + WS6 kickoff | Action router schema + discovery instrumentation baseline | Contract tests green for router + events | Integrations Lead |
| 2026-04-27 | WS5 + WS6 delivery | CTA handoff adapters + conversion dashboards | Conversion signal visible in dashboards | Growth Engineering Lead |
| 2026-05-04 | WS7 hardening | End-to-end smoke matrix + rollback playbook + alerting | Launch gate checklist all green in staging | QA Manager |
| 2026-05-11 | Launch readiness | 1% cohort go/no-go decision packet | Exec sign-off + on-call roster published | Release Engineering Lead |

#### Blocker Escalation Matrix
| Blocker Type | First Responder | Escalation Owner | Escalation SLA | Decision/Resolution Target |
|---|---|---|---|---|
| API/schema contract mismatch | Backend API Lead | Engineering Director | 4 business hours | 1 business day |
| Feature-flag platform instability | Mobile Platform Lead | SRE/Platform Manager | 2 business hours | Same day |
| Analytics pipeline/data quality failure | Data Platform Lead | Head of Data | 4 business hours | 1 business day |
| Cross-team dependency miss (date slip) | Release PM | Product Director | 1 business day | Next steering sync |
| Security/privacy compliance concern | Trust & Safety PM | Security Lead | Immediate | Before next deploy |

### 4) Branching + PR Rules (for human and AI contributors)
- Branch naming: `feat/wsX-short-description`.
- Max PR size target: <= 600 net lines changed (prefer smaller PRs).
- Every PR must include:
  - Workstream ID (WS1..WS7)
  - Acceptance criteria mapping
  - Risk/rollback notes
  - Test evidence (commands + pass/fail)
- No direct merges to main without at least one human review.

### 5) Definition of Ready (per task)
A task is ready for implementation only if:
1. Scope maps to exactly one workstream (or clearly lists cross-workstream dependency).
2. Acceptance criteria are testable.
3. Feature flag strategy is defined (name, default value, rollback behavior).
4. Required API/data contracts are linked.
5. Telemetry/events to emit are listed.

### 6) Definition of Done (per PR)
A PR is done only if all are true:
1. Acceptance criteria met and explicitly checked.
2. Unit/integration tests added or updated.
3. Feature flagged where applicable.
4. Observability added (logs/events/metrics).
5. Rollback path documented.
6. Human reviewer validated user-impact and safety.

### 7) Risk Register (initial)
| Risk | Severity | Likelihood | Mitigation | Owner |
|---|---|---|---|---|
| Navigation migration breaks deep links | High | Medium | Preserve route aliases + add deep-link regression tests before rollout | Mobile Platform Lead |
| Feed performance drops with CTA insertion | High | Medium | Perf budget + profiling in WS7 + staged enablement | Feed/Realtime Lead |
| Privacy flow confusion reduces onboarding completion | Medium | Medium | A/B copy and monitor onboarding drop-off by step | Trust & Safety PM |
| Cross-system action routing failures | High | Medium | Adapter contract tests + graceful fallback UX | Integrations Lead |
| Analytics not trustworthy at launch | High | Medium | Event contract tests + dashboard QA before ramp | Data Platform Lead |

### 8) Rollout Plan (feature-flag cohorts)
1. **Internal dogfood** (team only)
2. **1% cohort** (new users)
3. **5% cohort** (new users)
4. **25% cohort** (new + returning users)
5. **100% rollout** after guardrail stability window

For each phase, require:
- Error rate below agreed threshold
- No P0/P1 regressions in auth/nav/feed/chat/privacy
- KPI trend non-negative vs control for retention + conversion

### 9) Go/No-Go Checklist
- [ ] Critical smoke journeys pass (onboarding -> feed -> room, CTA handoff, location-off fallback)
- [ ] Rollback flags verified in production-like environment
- [ ] On-call owner assigned for rollout window
- [ ] Incident comms channel prepared
- [ ] Dashboard links verified by product + engineering + QA

### 10) Immediate Operational Next Steps
1. Confirm named owners in sections 1 and 2 with team leads by 2026-03-17.
2. Create milestone epics and task tickets mapped to WS1–WS7 using the proposed week-by-week dashboard.
3. Implement WS1 and WS2 behind flags in parallel with analytics contract setup.
4. Hold first release gate review before WS3 rollout.
5. Start 1% cohort only after WS7 smoke and rollback checks pass.

### 11) Prompt Library (for Human + AI Execution)
Use these prompts as copy/paste templates during delivery. Replace placeholders in `{braces}`.

#### Prompt A — Workstream kickoff planning
```text
You are assisting with implementation planning for Coalition workstream {WS_ID}.

Context:
- Source doc: docs/COALITION_ALIGNMENT_WORK_ORDER.md
- Workstream: {WS_ID} - {WORKSTREAM_NAME}
- Milestone: {MILESTONE}
- Constraints: feature-flagged rollout, backward compatibility, measurable conversion impact.

Tasks:
1) Convert this workstream into 5-10 executable tasks with clear sequencing.
2) For each task, provide: owner type (human/ai/shared), dependencies, acceptance checks, and risks.
3) Propose branch names and PR slices that keep each PR <= 600 net lines where feasible.
4) Identify the minimum viable test plan (unit/integration/smoke) before merge.
5) Output a go/no-go checklist specific to this workstream.

Output format:
- Task table
- Dependency list
- PR slicing plan
- Test plan
- Workstream-specific go/no-go checks
```

#### Prompt B — Implementation PR generator
```text
You are implementing {TASK_NAME} in the Coalition repository.

Requirements:
1) Follow docs/COALITION_ALIGNMENT_WORK_ORDER.md for {WS_ID} acceptance criteria.
2) Make the change behind feature flag: {FLAG_NAME} (default: {FLAG_DEFAULT}).
3) Preserve backward compatibility and existing deep links/route names.
4) Add or update tests for the exact behavior changed.
5) Include concise code comments only where needed for non-obvious compatibility logic.

Execution rules:
- Keep diff focused to files relevant to this task.
- Avoid unrelated refactors.
- Provide test commands and expected outcomes.

At the end, output:
- Changed files
- Acceptance criteria mapping
- Risks and rollback path
- Test evidence
```

#### Prompt C — Reviewer prompt (human or AI)
```text
Review this Coalition PR against workstream {WS_ID}.

Review checklist:
1) Does the PR satisfy mapped acceptance criteria from docs/COALITION_ALIGNMENT_WORK_ORDER.md?
2) Is the feature flag correctly implemented and safely defaulted?
3) Are backward compatibility and deep links preserved?
4) Are tests sufficient and meaningful for regression prevention?
5) Are observability and analytics events present where required?
6) Is rollback feasible without redeploy?

Output:
- Approve / Request changes
- Blocking issues
- Non-blocking suggestions
- Explicit rollback verification notes
```

#### Prompt D — QA smoke validation
```text
Execute QA smoke validation for Coalition release candidate {RC_TAG}.

Required journeys:
1) new user onboarding -> feed -> room comment
2) feed CTA -> marketplace/job flow
3) location off -> explore fallback

For each journey provide:
- pass/fail
- exact reproduction steps
- environment/device/build info
- screenshots or logs
- bug severity if failed

Conclude with:
- go/no-go recommendation
- top risks before rollout
```

#### Prompt E — Rollout decision + rollback
```text
You are the release decision assistant for Coalition feature flag {FLAG_NAME}.

Inputs:
- current cohort: {COHORT}
- error rates: {ERROR_METRICS}
- retention/conversion trend vs control: {KPI_DELTA}
- open incidents: {INCIDENTS}

Tasks:
1) Decide: proceed, hold, or rollback.
2) Provide rationale tied to defined rollout gates in docs/COALITION_ALIGNMENT_WORK_ORDER.md.
3) If rollback is recommended, provide immediate operator checklist and communication draft.
4) If proceeding, define next cohort guardrails and monitoring window.

Output must be concise and operator-ready.
```

#### Prompt F — Weekly status synthesis
```text
Generate weekly Coalition program status for WS1-WS7.

For each workstream include:
- status (not started/in progress/blocked/done)
- completed outcomes this week
- next actions
- blockers + owner
- risk changes

Also include:
- KPI trend summary against 90-day goals
- rollout stage by feature flag
- asks needed from leadership this week
```
