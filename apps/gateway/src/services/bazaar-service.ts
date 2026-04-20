import Medusa from '@medusajs/js-sdk';
import type { DigitalDeliveryType, DigitalKind, DigitalLicense, DigitalProductRecord, MedusaProduct, MedusaProductListResponse } from '../lib/types';

interface MedusaClientLike {
    client: {
        fetch<T = unknown>(path: string, init?: RequestInit): Promise<T>;
    };
}

interface MedusaProductWithMetadata extends MedusaProduct {
    metadata?: Record<string, unknown> | null;
    seller?: { id?: string | null; handle?: string | null } | null;
}

const digitalKindSet: ReadonlySet<DigitalKind> = new Set(['plugin', 'emoji_pack', 'meme_pack', 'stego', 'software', 'other']);
const digitalDeliverySet: ReadonlySet<DigitalDeliveryType> = new Set(['file', 'unlock', 'manifest']);
const digitalLicenseSet: ReadonlySet<DigitalLicense> = new Set(['standard', 'extended', 'cc0']);

const asDigitalKind = (value: unknown): DigitalKind => (typeof value === 'string' && digitalKindSet.has(value as DigitalKind) ? (value as DigitalKind) : 'other');
const asDeliveryType = (value: unknown): DigitalDeliveryType => (typeof value === 'string' && digitalDeliverySet.has(value as DigitalDeliveryType) ? (value as DigitalDeliveryType) : 'file');
const asLicense = (value: unknown): DigitalLicense => (typeof value === 'string' && digitalLicenseSet.has(value as DigitalLicense) ? (value as DigitalLicense) : 'standard');

const toArray = <T>(value: unknown): T[] => {
    if (Array.isArray(value)) return value as T[];
    if (value && typeof value === 'object') {
        for (const key of ['items', 'products', 'data'] as const) {
            const maybe = (value as Record<string, unknown>)[key];
            if (Array.isArray(maybe)) return maybe as T[];
        }
    }
    return [];
};

const isDigital = (metadata: Record<string, unknown> | null | undefined): boolean => {
    if (!metadata) return false;
    const flag = metadata.is_digital;
    return flag === true || flag === 'true';
};

const toRecord = (product: MedusaProductWithMetadata): DigitalProductRecord => {
    const metadata = product.metadata ?? {};
    const firstPrice = product.variants?.find((variant) => variant.calculated_price?.calculated_amount != null)?.calculated_price;
    const delivery = (metadata.delivery ?? {}) as Record<string, unknown>;

    return {
        id: product.id,
        title: product.title ?? product.handle ?? product.id,
        description: product.description ?? null,
        handle: product.handle ?? null,
        thumbnail: product.thumbnail ?? null,
        seller_id: product.seller?.id ?? null,
        seller_handle: product.seller?.handle ?? null,
        price_cents: firstPrice?.calculated_amount ?? null,
        currency_code: firstPrice?.currency_code ?? null,
        digital_kind: asDigitalKind(metadata.digital_kind),
        delivery_type: asDeliveryType(delivery.type),
        license: asLicense(metadata.license),
        rating: product.rating ?? null,
    };
};

export interface BazaarQuery {
    limit: number;
    offset: number;
    kind?: DigitalKind;
    license?: DigitalLicense;
    q?: string;
}

export class BazaarService {
    private readonly medusa: MedusaClientLike;

    constructor(baseUrl: string, publishableKey?: string) {
        this.medusa = new Medusa({
            baseUrl,
            publishableKey,
            debug: false,
        }) as unknown as MedusaClientLike;
    }

    async listDigitalProducts(query: BazaarQuery): Promise<DigitalProductRecord[]> {
        const params = new URLSearchParams({
            limit: String(query.limit),
            offset: String(query.offset),
            fields: '+metadata,+variants.calculated_price,+seller.handle',
        });
        if (query.q) params.set('q', query.q);

        const res = await this.medusa.client.fetch<MedusaProductListResponse>(`/store/products?${params.toString()}`);
        const products = toArray<MedusaProductWithMetadata>(res);

        return products
            .filter((product) => isDigital(product.metadata ?? null))
            .map(toRecord)
            .filter((record) => (query.kind ? record.digital_kind === query.kind : true))
            .filter((record) => (query.license ? record.license === query.license : true));
    }
}
