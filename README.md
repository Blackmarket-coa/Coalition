<p align="center">
  <img src="assets/navigator-icon-transparent.png" width="140" height="140" />
</p>
<p align="center">
Coalition is a social-first discovery and activation app for the Blackmarket ecosystem, with backward-compatible driver workflows for Blackstar operations.
</p>

<p align="center">
  <a href="https://github.com/Blackmarket-coa/Blackstar">Blackstar Repository</a>
</p>

<p align="center">
	<img src="https://github.com/user-attachments/assets/05c81b07-cd52-43e9-b0ac-91e0683ab5f9" width="220" height="416" />
	<img src="https://github.com/user-attachments/assets/cfa08ce8-bf13-4bb3-96ef-f73045ee157a" width="220" height="416" />
	<img src="https://github.com/user-attachments/assets/893b58f4-b1ce-4ff5-a78e-530a2035c84b" width="220" height="416" />
	<img src="https://github.com/user-attachments/assets/770582ef-11c3-4d25-bc68-9df72b41c452" width="220" height="416" />
</p>
<p align="center">
	<img src="https://github.com/user-attachments/assets/bfe5ca18-07c1-4188-be8e-277e5ebf7abc" width="220" height="416" />
	<img src="https://github.com/user-attachments/assets/93e3ee4a-6add-4b82-ae93-ae6f5a217400" width="220" height="416" />
	<img src="https://github.com/user-attachments/assets/f21c7514-9cfb-4c3e-bdc4-5254565c1b26" width="220" height="416" />
</p>

## Table of Contents

