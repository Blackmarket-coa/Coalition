import { Hono } from 'hono';
import { z } from 'zod';
import type { FeedEscalationStage, FeedGeoScope, GatewayFeedEvent, GatewayFeedResponse } from '../lib/types';

const precisionValues = ['off', 'none', 'approximate', 'precise'] as const;

const toStringArray = (raw: string | undefined): string[] => {
    if (!raw) {
        return [];
    }

    return raw
        .split(',')
        .map((value) => decodeURIComponent(value).trim())
        .filter(Boolean);
};

const querySchema = z.object({
    interests: z.string().optional().default(''),
    consented_location_precision: z.enum(precisionValues).optional().default('none'),
    joined_rooms: z.string().optional().default(''),
    language: z.string().min(2).max(16).optional().default('en'),
    ranking_model: z.string().min(1).max(64).optional().default('coalition_social_v1'),
    importance_score: z.coerce.number().min(0).max(5).optional(),
    social_impact_score: z.coerce.number().min(0).max(5).optional(),
    impact_score: z.coerce.number().min(0).max(5).optional(),
    importance_signal: z.coerce.number().min(0).max(5).optional(),
    impact_signal: z.coerce.number().min(0).max(5).optional(),
    ranking_confidence: z.coerce.number().min(0).max(1).optional(),
    ratings_count: z.coerce.number().int().min(0).optional(),
    community_ratings_count: z.coerce.number().int().min(0).optional(),
    location_context: z.enum(['consented', 'non_location_fallback']).optional(),
    location_latitude: z.coerce.number().min(-90).max(90).optional(),
    location_longitude: z.coerce.number().min(-180).max(180).optional(),
    location_region_code: z.string().min(2).max(32).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional().default(12),
});

interface FeedEntry {
    id: string;
    kind: 'video' | 'event';
    language: string;
    room_id: string;
    tags: string[];
    content: {
        url: string;
        thumbnail_url: string;
        caption: string;
    };
    counts: {
        likes: number;
        comments: number;
        shares: number;
        views: number;
    };
    trust: {
        trust_score: number;
        report_count: number;
        report_rate: number;
    };
    ranking: {
        importance: number;
        social_impact: number;
        engagement: number;
        published_at: string;
    };
    rating_stats: {
        unique_raters: number;
        rating_velocity_6h: number;
        rating_velocity_24h: number;
    };
    community: {
        engaged_rooms_24h: number;
        cross_community_diversity: number;
    };
    moderation: {
        anomaly_score: number;
    };
}

