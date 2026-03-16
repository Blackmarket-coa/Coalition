# Remediation Backlog + AI Prompt Pack

Created to convert currently identified TODO/TBD/incomplete planning signals into executable work.

## 1) Prioritized Action List

### P0 — Blockers (do first)

1. **Unify package manager and lockfile policy**
   - Goal: Root-managed Yarn workspace with deterministic installs.
   - Why now: Root lint/test cannot run reliably while workspace/lockfile drift remains.
   - Done when:
     - One lockfile policy is documented and enforced.
     - Nested conflicting lockfiles removed.
     - Root install is reproducible.

2. **Restore CI baseline for lint and tests**
   - Goal: `yarn lint` and `yarn test` pass from repo root.
   - Why now: Delivery risk is highest without a green baseline.
   - Done when:
     - CI runs lint + test on every PR.
     - Failures are attributable to feature changes, not workspace drift.

3. **Assign WS1–WS7 ownership and due dates**
   - Goal: Replace all `TBD` owners/dates in alignment work order.
   - Why now: Planning is not actionable until owners/timelines are explicit.
   - Done when:
     - Product, engineering, and QA owners assigned per workstream.
     - Dependency owners and target dates populated.

### P1 — High-value stabilization

4. **Eliminate duplicate source-of-truth (`src` vs `packages`)**
   - Goal: Define ownership boundaries and migrate duplicate modules.
   - Done when:
     - Ownership policy is documented.
     - First vertical slice migration completed with parity checks.

5. **Normalize quality scripts in each workspace**
   - Goal: Every package exports `lint`, `test`, and `typecheck` scripts (as applicable).
   - Done when:
     - Turbo pipelines map to real scripts everywhere.
     - Missing package checks are removed.

6. **Track code-level TODOs as issues**
   - Current code TODOs:
     - Plugin extensibility in `src/legacy/config.js`.
     - Android backup include/exclude policy in `android/app/src/main/res/xml/data_extraction_rules.xml`.
   - Done when:
     - Each TODO has owner, acceptance criteria, and target release.

### P2 — Program execution readiness

7. **Resolve cross-workstream dependency contracts**
   - Feature flags baseline
   - Matrix `room_id` metadata
   - Onboarding endpoint contract
   - Cross-system identity mapping
   - Analytics ingestion/dashboard schema

8. **Operationalize launch gates**
   - Goal: Convert go/no-go checklist into executable checks in CI + release process.
   - Done when:
     - Smoke journeys run consistently.
     - Rollback flags are tested in production-like environment.

### P3 — Hygiene and documentation

9. **Deduplicate/align docs with real architecture**
10. **Create and maintain a live tech debt register**

---

## 2) Suggested Issue Tickets (ready to paste)

### Ticket 1 — Standardize Workspace Lockfile Strategy
- **Type:** Engineering / Build
- **Priority:** P0
- **Problem:** Mixed lockfile usage causes workspace instability and broken root checks.
- **Scope:** Define and enforce single lockfile policy for monorepo.
- **Acceptance Criteria:**
  1. Root install succeeds from clean checkout.
  2. No nested lockfiles that violate policy.
  3. CI guardrail fails on lockfile policy regressions.
- **Dependencies:** None
- **Risk if delayed:** Ongoing nondeterministic builds.

### Ticket 2 — Recover Green Baseline for Root Lint/Test
- **Type:** Engineering / CI
- **Priority:** P0
- **Problem:** Root checks fail before feature validation starts.
- **Acceptance Criteria:**
  1. `yarn lint` passes at root.
  2. `yarn test` passes at root.
  3. CI publishes test/lint artifacts.
- **Dependencies:** Ticket 1

### Ticket 3 — Assign Owners and Dates for WS1–WS7 + Dependencies
- **Type:** Program
- **Priority:** P0
- **Problem:** Workstream and dependency ownership are mostly `TBD`.
- **Acceptance Criteria:**
  1. All ownership and due-date cells populated.
  2. Milestone mapping approved in planning review.
  3. Escalation path documented for blocked dependencies.
- **Dependencies:** None

### Ticket 4 — Canonicalize Module Ownership and Remove Duplication
- **Type:** Engineering / Architecture
- **Priority:** P1
- **Acceptance Criteria:**
  1. Ownership ADR/doc approved.
  2. One vertical slice migrated from duplicate to canonical package.
  3. Regression smoke checks pass.
- **Dependencies:** Ticket 2

### Ticket 5 — Add Lint/Test/Typecheck Scripts Across Packages
- **Type:** Engineering / Quality
- **Priority:** P1
- **Acceptance Criteria:**
  1. Every package has explicit quality scripts or documented exemption.
  2. Turbo pipeline succeeds end-to-end.
  3. CI runs all defined package checks.
- **Dependencies:** Ticket 2

### Ticket 6 — Resolve Legacy Config Plugin TODO
- **Type:** Engineering / App Config
- **Priority:** P1
- **Acceptance Criteria:**
  1. Plugin extension approach documented and implemented (or TODO replaced with issue reference and rationale).
  2. Backward compatibility validated.
