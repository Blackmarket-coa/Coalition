# BMC Unified App Build Plan — Summary

Source: `bmc-build-plan.pdf` (March 2026)

## Vision
BMC is a **spatial-first, consent-based, federated** social platform that unifies:
- FreeBlackMarket (MedusaJS marketplace)
- Blackstar (logistics/jobs)
- Blackout/Synapse (Matrix E2EE chat + governance)

Primary UX is map-centric (Snap Map style), with video feed (TikTok style), profiles (Instagram style), and privacy-first location controls.

## Core stack
- React Native 0.77 + React Native Web
- Tamagui UI
- MapLibre GL + self-hosted tiles (Martin + PostGIS + PMTiles)
- Matrix (Synapse + matrix-js-sdk)
- Hono API gateway
- SQLite + Yjs for offline/collaborative capability

## 26-week roadmap

### Phase 0 (Weeks 1–2): Foundation
- Fork `blackstar_nav` into BMC app and restructure to Turborepo monorepo.
- Remove driver-only screens, keep shared auth/chat/map/location/order infrastructure.
- Replace `react-native-maps` with `@maplibre/maplibre-react-native`.
- Deploy Martin tile server + PostGIS; create initial map style + icon sprites.
- Stand up Hono gateway stub and CI for iOS/Android/Web.

### Phase 1 (Weeks 3–6): Map + Marketplace
- Build unified spatial feed endpoint in gateway (vendors, jobs, gardens, votes, aid, infra).
- Implement clustered map canvas and layer toggles.
- Extend Medusa with location + visibility controls.
- Add consent-based approximate location flow.

### Phase 2 (Weeks 7–10): Blackout feed + chat
- Integrate matrix-js-sdk + room lifecycle in app context.
- Build vertical short-video feed connected to Matrix rooms.
- Add E2EE live comment/chat panels.

### Phase 3 (Weeks 11–14): Jobs + logistics
- Add Blackstar gateway client for jobs and claims.
- Introduce provider onboarding + profile setup across systems.
- Surface routing/assignment with map integration.

### Phase 4 (Weeks 15–18): Governance
- Port Blackout governance engines into mobile/web experience.
- Add governance map layer and proposal details.
- Implement voting participation flows.

### Phase 5 (Weeks 19–22): Mutual aid/community
- Build mutual-aid module and spatial requests.
- Add unified post creation spanning map/video/text/community content.
- Expand social graph/community interactions.

### Phase 6 (Weeks 23–26): Polish + release
- Accessibility and performance hardening.
- Comprehensive privacy/consent settings and account controls.
- Offline queue + sync reliability.
- Solarpunk animation system.
- App Store, Play Store, and PWA deployment readiness.

## Cross-cutting principles
- General-user-first (not driver/vendor-only)
- Consent-first approximate location controls
- Blackout-native E2EE messaging
- Solarpunk visual language
- Offline-first behavior

## AI prompt appendix
The PDF includes a full prompt index for each implementation milestone (monorepo, MapLibre migration, gateway feed, Matrix integration, governance, privacy settings, animation system), intended for AI-assisted delivery.