const baseFeed: FeedEntry[] = [
    {
        id: 'vid_climate_001',
        kind: 'video',
        language: 'en',
        room_id: '!aid:coalition.local',
        tags: ['mutual aid', 'climate', 'community safety'],
        content: {
            url: 'https://cdn.coalition.local/feed/vid_climate_001.mp4',
            thumbnail_url: 'https://cdn.coalition.local/feed/vid_climate_001.jpg',
            caption: 'Mutual aid drop-off map now open for flood response.',
        },
        counts: { likes: 291, comments: 57, shares: 41, views: 8_920 },
        trust: { trust_score: 0.92, report_count: 2, report_rate: 0.0002 },
        ranking: { importance: 4.9, social_impact: 4.8, engagement: 0.74, published_at: '2026-04-13T18:10:00.000Z' },
        rating_stats: { unique_raters: 46, rating_velocity_6h: 1.9, rating_velocity_24h: 1.4 },
        community: { engaged_rooms_24h: 4, cross_community_diversity: 0.74 },
        moderation: { anomaly_score: 0.06 },
    },
    {
        id: 'vid_jobs_002',
        kind: 'video',
        language: 'en',
        room_id: '!jobs:coalition.local',
        tags: ['jobs', 'transport', 'delivery'],
        content: {
            url: 'https://cdn.coalition.local/feed/vid_jobs_002.mp4',
            thumbnail_url: 'https://cdn.coalition.local/feed/vid_jobs_002.jpg',
            caption: 'Courier shifts expanded with hazard pay this week.',
        },
        counts: { likes: 410, comments: 94, shares: 66, views: 12_040 },
        trust: { trust_score: 0.89, report_count: 8, report_rate: 0.0007 },
        ranking: { importance: 4.3, social_impact: 4.1, engagement: 0.88, published_at: '2026-04-12T12:00:00.000Z' },
        rating_stats: { unique_raters: 39, rating_velocity_6h: 1.1, rating_velocity_24h: 1.3 },
        community: { engaged_rooms_24h: 3, cross_community_diversity: 0.63 },
        moderation: { anomaly_score: 0.14 },
    },
    {
        id: 'evt_garden_003',
        kind: 'event',
        language: 'en',
        room_id: '!garden:coalition.local',
        tags: ['food', 'gardens', 'mutual aid'],
        content: {
            url: 'https://cdn.coalition.local/feed/evt_garden_003.mp4',
            thumbnail_url: 'https://cdn.coalition.local/feed/evt_garden_003.jpg',
            caption: 'Weekend seed exchange + neighborhood compost training.',
        },
        counts: { likes: 135, comments: 28, shares: 21, views: 2_440 },
        trust: { trust_score: 0.97, report_count: 0, report_rate: 0 },
        ranking: { importance: 4.7, social_impact: 4.6, engagement: 0.55, published_at: '2026-04-14T07:30:00.000Z' },
        rating_stats: { unique_raters: 26, rating_velocity_6h: 2.4, rating_velocity_24h: 1.9 },
        community: { engaged_rooms_24h: 5, cross_community_diversity: 0.81 },
        moderation: { anomaly_score: 0.03 },
    },
    {
        id: 'vid_market_004',
        kind: 'video',
        language: 'es',
        room_id: '!mercado:coalition.local',
        tags: ['market', 'food', 'co-op'],
        content: {
            url: 'https://cdn.coalition.local/feed/vid_market_004.mp4',
            thumbnail_url: 'https://cdn.coalition.local/feed/vid_market_004.jpg',
            caption: 'Mercado cooperativo: entrega local con precios solidarios.',
        },
        counts: { likes: 352, comments: 81, shares: 25, views: 7_100 },
        trust: { trust_score: 0.94, report_count: 1, report_rate: 0.0001 },
        ranking: { importance: 4.2, social_impact: 4.4, engagement: 0.81, published_at: '2026-04-10T15:00:00.000Z' },
        rating_stats: { unique_raters: 17, rating_velocity_6h: 0.7, rating_velocity_24h: 0.8 },
        community: { engaged_rooms_24h: 2, cross_community_diversity: 0.46 },
        moderation: { anomaly_score: 0.11 },
    },
];

const normalizeImportanceSignal = (parsed: z.infer<typeof querySchema>): number =>
    parsed.importance_signal ?? parsed.importance_score ?? 0;

const normalizeImpactSignal = (parsed: z.infer<typeof querySchema>): number =>
    parsed.impact_signal ?? parsed.social_impact_score ?? parsed.impact_score ?? 0;

const computeRankingScore = (item: FeedEntry, request: { importanceSignal: number; impactSignal: number; rankingConfidence: number }): number => {
    // Importance and social impact are primary signals; engagement remains only a secondary tie-break input.
    const signalBoost = ((request.importanceSignal + request.impactSignal) / 10) * Math.max(request.rankingConfidence, 0.4);
    const primary = item.ranking.importance * 0.6 + item.ranking.social_impact * 0.4;
    const trustAdjustment = item.trust.trust_score - Math.min(item.trust.report_rate * 10, 0.2);
    const engagementTieBreaker = item.ranking.engagement * 0.15;
    return primary + signalBoost + trustAdjustment * 0.2 + engagementTieBreaker;
};

const RANKING_STAGES: { stage: FeedEscalationStage; geoScope: FeedGeoScope; minScore: number; minTrustScore: number; maxReportRate: number; maxReportCount: number; minUniqueRaters: number }[] = [
    { stage: 'national', geoScope: 'national', minScore: 0.82, minTrustScore: 0.9, maxReportRate: 0.003, maxReportCount: 4, minUniqueRaters: 36 },
    { stage: 'regional', geoScope: 'regional', minScore: 0.66, minTrustScore: 0.82, maxReportRate: 0.006, maxReportCount: 8, minUniqueRaters: 20 },
    { stage: 'local', geoScope: 'local', minScore: 0.48, minTrustScore: 0.72, maxReportRate: 0.01, maxReportCount: 12, minUniqueRaters: 8 },
];

const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value));

const hoursSincePublished = (publishedAt: string, nowMs: number) => {
    const deltaMs = nowMs - new Date(publishedAt).getTime();
    return Math.max(deltaMs / (1000 * 60 * 60), 0);
};

