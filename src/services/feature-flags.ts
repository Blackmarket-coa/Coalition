import { config, toBoolean } from '../utils';

export const isCoalitionNavEnabled = () => toBoolean(config('COALITION_NAV_ENABLED', 'true'));
export const isCoalitionOnboardingEnabled = () => toBoolean(config('COALITION_ONBOARDING_ENABLED', 'true'));
export const isCoalitionFeedRankingEnabled = () => toBoolean(config('COALITION_FEED_RANKING_ENABLED', 'true'));
export const isCoalitionActionRouterEnabled = () => toBoolean(config('COALITION_ACTION_ROUTER_ENABLED', 'true'));
