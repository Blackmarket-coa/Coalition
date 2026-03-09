export type ClaimPolicy = 'first_claim' | 'bid';

export interface BlackstarLocationPoint {
    latitude: number;
    longitude: number;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
}

export interface ShipmentBoardListing {
    id: string;
    source_order_ref: string;
    origin: BlackstarLocationPoint;
    destination: BlackstarLocationPoint;
    claim_policy: ClaimPolicy;
    required_category: string | null;
    required_transport_capabilities: string[];
    status: string;
    correlation_id?: string | null;
    engagement_score?: number | null;
    created_at?: string;
    updated_at?: string;
}

export interface ShipmentBoardListingCreateInput {
    source_order_ref: string;
    origin: BlackstarLocationPoint;
    destination: BlackstarLocationPoint;
    claim_policy: ClaimPolicy;
    required_category?: string | null;
    required_transport_capabilities?: string[];
    status?: string;
    correlation_id?: string;
}

export interface ShipmentBoardClaimInput {
    note?: string;
    price_quote?: number;
}

export interface ShipmentBoardBidInput {
    amount: number;
    note?: string;
}

export interface BlackstarNode {
    id: string;
    name: string;
    trust_score: number | null;
    capabilities: string[];
}

export interface BlackstarDriver {
    id: string;
    name: string;
    status?: string | null;
}

export interface BlackstarFleet {
    id: string;
    name: string;
    status?: string | null;
}

export interface GeoJsonPointFeature {
    type: 'Feature';
    geometry: {
        type: 'Point';
        coordinates: [number, number];
    };
    properties: {
        listing_id: string;
        source_order_ref: string;
        claim_policy: ClaimPolicy;
        required_category: string | null;
        required_transport_capabilities: string[];
        status: string;
        point_role: 'origin' | 'destination';
    };
}

export interface GeoJsonFeatureCollection {
    type: 'FeatureCollection';
    features: GeoJsonPointFeature[];
}

export interface FreeBlackMarketOrderPayload {
    order_id?: string;
    source_order_ref?: string;
    pickup?: Partial<BlackstarLocationPoint>;
    dropoff?: Partial<BlackstarLocationPoint>;
    origin?: Partial<BlackstarLocationPoint>;
    destination?: Partial<BlackstarLocationPoint>;
    required_category?: string;
    required_transport_capabilities?: string[];
    claim_policy?: ClaimPolicy;
    created_at?: string;
}

export class BlackstarApiError extends Error {
    constructor(
        message: string,
        public readonly status: number,
        public readonly details?: unknown
    ) {
        super(message);
        this.name = 'BlackstarApiError';
    }
}

export const buildFreeBlackMarketCorrelationId = (sourceOrderRef: string, createdAt?: string): string => {
    // Mirrors the FreeBlackMarketWebhookController correlation id convention: fbm.{orderRef}.{timestamp}
    const stamp = (createdAt ? new Date(createdAt) : new Date()).toISOString().replace(/[-:.TZ]/g, '');
    return `fbm.${sourceOrderRef}.${stamp}`;
};

export class BlackstarApiClient {
    constructor(
        private readonly baseUrl: string,
        private readonly bearerToken: string
    ) {
        if (!baseUrl) throw new Error('BLACKSTAR_API_URL is required');
        if (!bearerToken) throw new Error('BLACKSTAR_API_TOKEN is required');
    }

    private async request<T>(path: string, init?: RequestInit): Promise<T> {
        const response = await fetch(`${this.baseUrl.replace(/\/$/, '')}${path}`, {
            ...init,
            headers: {
                Authorization: `Bearer ${this.bearerToken}`,
                'Content-Type': 'application/json',
                ...(init?.headers ?? {}),
            },
        });

        const payload = (await response.json().catch(() => null)) as unknown;

        if (!response.ok) {
            throw new BlackstarApiError(`Blackstar API request failed: ${response.status}`, response.status, payload);
        }

        return payload as T;
    }

    async listShipmentBoardListings(): Promise<ShipmentBoardListing[]> {
        const data = await this.request<{ data?: ShipmentBoardListing[]; listings?: ShipmentBoardListing[] }>('/api/v1/shipment-board-listings');
        return data.data ?? data.listings ?? [];
    }

