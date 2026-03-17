# BMC Execution Backlog and AI Prompt Pack

This document operationalizes the provided task matrix into a repo-native execution backlog with reusable prompts.

## Delivery Backlog (Product App)

### Phase 1 — Foundation (Weeks 1-4)
| Task | Description | Dependencies | Priority | Status | AI Prompt | Est. Hours |
|---|---|---|---|---|---|---:|
| Fork `blackstar_nav` -> `apps/bmc-app/` | Copy source, rename package, update bundle IDs, remove Fleetbase branding. | Monorepo exists | P0 | NOT STARTED | No | 2 |
| Replace react-native-maps with MapLibre | Remove `@react-native-maps`, install `@maplibre/maplibre-react-native`, update map component and Martin tile URL. | bmc-app scaffold | P0 | NOT STARTED | Yes | 4 |
| Tamagui theme setup | Solarpunk tokens (greens, golds), organic radii, sine-wave motion defaults. | bmc-app scaffold | P0 | NOT STARTED | Yes | 3 |
| Hono gateway API client | `packages/api-client` wired to `HONO_GATEWAY_URL`, JWT injection, refresh flow, typed responses. | Hono gateway deployed | P0 | NOT STARTED | Yes | 3 |
| Spatial feed on map | Load `/api/feed/spatial`, render markers/zones/layers, cluster at low zoom. | Gateway + Martin + PostGIS | P0 | NOT STARTED | Yes | 6 |
| Bottom sheet navigation pattern | Map is root; vendor/product/cycle/cart views via `@gorhom/bottom-sheet`. | Spatial feed | P0 | NOT STARTED | Yes | 4 |
| Layer toggle chips | Horizontal chips to toggle Vendors/Food/Deliveries/Gardens/Events/Governance layers. | Spatial feed | P1 | NOT STARTED | Yes | 2 |

### Phase 2 — Marketplace (Weeks 5-8)
| Task | Description | Dependencies | Priority | Status | AI Prompt | Est. Hours |
|---|---|---|---|---|---|---:|
| Vendor profile bottom sheet | Marker tap -> vendor profile with products, order cycles, QR share. | Spatial feed | P0 | NOT STARTED | Yes | 4 |
| Product browsing + detail view | Product list/detail, variants, add-to-cart. | Vendor profile | P0 | NOT STARTED | Yes | 4 |
| Order Cycle browsing | Open cycles map/list, cycle details, add cycle items to cart. | Spatial feed + Order Cycle API | P0 | NOT STARTED | Yes | 5 |
| Cart + checkout | Multi-vendor/cycle cart, Stripe payment, address/pickup, confirmation. | Product browsing | P0 | NOT STARTED | Yes | 6 |
| AI shopping assistant | Prompt-to-list flow via `/api/ai/chat` over product catalog. | Ollama RAG + product catalog | P1 | NOT STARTED | Yes | 6 |
| AI vendor onboarding flow | Photo -> `/api/ai/generate-listing` -> editable draft -> publish. | Ollama LLaVA | P1 | NOT STARTED | Yes | 4 |

### Phase 3 — Communication (Weeks 9-12)
| Task | Description | Dependencies | Priority | Status | AI Prompt | Est. Hours |
|---|---|---|---|---|---|---:|
| Matrix SDK integration | Matrix auth/session integration and secure token storage. | Blackout server deployed | P0 | NOT STARTED | Yes | 6 |
| DM between buyer and vendor | CTA from vendor profile into Matrix DM (E2EE default). | Matrix SDK | P0 | NOT STARTED | Yes | 4 |
| Community rooms | Join public rooms from map markers and expose in Chat tab. | Matrix SDK + room templates | P1 | NOT STARTED | Yes | 4 |
| Order discussion rooms | Private order rooms with status bot messages. | FBM bridge + Matrix SDK | P1 | NOT STARTED | Yes | 4 |
| Push notifications | FCM/APNs for messages/orders/cycles/delivery updates. | Matrix SDK + Medusa | P0 | NOT STARTED | Yes | 4 |

