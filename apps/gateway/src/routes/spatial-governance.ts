import { Hono } from 'hono';

const PROPOSAL_STATE_EVENT = 'im.blackout.governance.proposal';
const VOTE_EVENT = 'im.blackout.governance.vote';
const GOVERNANCE_TAG = 'm.bmc.governance';

interface MatrixStateEvent {
    type: string;
    state_key?: string;
    content?: Record<string, any>;
}

interface GovernanceGeoJSONFeature {
    type: 'Feature';
    geometry: {
        type: 'Point';
        coordinates: [number, number];
    };
    properties: {
        proposal_id: string;
        title: string;
        status: 'draft' | 'discuss' | 'amend' | 'close' | 'decide';
        vote_tally: { approve: number; reject: number; abstain: number };
        closes_at: string | null;
        room_id: string;
        radius_meters: number | null;
        description: string;
        is_closing_soon: boolean;
    };
}

const isGovernanceRoom = (room: any, state: MatrixStateEvent[]): boolean => {
    if (room?.topic?.includes?.(GOVERNANCE_TAG) || room?.name?.includes?.(GOVERNANCE_TAG) || room?.room_type === GOVERNANCE_TAG) {
        return true;
    }

    return state.some((event) => event.type === GOVERNANCE_TAG || event.type === 'm.room.tags' || event.type === 'm.tag');
};

const normalizeStatus = (input: unknown): GovernanceGeoJSONFeature['properties']['status'] => {
    if (input === 'draft' || input === 'discuss' || input === 'amend' || input === 'close' || input === 'decide') {
        return input;
    }
    return 'draft';
};

const readCoordinates = (content: Record<string, any>): [number, number] | null => {
    const coords = content.location?.coordinates;
    if (Array.isArray(coords) && coords.length === 2 && coords.every((x: unknown) => Number.isFinite(x))) {
        return [Number(coords[0]), Number(coords[1])];
    }

    const latitude = content.location?.latitude;
    const longitude = content.location?.longitude;
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
        return [Number(longitude), Number(latitude)];
    }

    return null;
};

export const createSpatialGovernanceRouter = () => {
    const router = new Hono();

    router.get('/api/v1/spatial/governance', async (c) => {
        const baseUrl = process.env.MATRIX_HOMESERVER_URL;
        const accessToken = process.env.MATRIX_ACCESS_TOKEN;

        if (!baseUrl || !accessToken) {
            return c.json({ error: 'MATRIX_HOMESERVER_URL and MATRIX_ACCESS_TOKEN are required' }, 500);
        }

        const headers = {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
        };

        const matrixFetch = async (path: string, init?: RequestInit) => {
            const response = await fetch(`${baseUrl.replace(/\/$/, '')}${path}`, {
                ...init,
                headers: {
                    ...headers,
                    ...(init?.headers || {}),
                },
            });

            if (!response.ok) {
                throw new Error(`Matrix request failed ${response.status} for ${path}`);
            }

            return response.json();
        };

        try {
            const publicRooms = await matrixFetch('/_matrix/client/v3/publicRooms?limit=100');
            const rooms: any[] = Array.isArray(publicRooms?.chunk) ? publicRooms.chunk : [];

            const features: GovernanceGeoJSONFeature[] = [];

            for (const room of rooms) {
                const roomId = room?.room_id;
                if (!roomId) continue;

                let roomState: MatrixStateEvent[] = [];
                try {
                    const state = await matrixFetch(`/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/state`);
                    roomState = Array.isArray(state) ? state : [];
                } catch {
                    continue;
                }

                if (!isGovernanceRoom(room, roomState)) {
                    continue;
                }

                const proposals = roomState.filter((event) => event.type === PROPOSAL_STATE_EVENT);
                if (!proposals.length) continue;

                let timelineChunk: any[] = [];
                try {
                    const timeline = await matrixFetch(`/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/messages?dir=b&limit=200`);
                    timelineChunk = Array.isArray(timeline?.chunk) ? timeline.chunk : [];
                } catch {
                    timelineChunk = [];
                }

                for (const proposalEvent of proposals) {
                    const content = proposalEvent.content ?? {};
                    const coordinates = readCoordinates(content);
                    if (!coordinates) continue;

                    const proposalId = String(content.id ?? proposalEvent.state_key ?? '');
                    if (!proposalId) continue;

                    const votes = timelineChunk.filter((event) => event?.type === VOTE_EVENT && (event?.content?.proposal_id === proposalId || event?.content?.proposalId === proposalId));

                    const vote_tally = votes.reduce(
                        (acc, event) => {
                            const ballot = event?.content?.ballot;
                            if (ballot === 'approve' || ballot === 'reject' || ballot === 'abstain') {
                                acc[ballot] += 1;
                            }
                            return acc;
                        },
                        { approve: 0, reject: 0, abstain: 0 }
                    );

                    const closesAtRaw = content.closes_at ?? content.closesAt ?? null;
                    const closesAt = closesAtRaw ? new Date(closesAtRaw).toISOString() : null;
                    const isClosingSoon = closesAt ? new Date(closesAt).getTime() - Date.now() <= 48 * 60 * 60 * 1000 : false;

                    features.push({
                        type: 'Feature',
                        geometry: { type: 'Point', coordinates },
                        properties: {
                            proposal_id: proposalId,
                            title: String(content.title ?? 'Untitled proposal'),
                            status: normalizeStatus(content.stage ?? content.status),
                            vote_tally,
                            closes_at: closesAt,
                            room_id: roomId,
                            radius_meters: Number.isFinite(content.location?.radius) ? Number(content.location.radius) : null,
                            description: String(content.body ?? content.description ?? ''),
                            is_closing_soon: isClosingSoon,
                        },
                    });
                }
            }

            return c.json({ type: 'FeatureCollection', features });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unexpected error';
            return c.json({ error: message }, 500);
        }
    });

    return router;
};
