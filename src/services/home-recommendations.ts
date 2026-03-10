import { EcosystemAction } from './action-router';

export interface HomeRecommendationContext {
    interests: string[];
    consentedLocationPrecision: 'precise' | 'approximate' | 'off';
    recentBehavior: string[];
}

export interface HomeRecommendation {
    id: string;
    title: string;
    reason: string;
    action: EcosystemAction;
}

export function createHomeRecommendations(context: HomeRecommendationContext): HomeRecommendation[] {
    const recommendations: HomeRecommendation[] = [];
    const interests = context.interests.map((value) => value.toLowerCase());

    if (interests.some((value) => value.includes('aid'))) {
        recommendations.push({
            id: 'aid-map',
            title: 'Respond to nearby aid requests',
            reason: 'Based on your Mutual Aid interests',
            action: { type: 'REQUEST_AID', payload: { aidType: 'mutual-aid' } },
        });
    }

    if (context.consentedLocationPrecision !== 'off') {
        recommendations.push({
            id: 'local-jobs',
            title: 'Apply for a nearby Blackstar job',
            reason: 'Location consent allows local opportunities',
            action: { type: 'APPLY_JOB', payload: { jobId: 'job_101', providerId: 'provider_demo' } },
        });
    }

    if (!context.recentBehavior.includes('JOIN_ROOM')) {
        recommendations.push({
            id: 'join-room',
            title: 'Join coalition governance room',
            reason: 'You have not joined a room yet',
            action: { type: 'JOIN_ROOM', payload: { roomId: '#coalition-general:matrix.org' } },
        });
    }

    recommendations.push({
        id: 'shop',
        title: 'Browse local marketplace listings',
        reason: 'Popular in your ecosystem',
        action: { type: 'SHOP_ITEM' },
    });

    return recommendations;
}