- [About](#about)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
  - [Configure Environment](#configure-environment)
  - [Gateway Setup](#gateway-setup)
- [Running the App](#running-the-app)
  - [iOS Simulator](#run-the-app-in-ios-simulator)
  - [Android Simulator](#run-the-app-in-android-simulator)
  - [Web](#run-the-web-app)
  - [Gateway API](#run-the-gateway-api)
- [Project Structure](#project-structure)
- [Documentation](#documentation)
- [Roadmap](#roadmap)

## About

Coalition is the social discovery + trust + activation layer for the Blackmarket ecosystem. The app now supports a social-first experience (Home, Feed, Explore, Messages, You) while preserving role-aware Blackstar driver flows behind feature flags and route gates.

### Current App Surfaces

- **Social-first Coalition shell** with onboarding, vertical feed, discovery map, messages, and profile.
- **Driver-compatible routes** retained for order-management and legacy role workflows.
- **Action routing layer** for ecosystem actions like marketplace, jobs, aid, governance, and room-based messaging.
- **Consent-first privacy controls** including approximate/precise/off location modes and privacy settings.

### Feature Flags (Rollout Controls)

These environment flags control staged rollout and rollback behavior:

- `COALITION_NAV_ENABLED` (default `true`): toggles Coalition social shell vs legacy Driver navigator.
- `COALITION_ONBOARDING_ENABLED` (default `true`): toggles social onboarding flow.
- `COALITION_FEED_RANKING_ENABLED` (default `true`): toggles ranked feed request model params.
- `COALITION_ACTION_ROUTER_ENABLED` (default `true`): toggles unified ecosystem action routing (with safe fallbacks).

See `docs/COALITION_SOCIAL_MIGRATION_ROLLOUT.md` for staged rollout and rollback playbook.
Blackstar Navigator is a cross-platform (iOS, Android, Web) application for order management, real-time geolocation tracking, community marketplace, and spatial governance. Built as a monorepo, it provides drivers and agents with tools for order fulfillment, navigation, chat, proof of delivery, provider onboarding, and decentralized governance through spatial proposals and voting.

## Features

### Order Management
- Full order lifecycle tracking (created, active, completed, canceled)
- Calendar view with date-based order filtering
- Ad-hoc (nearby) order claiming for available jobs
- Order waypoint navigation with live route display
- Order payload entity and tracking number management
- Order activity updates, comment threads, and document files
- Money input with percentage adjustments for totals

### Proof of Delivery
- Digital signature capture
- QR code scanning for delivery verification
- Photo capture for delivery proof
- Multiple POD methods per order activity

### Real-time Location Tracking
- Background geolocation with `react-native-background-geolocation`
- Privacy-safe location modes: exact, approximate, or off
- Location fuzzing within configurable radius for privacy
- Location consent management (grant, deny, revoke)
- Live order route visualization on MapLibre maps

### Chat & Messaging
- Chat channel creation, listing, and management
- Unread message count with tab badge indicators
- File and media attachments
- Channel participant management
- Matrix protocol integration for decentralized messaging with room tagging (`m.bmc.feed`, `m.bmc.governance`, `m.bmc.chat`)

### Spatial Governance
- Proposal lifecycle: draft, discuss, amend, close, decide
- Vote casting (approve, reject, abstain) with tally tracking
- Liquid democracy delegation with configurable depth limits
- Quorum threshold configuration
- Yjs CRDT-based collaborative document editing
- GeoJSON spatial proposal mapping with coordinates and radius

### Spatial Feed
- Bounding-box geospatial queries across four layers: market, jobs, govern, aid
- Entity types: seller, product, kitchen, producer, garden
- GeoJSON FeatureCollection responses with Redis caching
- PostgreSQL/PostGIS spatial repository

### Provider Onboarding
- Multi-step wizard: Roles, Profile, Location, Offerings, Review
- Seven provider roles: Grower, Maker, Mover, Healer, Teacher, Builder, Organizer
- Offering pricing modes: price, time_bank, free, sliding_scale
- Medusa product creation, Matrix room setup, and Blackstar API registration

### Free Black Market Webhook
- External order ingestion with geolocation routing
- Claim policies: first_claim, bid
- Transport capability and category-based routing

### Marketplace & E-commerce
- Custom Medusa modules for mutual aid and seller locations
- Seller geospatial location tracking with PostGIS
- Shopping cart functionality
- Aid post and response workflows

### Additional Features
- Fuel report creation and editing
- Issue tracking and management (12 categories, 6 priority levels)
- Push notifications with device token management
- Dark and light theme support via Tamagui design system
- Internationalization (i18n) with locale management
- Driver online/offline toggle
- Deep linking via instance link handler

## Architecture

```
Coalition/
├── apps/
│   ├── gateway/          # Hono.js API server (spatial feed, governance, provider profiles, webhooks)
│   ├── mobile/           # React Native mobile app (iOS/Android) - main app code lives at root
│   └── web/              # Web app (Webpack)
├── packages/
│   ├── core/             # Shared hooks (16), contexts (13), services, utilities
│   └── ui/               # 70+ shared UI components, map styling
├── medusa-modules/
│   ├── mutual-aid/       # Medusa module for community mutual aid
│   └── seller-location/  # Medusa module for geospatial seller locations
├── infra/
│   └── martin/           # MapLibre tile server (Docker, Railway deployment)
├── src/                  # Main app source (screens, contexts, components, hooks, services)
├── legacy/               # Legacy pre-monorepo app
└── translations/         # i18n language files
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile | React Native 0.77, React 18 |
| Web | Webpack 5 |
| UI Framework | Tamagui v1.125 (cross-platform design system) |
| Backend API | Hono.js 4.6, Node.js, TypeScript |
| Database | PostgreSQL + PostGIS |
| Cache | Redis (ioredis) |
| Maps | MapLibre React Native, Martin tile server |
| Real-time | SocketCluster |
| Messaging | Matrix SDK (matrix-js-sdk) |
| E-commerce | Medusa.js (custom modules) |
| Auth | Phone/SMS, Facebook, Google, Apple OAuth |
| State | React Context API (13 providers) |
| Monorepo | Yarn 4.12 workspaces + Turborepo |
| Validation | Zod |
| CI/CD | GitHub Actions |

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Yarn](https://yarnpkg.com/) 4.x
- [React Native CLI](https://reactnative.dev/docs/environment-setup)
- Xcode 14+ (for iOS)
- Android Studio (for Android)
- PostgreSQL with PostGIS extension (for gateway)
- Redis (for gateway caching)

## Installation

Clone the repository and install dependencies:

In your `.env` file supply your API secret key, and additionally an ArcGIS API key. Lastly, set your app/bundle identifier and an `APP_NAME` key.
```bash
git clone git@github.com:Blackmarket-coa/Coalition.git
cd Coalition
yarn install
```

For iOS, install CocoaPods dependencies:

```bash
yarn pod:install
```

### Configure Environment

Create a `.env` file at the root of the project:

```bash
touch .env
```

Add the following configuration:

```env
# App Configuration
APP_NAME=Blackstar Navigator
APP_IDENTIFIER=com.blackmarket.blackstar
APP_LINK_PREFIX=blackstar://

# Blackstar Gateway
BLACKSTAR_GATEWAY_HOST=https://api.blackmarket.coa
BLACKSTAR_GATEWAY_KEY=

# SocketCluster (Real-time)
BLACKSTAR_SOCKET_HOST=socket.blackmarket.coa
BLACKSTAR_SOCKET_PORT=8000
BLACKSTAR_SOCKET_SECURE=true

# Coalition feature flags
COALITION_NAV_ENABLED=true
COALITION_ONBOARDING_ENABLED=true
COALITION_FEED_RANKING_ENABLED=true
COALITION_ACTION_ROUTER_ENABLED=true
```

# Maps
ARCGIS_API_KEY=

# OAuth (optional)
GOOGLE_CLIENT_ID=
GOOGLE_IOS_CLIENT_ID=
FACEBOOK_APP_ID=
FACEBOOK_CLIENT_TOKEN=

# Default map coordinates (lng,lat)
DEFAULT_COORDINATES=1.369,103.8864
```

### Gateway Setup

The gateway API requires additional environment variables:

```env
# Gateway API
MEDUSA_BACKEND_URL=
MEDUSA_PUBLISHABLE_KEY=
MEDUSA_ADMIN_TOKEN=
BLACKSTAR_API_URL=
BLACKSTAR_API_TOKEN=
BLACKOUT_HOMESERVER_URL=
BLACKOUT_MATRIX_SERVICE_TOKEN=
DATABASE_URL=postgresql://user:pass@host:port/dbname
REDIS_URL=redis://127.0.0.1:6379
PORT=8787
```

## Running the App

### Run the App in iOS Simulator

```bash
yarn ios
```

### Run the App in Android Simulator

```bash
yarn android
```

### Run the Web App

```bash
yarn web
```

### Run the Gateway API

```bash
cd apps/gateway
yarn dev
```

### Run All Apps (Development)

```bash
yarn dev
```

## Project Structure

### Key Directories

| Path | Description |
|------|-------------|
| `src/screens/` | 30 screen components (orders, chat, auth, profile, etc.) |
| `src/contexts/` | 13 React context providers for state management |
| `src/hooks/` | 16 custom hooks (auth, cart, location, fleetbase, etc.) |
| `src/services/` | API clients (Blackstar gateway, spatial feed, Medusa location) |
| `src/components/` | App-level components (65+ files) |
| `src/navigation/` | React Navigation setup with tab and stack navigators |
| `packages/core/` | Shared business logic re-exported for all apps |
| `packages/ui/` | Shared UI component library (70+ components) |
| `apps/gateway/src/routes/` | API routes (spatial-feed, spatial-governance, provider-profile, webhook) |
| `apps/gateway/src/services/` | Backend services (Blackstar API client, spatial repository, Medusa spatial) |

### Navigation Structure

```
AppNavigator (Root Stack)
├── Boot Screen
├── Location Permission
├── Instance Link
├── Auth Stack (Login, Phone Login, Create Account)
└── Driver Navigator (Bottom Tabs - authenticated)
    ├── Orders Tab (Order Management, Order Details, Entity, Proof of Delivery)
    ├── Chat Tab (Chat Home, Channel, Participants, Create Channel)
    ├── Post Tab (Content posting, provider-gated features)
    └── Account Tab (Profile, Account Settings, Provider Onboarding)
```

## Documentation

- Coalition alignment work order: `docs/COALITION_ALIGNMENT_WORK_ORDER.md`
- Coalition rollout playbook: `docs/COALITION_SOCIAL_MIGRATION_ROLLOUT.md`
- Blackstar integration service docs and API runbooks are maintained with internal environment-specific setup notes.

If you contribute to this app, keep feature parity aligned with the Blackstar gateway contracts and release checklist.

## Roadmap

- Ongoing: Coalition social-first migration hardening and metrics-driven rollout.
