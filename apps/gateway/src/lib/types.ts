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
    status?: string | null;
    image_url?: string | null;
    rating?: number | null;
}

export interface MedusaProduct {
    id: string;
    title?: string | null;
    handle?: string | null;
    description?: string | null;
    status?: string | null;
    thumbnail?: string | null;
    inventory_quantity?: number | null;
    price?: number | null;
    rating?: number | null;
}

export interface MedusaGarden {
    id: string;
    name?: string | null;
    description?: string | null;
    status?: string | null;
    image_url?: string | null;
    rating?: number | null;
}

export interface MedusaKitchen {
    id: string;
    name?: string | null;
    description?: string | null;
    status?: string | null;
    image_url?: string | null;
    rating?: number | null;
}

export interface MedusaProducer {
    id: string;
    name?: string | null;
    description?: string | null;
    status?: string | null;
    image_url?: string | null;
    rating?: number | null;
}
