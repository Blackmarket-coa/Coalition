export type SpatialLayer = 'market' | 'jobs' | 'govern' | 'aid';

export type EntityType = 'seller' | 'product' | 'garden' | 'kitchen' | 'producer';

export interface BBox {
    west: number;
    south: number;
    east: number;
    north: number;
}

export interface Preview {
    image_url: string | null;
    tagline: string | null;
    rating: number | null;
}

export interface SpatialFeatureProperties {
    layer: SpatialLayer;
    entity_type: EntityType;
    id: string;
    name: string;
    status: string;
    icon: string;
    preview: Preview;
}

export interface PointGeometry {
    type: 'Point';
    coordinates: [number, number];
}

export interface SpatialFeature {
    type: 'Feature';
    geometry: PointGeometry;
    properties: SpatialFeatureProperties;
}

export interface SpatialFeatureCollection {
    type: 'FeatureCollection';
    features: SpatialFeature[];
}

export interface QueryParams {
    bbox: BBox;
    layers: SpatialLayer[];
    limit: number;
    offset: number;
}

export interface SellerLocationRow {
    entity_type: EntityType;
    entity_id: string;
    longitude: number;
    latitude: number;
}

export interface MedusaSeller {
    id: string;
    store_name?: string | null;
    handle?: string | null;
    description?: string | null;
    location?: {
        latitude?: number | null;
        longitude?: number | null;
    } | null;
    status?: string | null;
    image_url?: string | null;
    rating?: number | null;
}

export interface MedusaProduct {
    id: string;
    title?: string | null;
    handle?: string | null;
    description?: string | null;
    location?: {
        latitude?: number | null;
        longitude?: number | null;
    } | null;
    status?: string | null;
    thumbnail?: string | null;
    variants?: MedusaProductVariant[];
    rating?: number | null;
}

export interface MedusaProductVariant {
    id: string;
    title?: string | null;
    inventory_quantity?: number | null;
    calculated_price?: {
        calculated_amount?: number | null;
        original_amount?: number | null;
        currency_code?: string | null;
    } | null;
}

export interface MedusaGarden {
    id: string;
    name?: string | null;
    description?: string | null;
    location?: {
        latitude?: number | null;
        longitude?: number | null;
    } | null;
    status?: string | null;
    image_url?: string | null;
    rating?: number | null;
}

export interface MedusaKitchen {
    id: string;
    name?: string | null;
    description?: string | null;
    location?: {
        latitude?: number | null;
        longitude?: number | null;
    } | null;
    status?: string | null;
    image_url?: string | null;
    rating?: number | null;
}

export interface MedusaProducer {
    id: string;
    name?: string | null;
    description?: string | null;
    location?: {
        latitude?: number | null;
        longitude?: number | null;
    } | null;
    status?: string | null;
    image_url?: string | null;
    rating?: number | null;
}

export interface MedusaListResponse<T> {
    items?: T[];
    data?: T[];
}

export interface MedusaSellerListResponse extends MedusaListResponse<MedusaSeller> {
    sellers?: MedusaSeller[];
}

export interface MedusaProductListResponse extends MedusaListResponse<MedusaProduct> {
    products?: MedusaProduct[];
}

export interface MedusaGardenListResponse extends MedusaListResponse<MedusaGarden> {
    gardens?: MedusaGarden[];
}

export interface MedusaKitchenListResponse extends MedusaListResponse<MedusaKitchen> {
    kitchens?: MedusaKitchen[];
}

export interface MedusaProducerListResponse extends MedusaListResponse<MedusaProducer> {
    producers?: MedusaProducer[];
}
