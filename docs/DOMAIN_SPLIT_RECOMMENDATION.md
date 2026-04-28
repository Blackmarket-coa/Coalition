# Coalition split recommendation: `freeblackmarket.com` vs `chat.theblackout.app`

## Decision summary

Use **`freeblackmarket.com`** for all commerce and catalog surfaces (Bazaar catalog, checkout, entitlement delivery, FBM sync, and order webhook ingestion), and use **`chat.theblackout.app`** for Matrix-native messaging, room participation, and governance collaboration.

## What goes to `freeblackmarket.com`

### Backend routes/services
- `apps/gateway/src/routes/bazaar-catalog.ts` (`/api/v1/bazaar/catalog`)
- `apps/gateway/src/routes/checkout.ts` (`/api/v1/bazaar/checkout/*`)
- `apps/gateway/src/routes/stripe-webhook.ts` (`/api/v1/bazaar/stripe-webhook`)
- `apps/gateway/src/routes/bazaar-delivery.ts` (`/api/v1/bazaar/entitlements/:id/download`)
- `apps/gateway/src/routes/fbm-sync.ts` (`/api/v1/bazaar/fbm-sync` + drain)
- `apps/gateway/src/routes/free-black-market-webhook.ts` (`/api/v1/webhooks/free-black-market/order-placed`)
- `apps/gateway/src/services/fbm-outbound-client.ts` (pushes catalog updates to FBM API)

### Domain ownership
- Product/catalog publication and moderation
- Payments and payouts (Stripe)
- Entitlements and digital item fulfillment
- FBM <-> gateway order/catalog integration
- Medusa-backed commerce modules (`medusa-modules/*`)

## What goes to `chat.theblackout.app`

### Backend routes/services
- `apps/gateway/src/routes/feed.ts` (social feed)
- `apps/gateway/src/routes/spatial-governance.ts` (Matrix governance projection)
- `apps/gateway/src/routes/provider-profile.ts` (creates Matrix rooms during onboarding)

### Client runtime and shared packages
- Matrix client/session + room lifecycle in `packages/core/src/contexts/MatrixContext.tsx`
- Governance state/events in `packages/core/src/contexts/GovernanceContext.tsx`
- Chat UX/state in `src/screens/Chat*`, `src/components/Chat*`, and `packages/core/src/contexts/ChatContext.tsx`

### Domain ownership
- Identity + Matrix session
- Room messaging and room membership
- Community/governance proposals, votes, delegation
- Social graph and feed conversations

## Boundary contract (recommended)

1. **Action routing should stay explicit**:
   - Commerce actions (`SHOP_ITEM`, `POST_OFFERING`, `BROWSE_BAZAAR`) map to Free Black Market/Bazaar flows.
   - Room actions (`JOIN_ROOM`) map to Blackout Matrix room flows.
2. **Keep checkout and catalog APIs domain-local** at `freeblackmarket.com`.
3. **Keep Matrix APIs and homeserver creds domain-local** at `chat.theblackout.app`.
4. **Use tokenized links for cross-domain jumps** (e.g., from item detail -> chat room) rather than sharing browser session state directly.
5. **Treat gateway as two deployables** (or two route groups behind one edge proxy) to enforce ownership and independent scaling.

## Practical migration order

1. Move Bazaar + webhook + FBM sync routes first to `freeblackmarket.com`.
2. Move Matrix/governance/feed APIs to `chat.theblackout.app`.
3. Split client env vars by domain (FBM vs BLACKOUT/MATRIX keys).
4. Replace any mixed-domain hardcoded URLs with a domain-aware config layer.
5. Add cross-domain integration tests for:
   - purchase -> entitlement
   - room join from action router
   - provider onboarding -> room creation
