import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { createSpatialFeedRouter } from './routes/spatial-feed';
import { createFreeBlackMarketWebhookRouter } from './routes/free-black-market-webhook';

const app = new Hono();

app.get('/health', (c) => c.json({ ok: true, service: 'gateway' }));
app.route('/', createSpatialFeedRouter());
app.route('/', createFreeBlackMarketWebhookRouter());

serve({
    fetch: app.fetch,
    port: Number(process.env.PORT ?? 8787),
});