    async listEligibleShipmentBoardListings(): Promise<ShipmentBoardListing[]> {
        const data = await this.request<{ data?: ShipmentBoardListing[]; listings?: ShipmentBoardListing[] }>('/api/v1/shipment-board-listings/eligible');
        return data.data ?? data.listings ?? [];
    }

    async createShipmentBoardListing(input: ShipmentBoardListingCreateInput): Promise<ShipmentBoardListing> {
        const data = await this.request<{ data?: ShipmentBoardListing; listing?: ShipmentBoardListing }>('/api/v1/shipment-board-listings', {
            method: 'POST',
            body: JSON.stringify(input),
        });

        const listing = data.data ?? data.listing;
        if (!listing) {
            throw new BlackstarApiError('Blackstar API returned no listing payload', 500, data);
        }
        return listing;
    }

    async claimShipmentBoardListing(id: string, input: ShipmentBoardClaimInput = {}): Promise<unknown> {
        return this.request(`/api/v1/shipment-board-listings/${id}/claim`, {
            method: 'POST',
            body: JSON.stringify(input),
        });
    }

    async bidShipmentBoardListing(id: string, input: ShipmentBoardBidInput): Promise<unknown> {
        return this.request(`/api/v1/shipment-board-listings/${id}/bid`, {
            method: 'POST',
            body: JSON.stringify(input),
        });
    }

    async listNodes(): Promise<BlackstarNode[]> {
        const data = await this.request<{ data?: BlackstarNode[]; nodes?: BlackstarNode[] }>('/api/v1/nodes');
        return data.data ?? data.nodes ?? [];
    }

    async listDrivers(): Promise<BlackstarDriver[]> {
        const data = await this.request<{ data?: BlackstarDriver[]; drivers?: BlackstarDriver[] }>('/api/v1/drivers');
        return data.data ?? data.drivers ?? [];
    }

    async listFleets(): Promise<BlackstarFleet[]> {
        const data = await this.request<{ data?: BlackstarFleet[]; fleets?: BlackstarFleet[] }>('/api/v1/fleets');
        return data.data ?? data.fleets ?? [];
    }

    toGeoJsonFeatures(listings: ShipmentBoardListing[]): GeoJsonFeatureCollection {
        const features: GeoJsonPointFeature[] = [];

        for (const listing of listings) {
            const base = {
                listing_id: listing.id,
                source_order_ref: listing.source_order_ref,
                claim_policy: listing.claim_policy,
                required_category: listing.required_category,
                required_transport_capabilities: listing.required_transport_capabilities,
                status: listing.status,
            } as const;

            features.push({
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [listing.origin.longitude, listing.origin.latitude],
                },
                properties: {
                    ...base,
                    point_role: 'origin',
                },
            });

            features.push({
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [listing.destination.longitude, listing.destination.latitude],
                },
                properties: {
                    ...base,
                    point_role: 'destination',
                },
            });
        }

        return {
            type: 'FeatureCollection',
            features,
        };
    }

    async createListingFromFreeBlackMarketWebhook(payload: FreeBlackMarketOrderPayload): Promise<ShipmentBoardListing> {
        const sourceOrderRef = payload.source_order_ref ?? payload.order_id;
        if (!sourceOrderRef) {
            throw new BlackstarApiError('FBM webhook missing source_order_ref/order_id', 400, payload);
        }

        const origin = payload.origin ?? payload.pickup;
        const destination = payload.destination ?? payload.dropoff;

        if (origin?.latitude == null || origin?.longitude == null || destination?.latitude == null || destination?.longitude == null) {
            throw new BlackstarApiError('FBM webhook missing origin/destination coordinates', 400, payload);
        }

        return this.createShipmentBoardListing({
            source_order_ref: sourceOrderRef,
            origin: {
                latitude: origin.latitude,
                longitude: origin.longitude,
                address: origin.address ?? null,
                city: origin.city ?? null,
                state: origin.state ?? null,
                country: origin.country ?? null,
            },
            destination: {
                latitude: destination.latitude,
                longitude: destination.longitude,
                address: destination.address ?? null,
                city: destination.city ?? null,
                state: destination.state ?? null,
                country: destination.country ?? null,
            },
            claim_policy: payload.claim_policy ?? 'first_claim',
            required_category: payload.required_category ?? null,
            required_transport_capabilities: payload.required_transport_capabilities ?? [],
            status: 'open',
            correlation_id: buildFreeBlackMarketCorrelationId(sourceOrderRef, payload.created_at),
        });
    }
}
