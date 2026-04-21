export interface MatrixUnlockPayload {
    userId: string;
    packId: string;
    shortcodes: Record<string, string>;
    displayName?: string;
}

export interface MatrixUnlockResult {
    type: 'unlock';
    applied: boolean;
    pack_id: string;
    account_data_type: string;
}

export interface MatrixUnlockConfig {
    homeserverUrl: string;
    serviceToken: string;
}

export const loadMatrixUnlockConfig = (): MatrixUnlockConfig => {
    const homeserverUrl = process.env.BLACKOUT_HOMESERVER_URL;
    const serviceToken = process.env.BLACKOUT_MATRIX_SERVICE_TOKEN;
    if (!homeserverUrl || !serviceToken) {
        throw new Error('BLACKOUT_HOMESERVER_URL and BLACKOUT_MATRIX_SERVICE_TOKEN are required for unlock delivery');
    }
    return { homeserverUrl: homeserverUrl.replace(/\/$/, ''), serviceToken };
};

const ACCOUNT_DATA_TYPE = 'im.ponies.user_emotes';

export const applyMatrixUnlock = async (
    payload: MatrixUnlockPayload,
    fetchImpl: typeof fetch = fetch,
    config: MatrixUnlockConfig = loadMatrixUnlockConfig()
): Promise<MatrixUnlockResult> => {
    const encodedUser = encodeURIComponent(payload.userId);
    const encodedType = encodeURIComponent(ACCOUNT_DATA_TYPE);
    const url = `${config.homeserverUrl}/_matrix/client/v3/user/${encodedUser}/account_data/${encodedType}`;

    const getRes = await fetchImpl(url, {
        method: 'GET',
        headers: { Authorization: `Bearer ${config.serviceToken}` },
    });

    let existing: { pack?: { display_name?: string }; images?: Record<string, { url: string }> } = {};
    if (getRes.ok) {
        existing = (await getRes.json()) as typeof existing;
    } else if (getRes.status !== 404) {
        throw new Error(`Failed to read account data: ${getRes.status}`);
    }

    const mergedImages: Record<string, { url: string; pack_id?: string }> = { ...(existing.images ?? {}) };
    for (const [shortcode, mxcUrl] of Object.entries(payload.shortcodes)) {
        mergedImages[shortcode] = { url: mxcUrl, pack_id: payload.packId };
    }

    const putBody = {
        pack: { display_name: payload.displayName ?? existing.pack?.display_name ?? 'Bazaar packs' },
        images: mergedImages,
    };

    const putRes = await fetchImpl(url, {
        method: 'PUT',
        headers: {
            Authorization: `Bearer ${config.serviceToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(putBody),
    });

    if (!putRes.ok) {
        const body = await putRes.text().catch(() => '');
        throw new Error(`Matrix unlock PUT failed: ${putRes.status} ${body}`);
    }

    return { type: 'unlock', applied: true, pack_id: payload.packId, account_data_type: ACCOUNT_DATA_TYPE };
};
