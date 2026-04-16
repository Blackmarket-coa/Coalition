export type SpatialEventStatus = 'upcoming' | 'live' | 'past';

export interface SpatialEventTimeline {
    startsAt: string;
    endsAt?: string;
}

const parseIsoToEpochMs = (value: string | undefined): number | null => {
    if (!value) {
        return null;
    }

    const epochMs = Date.parse(value);
    return Number.isNaN(epochMs) ? null : epochMs;
};

export const deriveSpatialEventStatus = (
    timeline: SpatialEventTimeline,
    nowEpochMs: number = Date.now()
): SpatialEventStatus => {
    const startsAtEpochMs = parseIsoToEpochMs(timeline.startsAt);
    const endsAtEpochMs = parseIsoToEpochMs(timeline.endsAt);

    if (startsAtEpochMs === null) {
        return 'upcoming';
    }

    if (nowEpochMs < startsAtEpochMs) {
        return 'upcoming';
    }

    if (endsAtEpochMs !== null && nowEpochMs >= endsAtEpochMs) {
        return 'past';
    }

    return 'live';
};
