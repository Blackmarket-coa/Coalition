# Repository Alignment Audit (Blackout Ecosystem)

This audit checks how `/workspace/Coalition` aligns with the target Blackmarket ecosystem repos and the UX direction described in the request.

## Scope compared
- `Blackout_App`
- `free-black-market`
- `blackout`
- `Blackout_server`
- `Blackstar`
- `blackstar_nav`

## Executive verdict
**Partially aligned, but not yet fully aligned.**

The repository already contains foundational pieces for Matrix, governance, location consent, and a TikTok-style video feed component; however, the app shell and active navigation still prioritize a driver-centric Blackstar navigator flow, and several “general-user-first” and integration-level requirements are not wired end-to-end.

## What is aligned today

### 1) Blackstar lineage and gateway compatibility
- Repo identity and setup are still Blackstar Navigator-centric.
- Environment/config expectations reference Blackstar gateway contracts.

### 2) Blackout/Matrix primitives exist
- Matrix context/provider exists with room and crypto wiring patterns.
- Governance context exists with Matrix + local persistence and voting/delegation logic.

### 3) Video feed + chatroom UI components exist
- A vertical short-video feed component exists.
- The feed has right-rail actions, room badge, and an embedded chat panel pattern tied to room IDs.

### 4) Consent-oriented location controls exist
- Location permission flow includes precise/approximate/off path and skip option.
- Spatial feed service includes visibility-aware data shape and fallback behavior.

## Where alignment is currently missing

### 1) App entry/navigation is still driver-first
- Main authenticated route resolves to `DriverNavigator`.
- Tabs are `Orders / Chat / Post / Account` in a driver workflow, not a general-user home + feed-first IA.

### 2) General-user-first Home experience is not the default
- There is no default “Good morning + four universal action tiles” landing path as primary IA.
- Current primary work surface is order management.

### 3) Vertical video feed is not clearly wired as primary center-tab experience
- Video feed component is present in UI package but not clearly integrated as core mobile tab route in the active navigator shown here.

### 4) Consent copy/UX depth differs from described privacy-first narrative
- The screen supports choice + skip, but the fully detailed consent language and guarantees from the described flow are not fully present in the visible implementation.

### 5) End-to-end cross-repo parity is not demonstrated in-repo
- This repo has interfaces/stubs for multi-system integration, but no in-repo proof that all listed upstream repos are at feature parity (or synced contracts) right now.

## Practical conclusion
If your target is the redesign described (general-user-first IA + center-feed + Matrix room comments + consent-first location that gracefully degrades), this repo is **on the path** but **not yet fully in alignment**.

## Recommended next milestones
1. Promote a new **general-user root navigator** and make driver/provider flows secondary.
2. Wire `VerticalVideoFeed` into the main tab IA as the center action.
3. Add explicit consent-policy copy and a robust privacy settings surface linked from profile.
4. Define and track a cross-repo contract matrix (API + events + room schemas) to verify parity with the listed repositories.
5. Add integration tests for feed-room-comment behavior and location consent degradation paths.