### Phase 4 — Social Commerce (Weeks 13-16)
| Task | Description | Dependencies | Priority | Status | AI Prompt | Est. Hours |
|---|---|---|---|---|---|---:|
| Tipping system | Stripe micro-payments for vendor/driver tipping + history. | Stripe integration | P1 | NOT STARTED | Yes | 4 |
| Spatial boosts | Paid map marker boosts with pulse/glow behavior. | Map markers | P1 | NOT STARTED | Yes | 3 |
| TikTok-style video feed | Vertical feed + Matrix-backed comments per video. | Matrix SDK + media | P2 | NOT STARTED | Yes | 8 |
| Social referral system | Share links/QR, track attribution, grant credits/discounts. | Vendor profiles | P1 | NOT STARTED | Yes | 4 |
| Live market events | Audio-first live shopping via Matrix VoIP. | Matrix VoIP + products | P2 | NOT STARTED | Yes | 8 |

### Phase 5 — Governance & Community (Weeks 17-20)
| Task | Description | Dependencies | Priority | Status | AI Prompt | Est. Hours |
|---|---|---|---|---|---|---:|
| Governance proposals on map | Governance markers + proposal preview/vote in sheet. | ProposalEngine + spatial feed | P1 | NOT STARTED | Yes | 4 |
| Simplified voting UI | Yes/No actions, quorum, progress, countdown. | Governance map layer | P1 | NOT STARTED | Yes | 4 |
| Mutual aid posts | Long-press map to post needs/offers with 7-day expiry. | Spatial feed | P1 | NOT STARTED | Yes | 4 |
| Time banking | Contribution ledger integration with redemption flow. | Hawala ledger (FBM) | P2 | NOT STARTED | Yes | 6 |
| Community garden layer | Plot availability, schedules, harvest alerts, shift signup. | Garden module (FBM) | P2 | NOT STARTED | Yes | 4 |

### Phase 6 — Polish & Launch (Weeks 21-26)
| Task | Description | Dependencies | Priority | Status | AI Prompt | Est. Hours |
|---|---|---|---|---|---|---:|
| Offline mode (RxDB + PMTiles) | Cache catalog/vendors/tiles, queue orders offline, sync later. | All features stable | P1 | NOT STARTED | Yes | 8 |
| Privacy controls screen | Granular location/data/communication/notification controls. | All features | P1 | NOT STARTED | Yes | 3 |
| Solarpunk animation system | Fibonacci/sine-wave animation motifs and micro-interactions. | Tamagui theme | P2 | NOT STARTED | Yes | 6 |
| Accessibility audit | Screen reader, contrast, scaling, tap targets, VoiceOver/TalkBack. | All features | P1 | NOT STARTED | No | 4 |
| Performance optimization | Lazy loading, caching, bundle reduction, rendering profile, 60fps target. | All features | P1 | NOT STARTED | No | 4 |
| App Store submission (iOS) | App Store assets, policy, TestFlight, review compliance. | All P0+P1 complete | P0 | NOT STARTED | No | 4 |
| Play Store submission (Android) | Play assets, testing track, content rating, policy setup. | All P0+P1 complete | P0 | NOT STARTED | No | 3 |

## Delivery Backlog (Infrastructure Services)

### Hono API Gateway (`services/hono-gateway`)
| Task | Description | Dependencies | Priority | Status | AI Prompt | Est. Hours |
|---|---|---|---|---|---|---:|
| Create Hono scaffold | TS routes: marketplace/chat/logistics/tiles/ai/feed | Monorepo exists | P0 | NOT STARTED | Yes | 3 |
| Marketplace proxy routes | Proxy `/api/marketplace/*` -> Medusa with auth headers + CORS. | Medusa running | P0 | NOT STARTED | Yes | 2 |
| Chat proxy routes | Proxy `/api/chat/*` -> Blackout API, token translation if needed. | Blackout running | P1 | NOT STARTED | Yes | 2 |
| Logistics proxy routes | Proxy `/api/logistics/*` -> Blackstar API with auth forward. | Blackstar API running | P1 | NOT STARTED | Yes | 2 |
| Tile proxy routes | Proxy `/api/tiles/{z}/{x}/{y}` -> Martin with cache headers. | Martin running | P1 | NOT STARTED | Yes | 1 |
| Spatial feed endpoint | Aggregated GeoJSON endpoint `/api/feed/spatial`. | Medusa + PostGIS | P0 | NOT STARTED | Yes | 6 |
| AI proxy routes | `/api/ai/generate-listing`, `/api/ai/chat`, per-user rate limiting. | Ollama running | P1 | NOT STARTED | Yes | 4 |
| JWT auth middleware | Validate Medusa JWT, inject identity downstream, refresh path. | Medusa auth | P0 | NOT STARTED | Yes | 3 |
| Rate limiting middleware | Configurable per-route/user thresholds + auth tiering. | Auth middleware | P0 | NOT STARTED | Yes | 2 |
| Service discovery via env vars | 503 on undefined optional services, no gateway crash. | All routes | P0 | NOT STARTED | No | 1 |
| Health/status endpoint | `/health` with per-upstream service status. | All routes | P0 | NOT STARTED | No | 1 |
| Railway deployment | `railway.toml`, Nixpacks, port 3000, `/health`. | Above complete | P0 | NOT STARTED | No | 0.5 |

