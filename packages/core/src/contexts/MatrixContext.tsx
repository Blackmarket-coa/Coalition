import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type MatrixClient, type Room } from 'matrix-js-sdk';
import { config } from '../utils';

const MATRIX_ACCESS_TOKEN_KEY = 'matrix_access_token';
const MATRIX_USER_ID_KEY = 'matrix_user_id';
const MATRIX_DEVICE_ID_KEY = 'matrix_device_id';
const ROOM_TAGS = ['m.bmc.feed', 'm.bmc.governance', 'm.bmc.chat'];

type MatrixCredentials = {
    access_token: string;
    user_id: string;
    device_id?: string;
};

type CreateRoomOptions = {
    name?: string;
    topic?: string;
    visibility?: 'private' | 'public';
    invite?: string[];
    room_alias_name?: string;
    initial_state?: unknown[];
    preset?: 'private_chat' | 'public_chat' | 'trusted_private_chat';
};

type MatrixContextValue = {
    client: MatrixClient | null;
    isLoggedIn: boolean;
    rooms: Room[];
    sendMessage: (roomId: string, content: string) => Promise<void>;
    createRoom: (options: CreateRoomOptions) => Promise<string>;
    joinRoom: (roomIdOrAlias: string) => Promise<void>;
    getTimeline: (roomId: string, limit?: number) => any[];
    loginWithGatewayCredentials: (credentials: MatrixCredentials) => Promise<void>;
    logout: () => Promise<void>;
};

const MatrixContext = createContext<MatrixContextValue>({
    client: null,
    isLoggedIn: false,
    rooms: [],
    sendMessage: async () => {},
    createRoom: async () => '',
    joinRoom: async () => {},
    getTimeline: () => [],
    loginWithGatewayCredentials: async () => {},
    logout: async () => {},
});

const getRoomTagMap = (room: Room): Record<string, unknown> => {
    const event = room.currentState.getStateEvents('m.tag', room.roomId);
    const content = event?.getContent?.() ?? {};
    return (content.tags as Record<string, unknown>) ?? {};
};

const isRelevantRoom = (room: Room): boolean => {
    const tags = Object.keys(getRoomTagMap(room));
    return tags.some((tag) => ROOM_TAGS.includes(tag));
};

const sortRoomsByActivity = (rooms: Room[]): Room[] =>
    [...rooms].sort((a, b) => {
        const aTs = a.getLastActiveTimestamp() ?? 0;
        const bTs = b.getLastActiveTimestamp() ?? 0;
        return bTs - aTs;
    });

const buildSyncFilter = () => ({
    room: {
        timeline: {
            limit: 50,
            lazy_load_members: true,
        },
        state: {
            lazy_load_members: true,
        },
        account_data: {
            types: ['m.tag'],
        },
    },
    presence: {
        types: [],
    },
});

