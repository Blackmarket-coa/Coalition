# Legacy Navigator App

This directory contains the original Fleetbase Navigator app (v1.1.18) that preceded the current Blackstar Navigator monorepo. It is preserved for reference and migration purposes.

## Status

**Deprecated** - This codebase has been superseded by the monorepo architecture at the repository root. All active development occurs in:
- `src/` - Main app source
- `apps/` - Gateway API, mobile, and web apps
- `packages/` - Shared core and UI libraries

## Original Overview

Fleetbase Navigator was an open-source navigation and order management app for drivers and agents using the Fleetbase platform. It provided:

- Order management with status updates
- QR code scanning and digital signatures
- Route navigation for delivery agents
- Driver wallet and earnings management
- Schedule view for daily tasks
- GPS tracking and fleet operations

## Tech Stack (Legacy)

| Component | Version |
|---|---|
| React Native | Pre-0.77 |
| Fleetbase SDK | `@fleetbase/sdk` |
| Styling | Tailwind CSS (`tailwind.config.js`) |
| State | React Context |
| License | MIT |

## Key Differences from Current App

| Aspect | Legacy | Current |
|---|---|---|
| Name | Fleetbase Navigator | Blackstar Navigator |
| Package | `@fleetbase/navigator-app` | `@blackstar/mobile` |
| Architecture | Single app | Monorepo (apps + packages) |
| UI Framework | Tailwind CSS | Tamagui |
| Backend | Fleetbase API only | Blackstar Gateway + Medusa + Matrix |
| Chat | Fleetbase chat | Matrix protocol + Fleetbase chat |
| Maps | Google Maps / Mapbox | MapLibre + Martin tile server |
| Governance | None | Spatial governance with voting |
| Marketplace | None | Spatial feed, provider onboarding |
| License | MIT | AGPL-3.0-or-later |

## Running (Not Recommended)

This legacy app is not actively maintained. If you need to run it for reference:

```bash
cd legacy
yarn install
npx pod-install    # iOS only
yarn ios           # or yarn android
```

Requires a `.env` file with Fleetbase API credentials:

```env
APP_NAME=
APP_IDENTIFIER=io.navigator.app
APP_LINK_PREFIX=navigator://
FLEETBASE_HOST=https://127.0.0.1:8000
FLEETBASE_KEY=
```