### Martin Tile Server (`services/martin-tiles`)
| Task | Description | Dependencies | Priority | Status | AI Prompt | Est. Hours |
|---|---|---|---|---|---|---:|
| Create `martin.yaml` | Sources for vendors/zones/cycles/gardens/relay points. | PostGIS tables exist | P1 | NOT STARTED | Yes | 2 |
| Dockerfile for Martin | Official image + config + port exposure + DB URL. | Config ready | P1 | NOT STARTED | Yes | 1 |
| Add geography columns | Migrations + indexes for location polygons/points. | Medusa backend | P0 | NOT STARTED | Yes | 3 |
| Seed sample geographic data | Development fixture data for layers/cycles/zones. | Geography columns | P1 | NOT STARTED | Yes | 2 |
| Railway deployment | Docker deploy + port 3000 + health + shared DB URL. | Above complete | P1 | NOT STARTED | No | 0.5 |

### Ollama AI Service (`services/ollama`)
| Task | Description | Dependencies | Priority | Status | AI Prompt | Est. Hours |
|---|---|---|---|---|---|---:|
| Create Dockerfile | Base `ollama/ollama`, startup script, expose 11434. | None | P1 | NOT STARTED | Yes | 1 |
| Create `startup.sh` | Model pull-on-first-boot then start `ollama serve`. | Dockerfile | P1 | NOT STARTED | No | 0.5 |
| Railway deployment | Docker deploy + `/api/tags` health + capacity guidance. | Dockerfile | P1 | NOT STARTED | No | 0.5 |
| RAG pipeline for support | Docs indexing + pgvector + Hono query integration. | Ollama + PostGIS | P2 | NOT STARTED | Yes | 6 |
| Product listing generation | LLaVA image-to-structured JSON extraction pipeline. | Ollama running | P1 | NOT STARTED | Yes | 3 |

## AI Prompt Templates (for rows marked "Yes")

### Prompt: Implementation task template
```text
Implement task: {TASK_NAME}

Context:
- Repo: Coalition monorepo
- Workstream: {WORKSTREAM}
- Dependencies satisfied: {DEPENDENCIES}
- Priority: {PRIORITY}

Requirements:
1) Keep change set focused to this task only.
2) Add or update tests where behavior changes.
3) Include rollout/rollback notes for feature-flagged surfaces.
4) Provide exact validation commands and outcomes.

Output:
- Files changed
- Acceptance criteria checklist
- Test evidence
- Risks + rollback
```

### Prompt: API endpoint task template
```text
Implement endpoint task: {ENDPOINT_TASK}

Requirements:
1) Define request/response schema with TypeScript types.
2) Include auth, rate-limiting, and error handling behavior.
3) Add happy-path + failure-path tests.
4) Document env vars and local run instructions.

Output:
- Route contract
- Implementation notes
- Tests run
- Deployment checklist
```

### Prompt: UX map/bottom-sheet task template
```text
Implement map UX task: {MAP_TASK}

Requirements:
1) Keep map as root context where applicable.
2) Place detail flows in bottom sheets.
3) Add accessibility labels and analytics events.
4) Include visual verification steps.

Output:
- Changed components
- Interaction states
- Validation steps
- Known limitations
```

## Suggested First Sprint Slice (P0 only)
1. Fork app scaffold (`apps/bmc-app`) and branding cleanup.
2. Hono gateway scaffold + health endpoint + env-var discovery behavior.
3. MapLibre migration baseline + connect Martin tiles.
4. Spatial feed endpoint (minimal vendors layer first).
5. Bottom-sheet navigation baseline for vendor details.
