import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { createSpatialFeedRouter } from './routes/spatial-feed';
import { createFreeBlackMarketWebhookRouter } from './routes/free-black-market-webhook';
import { createProviderProfileRouter } from './routes/provider-profile';
import { createSpatialGovernanceRouter } from './routes/spatial-governance';
import { createFeedRouter } from './routes/feed';
import { createBazaarCatalogRouter } from './routes/bazaar-catalog';
import { createCheckoutRouter } from './routes/checkout';
import { createStripeWebhookRouter } from './routes/stripe-webhook';
import { createBazaarDeliveryRouter } from './routes/bazaar-delivery';
import { createFbmSyncRouter } from './routes/fbm-sync';
import { createBazaarModerationRouter } from './routes/bazaar-moderation';

const app = new Hono();

app.get('/health', (c) => c.json({ ok: true, service: 'gateway' }));
app.route('/', createSpatialFeedRouter());
app.route('/', createFreeBlackMarketWebhookRouter());
app.route('/', createProviderProfileRouter());
app.route('/', createSpatialGovernanceRouter());
app.route('/', createFeedRouter());
app.route('/', createBazaarCatalogRouter());
app.route('/', createCheckoutRouter());
app.route('/', createStripeWebhookRouter());
app.route('/', createBazaarDeliveryRouter());
app.route('/', createFbmSyncRouter());
app.route('/', createBazaarModerationRouter());

serve({
    fetch: app.fetch,
    port: Number(process.env.PORT ?? 8787),
});