const windowRecencySignal = (ageHours: number, windowHours: number) => clamp(1 - ageHours / windowHours);

const computeEscalationScore = (item: FeedEntry, nowMs: number): number => {
    const ageHours = hoursSincePublished(item.ranking.published_at, nowMs);
    const importanceImpact = clamp((item.ranking.importance * 0.55 + item.ranking.social_impact * 0.45) / 5);
    const velocity = clamp(item.rating_stats.rating_velocity_24h / 2.5);
    const crossCommunityDiversity = clamp(item.community.cross_community_diversity);
    const recency = windowRecencySignal(ageHours, 72);
    return clamp(importanceImpact * 0.47 + recency * 0.24 + velocity * 0.17 + crossCommunityDiversity * 0.12);
};

const evaluatePromotionSafety = (item: FeedEntry) => {
    const diversityGate = item.rating_stats.unique_raters >= 8;
    const anomalyGate = item.moderation.anomaly_score <= 0.65;
    const reportGate = item.trust.report_count < 12 && item.trust.report_rate <= 0.01;
    return {
        diversityGate,
        anomalyGate,
        reportGate,
        allPassed: diversityGate && anomalyGate && reportGate,
    };
};

const computeStageTransition = (item: FeedEntry, nowMs: number) => {
    const ageHours = hoursSincePublished(item.ranking.published_at, nowMs);
    const score = computeEscalationScore(item, nowMs);
    const safety = evaluatePromotionSafety(item);
    const timelineSignals = {
        h6: clamp(windowRecencySignal(ageHours, 6) * 0.5 + clamp(item.rating_stats.rating_velocity_6h / 3) * 0.3 + item.community.cross_community_diversity * 0.2),
        h24: clamp(windowRecencySignal(ageHours, 24) * 0.45 + clamp(item.rating_stats.rating_velocity_24h / 2.5) * 0.35 + item.community.cross_community_diversity * 0.2),
        h72: clamp(windowRecencySignal(ageHours, 72) * 0.4 + clamp(item.rating_stats.rating_velocity_24h / 2.5) * 0.3 + item.community.cross_community_diversity * 0.3),
    };

    const fallbackStage = RANKING_STAGES[RANKING_STAGES.length - 1];
    if (!safety.allPassed) {
        return { geoScope: fallbackStage.geoScope, stage: fallbackStage.stage, score, timelineSignals };
    }

    const selected = RANKING_STAGES.find((rule) => {
        if (score < rule.minScore) return false;
        if (item.trust.trust_score < rule.minTrustScore) return false;
        if (item.trust.report_rate > rule.maxReportRate || item.trust.report_count > rule.maxReportCount) return false;
        if (item.rating_stats.unique_raters < rule.minUniqueRaters) return false;
        if (rule.stage === 'regional' && timelineSignals.h24 < 0.55) return false;
        if (rule.stage === 'national' && (timelineSignals.h24 < 0.7 || timelineSignals.h72 < 0.66)) return false;
        return true;
    }) ?? fallbackStage;

    return { geoScope: selected.geoScope, stage: selected.stage, score, timelineSignals };
};

const mapEntry = (item: FeedEntry, nowMs: number): GatewayFeedEvent => {
    const escalation = computeStageTransition(item, nowMs);
    return {
        id: item.id,
        room_id: item.room_id,
        content: {
            url: item.content.url,
            thumbnail_url: item.content.thumbnail_url,
            caption: item.content.caption,
        },
        counts: {
            likes: item.counts.likes,
            comments: item.counts.comments,
            shares: item.counts.shares,
            views: item.counts.views,
        },
        trust: {
            score: item.trust.trust_score,
            report_count: item.trust.report_count,
            report_rate: item.trust.report_rate,
        },
        ranking: {
            importance: item.ranking.importance,
            social_impact: item.ranking.social_impact,
            engagement: item.ranking.engagement,
            published_at: item.ranking.published_at,
        },
        tags: item.tags,
        language: item.language,
        geo_scope: escalation.geoScope,
        escalation_stage: escalation.stage,
        escalation_score: Number(escalation.score.toFixed(4)),
    };
};

