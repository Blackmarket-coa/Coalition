import type { DigitalProductRecord } from '../lib/types';

export interface FbmOutboundConfig {
    apiUrl: string;
    apiToken: string;
    maxAttempts?: number;
    retryBaseMs?: number;
}

export interface FbmCatalogPayload {
    correlation_id: string;
    action: 'upsert' | 'delete';
    product: DigitalProductRecord & { asset_ref?: string };
}

export interface FbmOutboundResult {
    ok: boolean;
    correlation_id: string;
    attempts: number;
    status?: number;
    error?: string;
}

const DEFAULT_MAX_ATTEMPTS = 4;
const DEFAULT_RETRY_BASE_MS = 250;

export const loadFbmOutboundConfig = (): FbmOutboundConfig => {
    const apiUrl = process.env.FBM_API_URL;
    const apiToken = process.env.FBM_API_TOKEN;
    if (!apiUrl || !apiToken) {
        throw new Error('FBM_API_URL and FBM_API_TOKEN are required for outbound catalog sync');
    }
    return { apiUrl: apiUrl.replace(/\/$/, ''), apiToken };
};

export const buildCorrelationId = (productId: string, timestamp = Date.now()): string =>
    `coalition.${productId}.${timestamp}`;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export class FbmOutboundClient {
    private readonly config: FbmOutboundConfig;
    private readonly queue: FbmCatalogPayload[] = [];
    private readonly fetchImpl: typeof fetch;

    constructor(config: FbmOutboundConfig = loadFbmOutboundConfig(), fetchImpl: typeof fetch = fetch) {
        this.config = {
            maxAttempts: DEFAULT_MAX_ATTEMPTS,
            retryBaseMs: DEFAULT_RETRY_BASE_MS,
            ...config,
        };
        this.fetchImpl = fetchImpl;
    }

    async syncCatalog(payload: FbmCatalogPayload): Promise<FbmOutboundResult> {
        const maxAttempts = this.config.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
        const retryBase = this.config.retryBaseMs ?? DEFAULT_RETRY_BASE_MS;
        let lastError: string | undefined;
        let lastStatus: number | undefined;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const res = await this.fetchImpl(`${this.config.apiUrl}/catalog/digital-products`, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${this.config.apiToken}`,
                        'Content-Type': 'application/json',
                        'X-Correlation-Id': payload.correlation_id,
                    },
                    body: JSON.stringify(payload),
                });
                lastStatus = res.status;
                if (res.ok) {
                    return { ok: true, correlation_id: payload.correlation_id, attempts: attempt, status: res.status };
                }
                if (res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429) {
                    lastError = await res.text().catch(() => `${res.status}`);
                    break;
                }
                lastError = `HTTP ${res.status}`;
            } catch (error) {
                lastError = error instanceof Error ? error.message : 'network error';
            }

            if (attempt < maxAttempts) {
                await sleep(retryBase * 2 ** (attempt - 1));
            }
        }

        this.queue.push(payload);
        return {
            ok: false,
            correlation_id: payload.correlation_id,
            attempts: maxAttempts,
            status: lastStatus,
            error: lastError,
        };
    }

    async drainQueue(): Promise<FbmOutboundResult[]> {
        const pending = this.queue.splice(0, this.queue.length);
        const results: FbmOutboundResult[] = [];
        for (const payload of pending) {
            results.push(await this.syncCatalog(payload));
        }
        return results;
    }

    pendingSize(): number {
        return this.queue.length;
    }
}
