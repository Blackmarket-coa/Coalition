export type FeedEvent = {
    event_id: string;
    room_id?: string;
    sender: string;
    visibility?: 'public' | 'private' | 'blocked';
    content: {
        action_hint?: 'SHOP_ITEM' | 'POST_OFFERING' | 'APPLY_JOB' | 'JOIN_ROOM' | 'OPEN_PROPOSAL' | 'REQUEST_AID';
        url: string;
        room_id?: string;
        body?: string;
        creator_name?: string;
        creator_handle?: string;
        creator_avatar?: string;
        like_count?: number;
        comment_count?: number;
        caption?: string;
        trust_score?: number;
        report_count?: number;
    };
    engagement_score?: number;
};

export type FeedItem = {
    id: string;
    roomId: string;
    videoUrl: string;
    creatorName: string;
    creatorHandle: string;
    creatorAvatar: string | null;
    likeCount: number;
    commentCount: number;
    caption: string;
    visibility: 'public' | 'private' | 'blocked';
    trustScore: number;
    reportCount: number;
    actionHint?: 'SHOP_ITEM' | 'POST_OFFERING' | 'APPLY_JOB' | 'JOIN_ROOM' | 'OPEN_PROPOSAL' | 'REQUEST_AID';
};

export type FeedRequestParams = {
    interests?: string[];
    consented_location_precision?: string;
    joined_rooms?: string[];
    language?: string;
};

export type CtaModule = 'shop' | 'jobs' | 'aid' | 'governance';

export type CtaCardItem = {
    type: 'cta';
    id: string;
    module: CtaModule;
    title: string;
    description: string;
};

export type VideoCardItem = {
    type: 'video';
    item: FeedItem;
};

export type RenderFeedItem = VideoCardItem | CtaCardItem;

const ctaDefinitions: Omit<CtaCardItem, 'type' | 'id'>[] = [
    { module: 'shop', title: 'Shop local goods', description: 'Open marketplace offers in your area.' },
    { module: 'jobs', title: 'Find Blackstar jobs', description: 'View active work and service opportunities.' },
    { module: 'aid', title: 'Mutual aid map', description: 'See nearby aid signals and requests.' },
    { module: 'governance', title: 'Community governance', description: 'Join rooms discussing proposals and votes.' },
];

export const DEFAULT_ROOM_ID = '!coalition-feed:matrix.org';

export function toFeedItem(event: FeedEvent): FeedItem {
    const roomId = event.room_id ?? event.content?.room_id ?? DEFAULT_ROOM_ID;
    return {
        id: event.event_id,
        roomId,
        videoUrl: event.content?.url,
        creatorName: event.content?.creator_name ?? event.sender,
        creatorHandle: event.content?.creator_handle ?? event.sender,
        creatorAvatar: event.content?.creator_avatar ?? null,
        likeCount: Number(event.content?.like_count ?? 0),
        commentCount: Number(event.content?.comment_count ?? 0),
        caption: event.content?.caption ?? event.content?.body ?? '',
        visibility: event.visibility ?? 'public',
        trustScore: Number(event.content?.trust_score ?? 50),
        reportCount: Number(event.content?.report_count ?? 0),
        actionHint: event.content?.action_hint,
    };
}

export function filterVisibleFeedItems(items: FeedItem[], options: { hideReportedThreshold?: number } = {}) {
    const threshold = options.hideReportedThreshold ?? 5;
    return items.filter((item) => item.visibility !== 'blocked' && item.reportCount < threshold);
}

export function getTrustSignal(item: FeedItem) {
    if (item.trustScore >= 80) return 'Trusted creator';
    if (item.trustScore >= 50) return 'Community verified';
    return 'Limited trust signal';
}

export function createFeedRequestUrl(baseEndpoint: string, params: FeedRequestParams = {}) {
    const query = new URLSearchParams();
    if (params.interests?.length) query.set('interests', params.interests.join(','));
    if (params.consented_location_precision) query.set('consented_location_precision', params.consented_location_precision);
    if (params.joined_rooms?.length) query.set('joined_rooms', params.joined_rooms.join(','));
    if (params.language) query.set('language', params.language);
    const qs = query.toString();
    return qs ? `${baseEndpoint}?${qs}` : baseEndpoint;
}

export function injectCtaCards(items: FeedItem[], interval = 4): RenderFeedItem[] {
    if (!items.length) return [];
    const result: RenderFeedItem[] = [];
    let ctaIndex = 0;

    items.forEach((item, index) => {
        result.push({ type: 'video', item });
        const shouldInsertCta = (index + 1) % interval === 0;
        if (shouldInsertCta) {
            const cta = ctaDefinitions[ctaIndex % ctaDefinitions.length];
            result.push({ type: 'cta', id: `cta-${index}-${cta.module}`, ...cta });
            ctaIndex += 1;
        }
    });

    return result;
}

export function handleCommentAction(item: FeedItem, options: { onOpenChatPanel?: (feedItem: FeedItem) => void; setChatItem: (feedItem: FeedItem) => void; onMissingRoom?: (feedItem: FeedItem) => void }) {
    if (!item.roomId) {
        options.onMissingRoom?.(item);
        return false;
    }

    if (options.onOpenChatPanel) {
        options.onOpenChatPanel(item);
        return true;
    }

    options.setChatItem(item);
    return true;
}
