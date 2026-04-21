import { config } from '../utils';

export type BazaarDigitalKind = 'plugin' | 'emoji_pack' | 'meme_pack' | 'stego' | 'software' | 'other';
export type BazaarDeliveryType = 'file' | 'unlock' | 'manifest';
export type BazaarLicense = 'standard' | 'extended' | 'cc0';

export interface BazaarListing {
    id: string;
    title: string;
    description: string | null;
    handle: string | null;
    thumbnail: string | null;
    seller_id: string | null;
    seller_handle: string | null;
    price_cents: number | null;
    currency_code: string | null;
    digital_kind: BazaarDigitalKind;
    delivery_type: BazaarDeliveryType;
    license: BazaarLicense;
    rating: number | null;
}

export interface BazaarCatalogQuery {
    limit?: number;
    offset?: number;
    kind?: BazaarDigitalKind;
    license?: BazaarLicense;
    q?: string;
}

const SAMPLE_LISTINGS: BazaarListing[] = [
    {
        id: 'sample-plugin-1',
        title: 'Ledger Insights Plugin',
        description: 'Visualize mutual aid ledger activity inside Coalition.',
        handle: 'ledger-insights',
        thumbnail: null,
        seller_id: null,
        seller_handle: 'demo-maker',
        price_cents: 500,
        currency_code: 'USD',
        digital_kind: 'plugin',
        delivery_type: 'manifest',
        license: 'standard',
        rating: 4.8,
    },
    {
        id: 'sample-emoji-1',
        title: 'Solidarity Emoji Pack',
        description: 'Custom emoji for organizing rooms.',
        handle: 'solidarity-pack',
        thumbnail: null,
        seller_id: null,
        seller_handle: 'mx-artist',
        price_cents: 0,
        currency_code: 'USD',
        digital_kind: 'emoji_pack',
        delivery_type: 'unlock',
        license: 'cc0',
        rating: 4.5,
    },
];

const gatewayBase = () => ({
    host: config('BLACKSTAR_GATEWAY_HOST', '').replace(/\/$/, ''),
    apiKey: config('BLACKSTAR_GATEWAY_KEY', ''),
});

export const fetchBazaarCatalog = async (query: BazaarCatalogQuery = {}): Promise<BazaarListing[]> => {
    const { host, apiKey } = gatewayBase();
    if (!host) return SAMPLE_LISTINGS;

    const params = new URLSearchParams();
    if (query.limit) params.set('limit', String(query.limit));
    if (query.offset) params.set('offset', String(query.offset));
    if (query.kind) params.set('kind', query.kind);
    if (query.license) params.set('license', query.license);
    if (query.q) params.set('q', query.q);

    try {
        const res = await fetch(`${host}/api/v1/bazaar/catalog?${params.toString()}`, {
            headers: {
                Accept: 'application/json',
                ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
            },
        });
        if (!res.ok) throw new Error(`Gateway returned ${res.status}`);
        const body = (await res.json()) as { items?: BazaarListing[] };
        return body.items ?? [];
    } catch (error) {
        console.warn('[bazaar] catalog fetch failed, using sample listings', error);
        return SAMPLE_LISTINGS;
    }
};

export const reportBazaarListing = async (params: {
    product_id: string;
    user_id: string;
    reason: 'spam' | 'malware' | 'illegal' | 'stolen' | 'other';
    detail?: string;
}): Promise<{ ok: boolean }> => {
    const { host, apiKey } = gatewayBase();
    if (!host) return { ok: true };

    try {
        const res = await fetch(`${host}/api/v1/bazaar/reports`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
            },
            body: JSON.stringify(params),
        });
        return { ok: res.ok };
    } catch (error) {
        console.warn('[bazaar] report failed', error);
        return { ok: false };
    }
};
