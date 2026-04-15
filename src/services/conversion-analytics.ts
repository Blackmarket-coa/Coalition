export type ConversionEventName =
    | 'discovery_viewed'
    | 'home_nearby_visible'
    | 'take_action_clicked'
    | 'action_routed'
    | 'action_failed'
    | 'abuse_report_submitted'
    | 'feed_rating_submitted'
    | 'feed_rating_ignored'
    | 'feed_rating_failed';

export interface FunnelDashboardPayload {
    funnel_id: 'coalition_social_discovery_v1';
    user_id: string;
    session_id: string;
    steps: Array<{ step: string; ts: string; status: 'viewed' | 'completed' | 'failed'; meta?: Record<string, any> }>;
}

export function trackConversionEvent(event: ConversionEventName, payload: Record<string, any> = {}) {
    console.log('[conversion]', event, payload);
}

export function buildFunnelDashboardPayload(userId: string, sessionId: string, steps: FunnelDashboardPayload['steps']): FunnelDashboardPayload {
    return {
        funnel_id: 'coalition_social_discovery_v1',
        user_id: userId,
        session_id: sessionId,
        steps,
    };
}
