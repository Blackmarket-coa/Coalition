import Medusa from '@medusajs/js-sdk';
import type { EntityType, MedusaGarden, MedusaKitchen, MedusaProducer, MedusaProduct, MedusaSeller } from '../lib/types';

interface MedusaClientLike {
    client: {
        fetch<T = unknown>(path: string, init?: RequestInit): Promise<T>;
    };
}

export interface SpatialEntityRecord {
    entityType: EntityType;
    id: string;
    name: string;
    status: string;
    imageUrl: string | null;
    tagline: string | null;
    rating: number | null;
    icon: string;
    layer: 'market' | 'aid' | 'jobs' | 'govern';
}

const toArray = <T>(value: unknown): T[] => {
    if (Array.isArray(value)) {
        return value as T[];
    }

    if (value && typeof value === 'object') {
        const candidates = ['items', 'sellers', 'products', 'gardens', 'kitchens', 'producers', 'data'] as const;
        for (const key of candidates) {
            const maybe = (value as Record<string, unknown>)[key];
            if (Array.isArray(maybe)) {
                return maybe as T[];
            }
        }
    }

    return [];
};

export class MedusaSpatialService {
    private readonly medusa: MedusaClientLike;

    constructor(baseUrl: string, publishableKey?: string) {
        this.medusa = new Medusa({
            baseUrl,
            publishableKey,
            debug: false,
        }) as unknown as MedusaClientLike;
    }

    private listSellers = async (limit: number, offset: number): Promise<MedusaSeller[]> => {
        const query = new URLSearchParams({ limit: String(limit), offset: String(offset) });
        const res = await this.medusa.client.fetch<unknown>(`/admin/sellers?${query.toString()}`);
        return toArray<MedusaSeller>(res);
    };

    private listProducts = async (limit: number, offset: number): Promise<MedusaProduct[]> => {
        const query = new URLSearchParams({ limit: String(limit), offset: String(offset), fields: '+variants,+variants.inventory_quantity,+variants.calculated_price' });
        const res = await this.medusa.client.fetch<unknown>(`/store/products?${query.toString()}`);
        return toArray<MedusaProduct>(res);
    };

    private listGardens = async (limit: number, offset: number): Promise<MedusaGarden[]> => {
        const query = new URLSearchParams({ limit: String(limit), offset: String(offset) });
        const res = await this.medusa.client.fetch<unknown>(`/admin/gardens?${query.toString()}`);
        return toArray<MedusaGarden>(res);
    };

    private listKitchens = async (limit: number, offset: number): Promise<MedusaKitchen[]> => {
        const query = new URLSearchParams({ limit: String(limit), offset: String(offset) });
        const res = await this.medusa.client.fetch<unknown>(`/admin/kitchens?${query.toString()}`);
        return toArray<MedusaKitchen>(res);
    };

    private listProducers = async (limit: number, offset: number): Promise<MedusaProducer[]> => {
        const query = new URLSearchParams({ limit: String(limit), offset: String(offset) });
        const res = await this.medusa.client.fetch<unknown>(`/admin/producers?${query.toString()}`);
        return toArray<MedusaProducer>(res);
    };

    public async getEntities(limit: number, offset: number): Promise<SpatialEntityRecord[]> {
        const [sellers, products, gardens, kitchens, producers] = await Promise.all([
            this.listSellers(limit, offset),
            this.listProducts(limit, offset),
            this.listGardens(limit, offset),
            this.listKitchens(limit, offset),
            this.listProducers(limit, offset),
        ]);

        return [
            ...sellers.map((seller) => ({
                entityType: 'seller' as const,
                id: seller.id,
                name: seller.store_name ?? seller.handle ?? seller.id,
                status: seller.status ?? 'active',
                imageUrl: seller.image_url ?? null,
                tagline: seller.description ?? null,
                rating: seller.rating ?? null,
                icon: 'market-seller',
                layer: 'market' as const,
            })),
            ...products.map((product) => ({
                entityType: 'product' as const,
                id: product.id,
                name: product.title ?? product.handle ?? product.id,
                status: product.status ?? 'published',
                imageUrl: product.thumbnail ?? null,
                tagline: product.description ?? null,
                rating: product.rating ?? null,
                icon: 'market-product',
                layer: 'market' as const,
            })),
            ...gardens.map((garden) => ({
                entityType: 'garden' as const,
                id: garden.id,
                name: garden.name ?? garden.id,
                status: garden.status ?? 'active',
                imageUrl: garden.image_url ?? null,
                tagline: garden.description ?? null,
                rating: garden.rating ?? null,
                icon: 'aid-garden',
                layer: 'aid' as const,
            })),
            ...kitchens.map((kitchen) => ({
                entityType: 'kitchen' as const,
                id: kitchen.id,
                name: kitchen.name ?? kitchen.id,
                status: kitchen.status ?? 'active',
                imageUrl: kitchen.image_url ?? null,
                tagline: kitchen.description ?? null,
                rating: kitchen.rating ?? null,
                icon: 'market-kitchen',
                layer: 'market' as const,
            })),
            ...producers.map((producer) => ({
                entityType: 'producer' as const,
                id: producer.id,
                name: producer.name ?? producer.id,
                status: producer.status ?? 'active',
                imageUrl: producer.image_url ?? null,
                tagline: producer.description ?? null,
                rating: producer.rating ?? null,
                icon: 'market-producer',
                layer: 'market' as const,
            })),
        ];
    }
}
