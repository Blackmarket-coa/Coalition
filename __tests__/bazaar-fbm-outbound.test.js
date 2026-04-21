import { FbmOutboundClient, buildCorrelationId } from '../apps/gateway/src/services/fbm-outbound-client';

const baseProduct = {
    id: 'prod_1',
    title: 'Demo',
    description: null,
    handle: null,
    thumbnail: null,
    seller_id: null,
    seller_handle: null,
    price_cents: 500,
    currency_code: 'USD',
    digital_kind: 'plugin',
    delivery_type: 'manifest',
    license: 'standard',
    rating: null,
};

const mockResponse = (status, body = '') => new Response(body, { status });

describe('FbmOutboundClient', () => {
    test('succeeds on 2xx without retry', async () => {
        const calls = [];
        const fetchImpl = async (url, init) => {
            calls.push({ url, init });
            return mockResponse(200, JSON.stringify({ ok: true }));
        };
        const client = new FbmOutboundClient(
            { apiUrl: 'https://fbm.test/', apiToken: 't', retryBaseMs: 1, maxAttempts: 4 },
            fetchImpl
        );
        const result = await client.syncCatalog({
            correlation_id: buildCorrelationId('prod_1', 12345),
            action: 'upsert',
            product: baseProduct,
        });
        expect(result.ok).toBe(true);
        expect(result.attempts).toBe(1);
        expect(calls).toHaveLength(1);
        expect(calls[0].url).toBe('https://fbm.test/catalog/digital-products');
        expect(client.pendingSize()).toBe(0);
    });

    test('retries on 5xx and eventually queues on failure', async () => {
        let count = 0;
        const fetchImpl = async () => {
            count += 1;
            return mockResponse(503);
        };
        const client = new FbmOutboundClient(
            { apiUrl: 'https://fbm.test', apiToken: 't', retryBaseMs: 1, maxAttempts: 3 },
            fetchImpl
        );
        const result = await client.syncCatalog({
            correlation_id: 'c1',
            action: 'upsert',
            product: baseProduct,
        });
        expect(result.ok).toBe(false);
        expect(result.attempts).toBe(3);
        expect(count).toBe(3);
        expect(client.pendingSize()).toBe(1);
    });

    test('does not retry on 4xx (except 408/429)', async () => {
        let count = 0;
        const fetchImpl = async () => {
            count += 1;
            return mockResponse(400, 'bad request');
        };
        const client = new FbmOutboundClient(
            { apiUrl: 'https://fbm.test', apiToken: 't', retryBaseMs: 1, maxAttempts: 4 },
            fetchImpl
        );
        const result = await client.syncCatalog({ correlation_id: 'c2', action: 'upsert', product: baseProduct });
        expect(result.ok).toBe(false);
        expect(count).toBe(1);
    });

    test('drainQueue flushes pending payloads', async () => {
        let responses = [mockResponse(503), mockResponse(503), mockResponse(200)];
        const fetchImpl = async () => responses.shift() ?? mockResponse(200);
        const client = new FbmOutboundClient(
            { apiUrl: 'https://fbm.test', apiToken: 't', retryBaseMs: 1, maxAttempts: 2 },
            fetchImpl
        );
        await client.syncCatalog({ correlation_id: 'c3', action: 'upsert', product: baseProduct });
        expect(client.pendingSize()).toBe(1);
        const results = await client.drainQueue();
        expect(results).toHaveLength(1);
        expect(results[0].ok).toBe(true);
        expect(client.pendingSize()).toBe(0);
    });
});

describe('buildCorrelationId', () => {
    test('returns coalition.<productId>.<ts>', () => {
        expect(buildCorrelationId('prod_9', 42)).toBe('coalition.prod_9.42');
    });
});
