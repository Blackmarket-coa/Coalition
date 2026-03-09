import { SpatialVisibility } from './spatial-feed';

export interface MedusaLocationInput {
    latitude: number;
    longitude: number;
    approximate?: boolean;
}

export interface MedusaVisibilityControls {
    visibility: SpatialVisibility;
    discoverable: boolean;
}

export interface MedusaSpatialMetadata {
    location: MedusaLocationInput;
    visibility: MedusaVisibilityControls;
}

export const buildMedusaSpatialMetadata = (location: MedusaLocationInput, visibility: MedusaVisibilityControls): MedusaSpatialMetadata => ({
    location,
    visibility,
});

export const mergeMedusaSpatialMetadata = <T extends Record<string, unknown>>(payload: T, location: MedusaLocationInput, visibility: MedusaVisibilityControls) => ({
    ...payload,
    metadata: {
        ...(typeof payload.metadata === 'object' && payload.metadata ? (payload.metadata as Record<string, unknown>) : {}),
        spatial: buildMedusaSpatialMetadata(location, visibility),
    },
});
