import { config } from '../utils';

export interface BlackstarJob {
    id: string;
    title: string;
    status: 'open' | 'assigned' | 'in_progress' | 'completed';
    claimable: boolean;
    assignmentId?: string;
    pickup?: { latitude: number; longitude: number };
    dropoff?: { latitude: number; longitude: number };
}

export interface BlackstarClaim {
    id: string;
    jobId: string;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: string;
}

export interface BlackstarAssignment {
    id: string;
    orderId: string;
    status: string;
    path: Array<{ latitude: number; longitude: number }>;
}

export interface ProviderOnboardingProfile {
    providerId: string;
    displayName: string;
    serviceArea: string;
    capabilities: string[];
    medusaVendorLinked: boolean;
    blackstarDriverLinked: boolean;
    blackoutIdentityLinked: boolean;
}

const sampleJobs: BlackstarJob[] = [
    {
        id: 'job_101',
        title: 'Downtown delivery block',
        status: 'open',
        claimable: true,
        pickup: { latitude: 40.7128, longitude: -74.006 },
        dropoff: { latitude: 40.7192, longitude: -74.001 },
    },
    {
        id: 'job_102',
        title: 'Evening aid run',
        status: 'assigned',
        claimable: false,
        assignmentId: 'asn_201',
        pickup: { latitude: 40.709, longitude: -74.01 },
        dropoff: { latitude: 40.715, longitude: -74.015 },
    },
];

const sampleClaims: BlackstarClaim[] = [{ id: 'claim_1', jobId: 'job_101', status: 'pending', createdAt: new Date().toISOString() }];

const sampleAssignments: BlackstarAssignment[] = [
    {
        id: 'asn_201',
        orderId: 'order_123',
        status: 'enroute',
        path: [
            { latitude: 40.709, longitude: -74.01 },
            { latitude: 40.711, longitude: -74.008 },
            { latitude: 40.714, longitude: -74.006 },
        ],
    },
];

const normalizeClaim = (claim: any): BlackstarClaim => ({
    id: String(claim?.id ?? ''),
    jobId: String(claim?.jobId ?? claim?.job_id ?? ''),
    status: claim?.status ?? 'pending',
    createdAt: claim?.createdAt ?? claim?.created_at ?? new Date().toISOString(),
});

const normalizeJobs = (jobs: any[]): BlackstarJob[] =>
    (Array.isArray(jobs) ? jobs : []).map((job) => ({
        ...job,
        claimable: Boolean(job?.claimable),
    }));

const normalizeAssignments = (assignments: any[]): BlackstarAssignment[] =>
    (Array.isArray(assignments) ? assignments : []).map((assignment) => ({
        ...assignment,
        path: Array.isArray(assignment?.path) ? assignment.path : [],
    }));

const getGatewayBase = () => {
    const host = config('BLACKSTAR_GATEWAY_HOST', '').replace(/\/$/, '');
    const apiKey = config('BLACKSTAR_GATEWAY_KEY', '');

    return { host, apiKey };
};

const gatewayFetch = async <T>(path: string, options: RequestInit = {}, fallback: T): Promise<T> => {
    const { host, apiKey } = getGatewayBase();
    if (!host) {
        return fallback;
    }

    try {
        const response = await fetch(`${host}${path}`, {
            ...options,
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
                ...(options.headers ?? {}),
            },
        });

        if (!response.ok) {
            throw new Error(`Gateway request failed (${response.status})`);
        }

        return (await response.json()) as T;
    } catch (error) {
        console.warn(`Gateway request failed for ${path}, using fallback.`, error);
        return fallback;
    }
};

export const getGatewayJobs = async () => normalizeJobs(await gatewayFetch<BlackstarJob[]>('/v1/jobs', {}, sampleJobs));

export const getGatewayClaims = async () => (await gatewayFetch<BlackstarClaim[]>('/v1/claims', {}, sampleClaims)).map(normalizeClaim);

export const claimGatewayJob = async (jobId: string, providerId: string) => {
    return gatewayFetch<BlackstarClaim>(
        '/v1/claims',
        { method: 'POST', body: JSON.stringify({ job_id: jobId, provider_id: providerId }) },
        { id: `claim_${jobId}`, jobId, status: 'pending', createdAt: new Date().toISOString() }
    ).then(normalizeClaim);
};

export const getGatewayAssignments = async () => normalizeAssignments(await gatewayFetch<BlackstarAssignment[]>('/v1/assignments', {}, sampleAssignments));

export const upsertProviderOnboardingProfile = (profile: ProviderOnboardingProfile) =>
    gatewayFetch<ProviderOnboardingProfile>(`/v1/providers/${encodeURIComponent(profile.providerId)}/onboarding`, { method: 'PUT', body: JSON.stringify(profile) }, profile);

export const getProviderOnboardingProfile = (providerId: string) =>
    gatewayFetch<ProviderOnboardingProfile>(
        `/v1/providers/${encodeURIComponent(providerId)}/onboarding`,
        {},
        {
            providerId,
            displayName: 'Community Provider',
            serviceArea: 'Lower Manhattan',
            capabilities: ['deliveries'],
            medusaVendorLinked: true,
            blackstarDriverLinked: true,
            blackoutIdentityLinked: false,
        }
    );
