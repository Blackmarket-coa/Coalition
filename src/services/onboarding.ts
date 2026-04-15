import { config } from '../utils';
import { LocationConsentSettings, LocationConsentStatus } from '../utils/location-consent';
import { get as getStorageMap, set as setStorageMap } from '../hooks/use-storage';

export const ONBOARDING_STORAGE_KEY_PREFIX = 'user_onboarding';

// 20+ seed interests used by InterestPicker chips.
export const seedInterests = [
    'Mutual Aid',
    'Food Sovereignty',
    'Community Safety',
    'Tenant Organizing',
    'Worker Co-ops',
    'Repair Clinics',
    'Public Transit',
    'Local Art',
    'Open Source',
    'Civic Tech',
    'Restorative Justice',
    'Youth Programs',
    'Community Gardens',
    'Independent Media',
    'Barter Markets',
    'Tool Libraries',
    'Mental Health',
    'Education',
    'Emergency Response',
    'Language Exchange',
    'Caregiving',
    'Housing Support',
];

export const ecosystemGoalMap = {
    buy: 'free-black-market',
    sell: 'free-black-market',
    'find work': 'Blackstar',
    'provide service': 'Blackstar',
    discuss: 'Blackout Matrix rooms',
    organize: 'Blackout Matrix rooms',
    vote: 'Blackout Matrix rooms',
};

export interface OnboardingPayload {
    welcomeSeen?: boolean;
    profile?: { displayName?: string; bio?: string };
    interests?: string[];
    ecosystemGoals?: string[];
    ecosystemActions?: string[];
    consent?: { location: LocationConsentStatus | 'skipped'; locationSettings?: LocationConsentSettings };
    suggestedCommunities?: string[];
    completedAt?: string;
}

const keyForUser = (userId: string) => `${ONBOARDING_STORAGE_KEY_PREFIX}:${userId}`;

export function mapGoalsToEcosystemActions(goals: string[] = []) {
    return [...new Set(goals.map((goal) => ecosystemGoalMap[String(goal).toLowerCase()]).filter(Boolean))];
}

export async function persistOnboardingPayload(userId: string, payload: OnboardingPayload) {
    setStorageMap(keyForUser(userId), payload);
    return payload;
}

export function loadOnboardingPayload(userId: string): OnboardingPayload | null {
    return getStorageMap(keyForUser(userId)) ?? null;
}

export function trackOnboardingEvent(event: string, metadata: Record<string, any> = {}) {
    // API contract assumption: analytics can be emitted fire-and-forget from client and reconciled server-side.
    console.log('[analytics]', event, metadata);
}

export async function syncOnboardingPayload(payload: OnboardingPayload) {
    const host = String(config('BLACKSTAR_GATEWAY_HOST', '')).replace(/\/$/, '');
    const apiKey = config('BLACKSTAR_GATEWAY_KEY', '');

    if (!host) {
        return { ok: false, offline: true };
    }

    // API contract assumption: gateway accepts POST /v1/user/onboarding JSON body and returns { ok: boolean, id?: string }.
    const response = await fetch(`${host}/v1/user/onboarding`, {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        throw new Error(`Onboarding sync failed (${response.status})`);
    }

    return response.json();
}

export function shouldShowMapFallback(consentStatus: string | null | undefined) {
    return consentStatus === 'declined' || consentStatus === 'denied' || consentStatus === 'revoked' || consentStatus === 'skipped';
}
