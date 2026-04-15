import { Hono } from 'hono';
import { z } from 'zod';

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

const mapEntry = (item: FeedEntry) => ({
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
});

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
                limit: c.req.query('limit') ?? undefined,
            });

            const interests = toStringArray(parsed.interests).map((value) => value.toLowerCase());
            const joinedRooms = new Set(toStringArray(parsed.joined_rooms));
            const language = parsed.language.toLowerCase();
            const precision = parsed.consented_location_precision;

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
                return {
                    item,
                    score: computeRankingScore(item, requestSignals) + joinedRoomBoost + precisionBoost,
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

            return c.json({
                ranking_model: parsed.ranking_model,
                signals_applied: {
                    importance: requestSignals.importanceSignal,
                    social_impact: requestSignals.impactSignal,
                    ranking_confidence: requestSignals.rankingConfidence,
                    ratings_count: parsed.ratings_count ?? 0,
                    community_ratings_count: parsed.community_ratings_count ?? 0,
                    consented_location_precision: precision,
                },
                videos: selected.filter((item) => item.kind === 'video').map(mapEntry),
                events: selected.filter((item) => item.kind === 'event').map(mapEntry),
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Invalid feed query';
            return c.json({ error: message }, 400);
        }
    });

    return router;
};