export const MatrixProvider = ({ children }) => {
    const [client, setClient] = useState<MatrixClient | null>(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [rooms, setRooms] = useState<Room[]>([]);

    const refreshRooms = useCallback((targetClient: MatrixClient) => {
        const next = sortRoomsByActivity(targetClient.getRooms().filter(isRelevantRoom));
        setRooms(next);
    }, []);

    const setupCrypto = useCallback(async (targetClient: MatrixClient) => {
        const wasm = await import('@matrix-org/matrix-sdk-crypto-wasm');
        if (typeof (wasm as any).initAsync === 'function') {
            await (wasm as any).initAsync();
        }

        await targetClient.initRustCrypto();
        await targetClient.crypto?.globalBlacklistUnverifiedDevices?.(false);
        await targetClient.downloadKeys(targetClient.getUsers().map((u) => u.userId));
    }, []);

    const startSync = useCallback(
        async (targetClient: MatrixClient) => {
            targetClient.on('Room.timeline', () => refreshRooms(targetClient));
            targetClient.on('Room', () => refreshRooms(targetClient));
            targetClient.on('RoomState.events', () => refreshRooms(targetClient));
            targetClient.on('sync', () => refreshRooms(targetClient));

            const filter = await targetClient.createFilter(buildSyncFilter());
            targetClient.startClient({
                initialSyncLimit: 20,
                filter,
            });

            refreshRooms(targetClient);
        },
        [refreshRooms]
    );

    const createAndBootClient = useCallback(
        async ({ access_token, user_id, device_id }: MatrixCredentials) => {
            const baseUrl = config('BLACKOUT_HOMESERVER_URL');
            if (!baseUrl) {
                throw new Error('BLACKOUT_HOMESERVER_URL is required');
            }

            const nextClient = createClient({
                baseUrl,
                accessToken: access_token,
                userId: user_id,
                deviceId: device_id,
                timelineSupport: true,
                useAuthorizationHeader: true,
            });

            await setupCrypto(nextClient);
            await startSync(nextClient);

            setClient(nextClient);
            setIsLoggedIn(true);
            return nextClient;
        },
        [setupCrypto, startSync]
    );

    useEffect(() => {
        (async () => {
            const [accessToken, userId, deviceId] = await Promise.all([
                AsyncStorage.getItem(MATRIX_ACCESS_TOKEN_KEY),
                AsyncStorage.getItem(MATRIX_USER_ID_KEY),
                AsyncStorage.getItem(MATRIX_DEVICE_ID_KEY),
            ]);

            if (!accessToken || !userId) {
                return;
            }

            await createAndBootClient({
                access_token: accessToken,
                user_id: userId,
                device_id: deviceId ?? undefined,
            });
        })();
    }, [createAndBootClient]);

    const loginWithGatewayCredentials = useCallback(
        async (credentials: MatrixCredentials) => {
            await AsyncStorage.multiSet([
                [MATRIX_ACCESS_TOKEN_KEY, credentials.access_token],
                [MATRIX_USER_ID_KEY, credentials.user_id],
                [MATRIX_DEVICE_ID_KEY, credentials.device_id ?? ''],
            ]);

            await createAndBootClient(credentials);
        },
        [createAndBootClient]
    );

    const logout = useCallback(async () => {
        client?.stopClient();
        setClient(null);
        setIsLoggedIn(false);
        setRooms([]);
        await AsyncStorage.multiRemove([MATRIX_ACCESS_TOKEN_KEY, MATRIX_USER_ID_KEY, MATRIX_DEVICE_ID_KEY]);
    }, [client]);

    const sendMessage = useCallback(
        async (roomId: string, content: string) => {
            if (!client) {
                throw new Error('Matrix client is not initialized');
            }

            await client.sendEvent(roomId, 'm.room.message', {
                msgtype: 'm.text',
                body: content,
            });
        },
        [client]
    );

    const createRoom = useCallback(
        async (options: CreateRoomOptions): Promise<string> => {
            if (!client) {
                throw new Error('Matrix client is not initialized');
            }

            const result = await client.createRoom(options as any);
            const roomId = result.room_id;
            if (!roomId) {
                throw new Error('Matrix room creation failed');
            }

            return roomId;
        },
        [client]
    );

    const joinRoom = useCallback(
        async (roomIdOrAlias: string) => {
            if (!client) {
                throw new Error('Matrix client is not initialized');
            }

            await client.joinRoom(roomIdOrAlias);
            refreshRooms(client);
        },
        [client, refreshRooms]
    );

    const getTimeline = useCallback(
        (roomId: string, limit = 50) => {
            if (!client) {
                return [];
            }

            const room = client.getRoom(roomId);
            if (!room) {
                return [];
            }

            return room.getLiveTimeline().getEvents().slice(-limit).reverse();
        },
        [client]
    );

    const value = useMemo(
        () => ({
            client,
            isLoggedIn,
            rooms,
            sendMessage,
            createRoom,
            joinRoom,
            getTimeline,
            loginWithGatewayCredentials,
            logout,
        }),
        [client, isLoggedIn, rooms, sendMessage, createRoom, joinRoom, getTimeline, loginWithGatewayCredentials, logout]
    );

    return <MatrixContext.Provider value={value}>{children}</MatrixContext.Provider>;
};

export const useMatrix = () => useContext(MatrixContext);

export const useRoom = (roomId: string) => {
    const { client, getTimeline, sendMessage } = useMatrix();
    const [tick, setTick] = useState(0);

    useEffect(() => {
        if (!client || !roomId) {
            return;
        }

        const onTimeline = (event: any, room: Room | null) => {
            if (room?.roomId === roomId) {
                setTick((v) => v + 1);
            }
        };

        const onTyping = (event: any, member: any) => {
            if (member?.roomId === roomId) {
                setTick((v) => v + 1);
            }
        };

        client.on('Room.timeline', onTimeline);
        client.on('RoomMember.typing', onTyping);

        return () => {
            client.removeListener('Room.timeline', onTimeline);
            client.removeListener('RoomMember.typing', onTyping);
        };
    }, [client, roomId]);

    const room = client?.getRoom(roomId) ?? null;
    const timeline = useMemo(() => getTimeline(roomId, 100), [getTimeline, roomId, tick]);
    const members = useMemo(() => room?.getMembers() ?? [], [room, tick]);
    const typingIndicators = useMemo(() => room?.getTypingMembers()?.map((member) => member.userId) ?? [], [room, tick]);

    const send = useCallback(
        async (content: string) => {
            await sendMessage(roomId, content);
        },
        [roomId, sendMessage]
    );

    return {
        timelineEvents: timeline,
        members,
        roomName: room?.name ?? roomId,
        typingIndicators,
        send,
    };
};

export default MatrixContext;