- **Dependencies:** Ticket 4

### Ticket 7 — Define Android Backup Extraction Rules
- **Type:** Engineering / Android
- **Priority:** P1
- **Acceptance Criteria:**
  1. Data include/exclude policy agreed with product/security.
  2. XML rules updated from sample defaults.
  3. Restore behavior validated on Android 12+ test scenario.
- **Dependencies:** Security/privacy signoff

### Ticket 8 — Close Workstream Contract Gaps (Flags/API/Identity/Analytics)
- **Type:** Cross-team
- **Priority:** P2
- **Acceptance Criteria:**
  1. Each dependency has owner + due date + schema contract.
  2. Integration tests cover happy path + fallback path.
  3. Dashboards visible before rollout.
- **Dependencies:** Ticket 3

---

## 3) AI Prompt Pack

Use these as copy/paste prompts for implementation planning and execution.

### Prompt A — P0 Lockfile/Workspace Recovery
```text
You are helping stabilize a monorepo build system.

Objective:
- Enforce a single package manager and lockfile strategy.
- Restore deterministic workspace installs.

Tasks:
1) Inspect root and nested lockfiles/package manager declarations.
2) Propose an explicit lockfile policy and migration plan.
3) Implement minimal changes to enforce policy.
4) Add CI guardrails to detect policy regressions.
5) Produce a validation checklist with exact commands.

Constraints:
- Prefer smallest safe diff.
- Preserve developer workflows where possible.
- Include rollback steps.

Output format:
- Findings
- Proposed policy
- Patch plan
- Validation commands
- Rollback plan
```

### Prompt B — P0 CI Baseline Recovery
```text
You are repairing CI baseline reliability for lint and tests.

Objective:
- Make root `yarn lint` and `yarn test` pass consistently.

Tasks:
1) Run lint/test at root and capture first-failure diagnostics.
2) Fix configuration/script wiring issues causing systemic failures.
3) Keep feature behavior unchanged.
4) Add/adjust CI job steps so failures are visible and reproducible.
5) Provide before/after evidence.

Output format:
- Root cause summary
- Changes made
- Test evidence (commands + pass/fail)
- Remaining risks
```

### Prompt C — Program Management Fill-In (WS1–WS7)
```text
You are assisting with delivery planning.

Input doc:
- docs/COALITION_ALIGNMENT_WORK_ORDER.md

Objective:
- Replace all TBD ownership and due-date fields with a concrete proposal.

Tasks:
1) Generate owner-role assignments for each workstream and dependency row.
2) Suggest due dates based on milestone sequencing.
3) Identify blockers and escalation owners.
4) Create a weekly execution dashboard table.

Output format:
- Updated ownership table
- Dependency schedule
- Blocker escalation matrix
- Week-by-week milestone plan
```

### Prompt D — Duplication Migration Slice
```text
You are executing a vertical-slice migration to remove duplicate source-of-truth code.

Objective:
- Migrate one feature slice from root `src` duplicates to canonical `packages/*` ownership.

Tasks:
1) Identify duplicate modules for selected slice.
2) Define canonical modules and import boundaries.
3) Apply migration patch with minimal behavior change.
4) Add/update tests for parity.
5) Provide follow-up checklist for next slice.

Output format:
- Slice selected
- Duplication map
- Migration diff summary
- Validation evidence
- Next-slice recommendation
```

### Prompt E — Workspace Quality Script Normalization
```text
You are standardizing quality gates across monorepo packages.

Objective:
- Ensure each package has explicit lint/test/typecheck scripts (or documented exemptions).

Tasks:
1) Audit package scripts.
2) Add missing scripts with sensible defaults.
3) Update turbo pipeline mapping if required.
4) Run end-to-end quality checks.
5) Produce package-by-package status table.

Output format:
- Script audit table
- Changes applied
- Validation commands
- Exemptions and rationale
```

### Prompt F — Code TODO Conversion to Tracked Work
```text
You are converting code TODO comments into tracked implementation work.

Objective:
- For each TODO, create a concrete issue plan with owner and acceptance criteria.

Tasks:
1) Locate TODO comments in source/config files.
2) Infer intent and affected systems.
3) Draft issue titles, scope, acceptance criteria, risks, and test plan.
4) Recommend implementation order.

Output format:
- TODO inventory
- Issue drafts
- Priority order
- Risk notes
```

### Prompt G — Launch Gate Operationalization
```text
You are operationalizing release readiness gates for a feature-flagged rollout.

Objective:
- Turn go/no-go checklist into executable checks.

Tasks:
1) Translate checklist items into CI or runbook checks.
2) Define thresholds and owners for each gate.
3) Add rollback drills and verification steps.
4) Produce a cohort rollout checklist (internal, 1%, 5%, 25%, 100%).

Output format:
- Gate-to-check mapping
- Threshold table
- Rollback drill steps
- Rollout signoff template
```
