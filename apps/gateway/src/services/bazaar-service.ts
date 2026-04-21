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

export interface DigitalProductDetail extends DigitalProductRecord {
    metadata: Record<string, unknown>;
    asset_ref?: string;
    matrix_pack_id?: string;
    matrix_shortcodes?: Record<string, string>;
    matrix_display_name?: string;
    manifest?: Record<string, unknown>;
    moderation_state: 'approved' | 'pending' | 'quarantined';
}

const asModerationState = (value: unknown): 'approved' | 'pending' | 'quarantined' => {
    if (value === 'pending' || value === 'quarantined') return value;
    return 'approved';
};

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
            .filter((product) => asModerationState((product.metadata ?? {}).moderation_state) !== 'quarantined')
            .map(toRecord)
            .filter((record) => (query.kind ? record.digital_kind === query.kind : true))
            .filter((record) => (query.license ? record.license === query.license : true));
    }

    async getDigitalProduct(productId: string): Promise<DigitalProductDetail | null> {
        const params = new URLSearchParams({ fields: '+metadata,+variants.calculated_price,+seller.handle' });
        const res = await this.medusa.client.fetch<{ product?: MedusaProductWithMetadata }>(
            `/store/products/${encodeURIComponent(productId)}?${params.toString()}`
        );
        const product = res?.product;
        if (!product || !isDigital(product.metadata ?? null)) {
            return null;
        }

        const metadata = (product.metadata ?? {}) as Record<string, unknown>;
        const delivery = (metadata.delivery ?? {}) as Record<string, unknown>;
        const emojiPack = (metadata.emoji_pack ?? {}) as Record<string, unknown>;

        return {
            ...toRecord(product),
            metadata,
            asset_ref: typeof delivery.asset_ref === 'string' ? (delivery.asset_ref as string) : undefined,
            matrix_pack_id: typeof emojiPack.pack_id === 'string' ? (emojiPack.pack_id as string) : undefined,
            matrix_shortcodes:
                emojiPack.shortcodes && typeof emojiPack.shortcodes === 'object'
                    ? (emojiPack.shortcodes as Record<string, string>)
                    : undefined,
            matrix_display_name: typeof emojiPack.display_name === 'string' ? (emojiPack.display_name as string) : undefined,
            manifest: metadata.manifest && typeof metadata.manifest === 'object' ? (metadata.manifest as Record<string, unknown>) : undefined,
            moderation_state: asModerationState(metadata.moderation_state),
        };
    }
}