export const createFeedRouter = () => {
    const router = new Hono();

    router.get('/api/v1/feed', (c) => {
        try {
            const parsed = querySchema.parse({
                interests: c.req.query('interests') ?? undefined,
                consented_location_precision: c.req.query('consented_location_precision') ?? undefined,
                joined_rooms: c.req.query('joined_rooms') ?? undefined,
                language: c.req.query('language') ?? undefined,
                ranking_model: c.req.query('ranking_model') ?? undefined,
                importance_score: c.req.query('importance_score') ?? undefined,
                social_impact_score: c.req.query('social_impact_score') ?? c.req.query('social_impact') ?? undefined,
                impact_score: c.req.query('impact_score') ?? undefined,
                importance_signal: c.req.query('importance_signal') ?? undefined,
                impact_signal: c.req.query('impact_signal') ?? undefined,
                ranking_confidence: c.req.query('ranking_confidence') ?? undefined,
                ratings_count: c.req.query('ratings_count') ?? undefined,
                community_ratings_count: c.req.query('community_ratings_count') ?? undefined,
                location_context: c.req.query('location_context') ?? undefined,
                location_latitude: c.req.query('location_latitude') ?? undefined,
                location_longitude: c.req.query('location_longitude') ?? undefined,
                location_region_code: c.req.query('location_region_code') ?? undefined,
                limit: c.req.query('limit') ?? undefined,
            });

            const interests = toStringArray(parsed.interests).map((value) => value.toLowerCase());
            const joinedRooms = new Set(toStringArray(parsed.joined_rooms));
            const language = parsed.language.toLowerCase();
            const precision = parsed.consented_location_precision;
            const locationContext = parsed.location_context ?? ((precision === 'precise' || precision === 'approximate') ? 'consented' : 'non_location_fallback');

            const requestSignals = {
                importanceSignal: normalizeImportanceSignal(parsed),
                impactSignal: normalizeImpactSignal(parsed),
                rankingConfidence: parsed.ranking_confidence ?? 0.5,
            };

            const interestFiltered = baseFeed.filter((item) => {
                if (!interests.length) {
                    return true;
                }
                const tags = item.tags.map((tag) => tag.toLowerCase());
                return interests.some((interest) => tags.some((tag) => tag.includes(interest) || interest.includes(tag)));
            });

            const languageFiltered = interestFiltered.filter((item) => item.language.toLowerCase() === language || language.startsWith(item.language.toLowerCase()));

            const roomBoosted = languageFiltered.map((item) => {
                const joinedRoomBoost = joinedRooms.has(item.room_id) ? 0.25 : 0;
                const precisionBoost = precision === 'precise' ? 0.2 : precision === 'approximate' ? 0.1 : 0;
                const locationSignalBoost = locationContext === 'consented' && typeof parsed.location_latitude === 'number' && typeof parsed.location_longitude === 'number' ? 0.08 : 0;
                return {
                    item,
                    score: computeRankingScore(item, requestSignals) + joinedRoomBoost + precisionBoost + locationSignalBoost,
                };
            });

            roomBoosted.sort((a, b) => {
                const scoreDelta = b.score - a.score;
                if (Math.abs(scoreDelta) > 0.0001) {
                    return scoreDelta;
                }

                // engagement is explicitly secondary, only used for tie-breaking.
                const engagementDelta = b.item.ranking.engagement - a.item.ranking.engagement;
                if (Math.abs(engagementDelta) > 0.0001) {
                    return engagementDelta;
                }

                return new Date(b.item.ranking.published_at).getTime() - new Date(a.item.ranking.published_at).getTime();
            });

            const selected = roomBoosted.slice(0, parsed.limit).map((entry) => entry.item);

            const nowMs = Date.now();
            const response: GatewayFeedResponse = {
                ranking_model: parsed.ranking_model,
                signals_applied: {
                    importance: requestSignals.importanceSignal,
                    social_impact: requestSignals.impactSignal,
                    ranking_confidence: requestSignals.rankingConfidence,
                    ratings_count: parsed.ratings_count ?? 0,
                    community_ratings_count: parsed.community_ratings_count ?? 0,
                    consented_location_precision: precision,
                    location_context: locationContext,
                },
                videos: selected.filter((item) => item.kind === 'video').map((item) => mapEntry(item, nowMs)),
                events: selected.filter((item) => item.kind === 'event').map((item) => mapEntry(item, nowMs)),
            };

            return c.json(response);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Invalid feed query';
            return c.json({ error: message }, 400);
        }
    });

    return router;
};
