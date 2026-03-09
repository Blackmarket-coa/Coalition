# Monorepo Restructure (Turborepo)

## New top-level structure

```text
.
├── apps/
│   ├── mobile/
│   │   ├── package.json
│   │   └── yarn.lock
│   ├── web/
│   │   └── package.json
│   └── gateway/
│       ├── package.json
│       └── src/
│           └── index.js
├── packages/
│   ├── core/
│   │   ├── package.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── contexts/
│   │       ├── hooks/
│   │       ├── services/
│   │       ├── utils/
│   │       └── constants/
│   └── ui/
│       ├── package.json
│       └── src/
│           ├── index.ts
│           └── components/
├── package.json
├── turbo.json
└── tsconfig.json
```

## Kept screens
- BootScreen
- LoginScreen
- OrderScreen
- ChatHomeScreen
- ChatChannelScreen
- EntityScreen

## Removed driver-specific screens
- DriverDashboardScreen
- DriverFleetScreen
- FuelReportScreen
- VehicleScreen
- DriverReportScreen
