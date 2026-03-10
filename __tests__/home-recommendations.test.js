import { createHomeRecommendations } from '../src/services/home-recommendations';

describe('home recommendations', () => {
    test('uses interests + location + behavior to build recommendations', () => {
        const recommendations = createHomeRecommendations({
            interests: ['Mutual Aid', 'Civic Tech'],
            consentedLocationPrecision: 'approximate',
            recentBehavior: [],
        });

        expect(recommendations.some((recommendation) => recommendation.action.type === 'REQUEST_AID')).toBe(true);
        expect(recommendations.some((recommendation) => recommendation.action.type === 'APPLY_JOB')).toBe(true);
        expect(recommendations.some((recommendation) => recommendation.action.type === 'JOIN_ROOM')).toBe(true);
    });

    test('does not push location jobs when consent is off', () => {
        const recommendations = createHomeRecommendations({
            interests: ['Mutual Aid'],
            consentedLocationPrecision: 'off',
            recentBehavior: ['JOIN_ROOM'],
        });

        expect(recommendations.some((recommendation) => recommendation.action.type === 'APPLY_JOB')).toBe(false);
        expect(recommendations.some((recommendation) => recommendation.action.type === 'JOIN_ROOM')).toBe(false);
    });
});
