import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, FlatList, GestureResponderEvent, Pressable, Share, StyleSheet, ViewToken } from 'react-native';
import Video from 'react-native-video';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import Config from 'react-native-config';
import { Circle, Image, Paragraph, Text, XStack, YStack } from 'tamagui';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

type FeedEvent = {
    event_id: string;
    room_id: string;
    sender: string;
    content: {
        url: string;
        body?: string;
        creator_name?: string;
        creator_handle?: string;
        creator_avatar?: string;
        like_count?: number;
        comment_count?: number;
        caption?: string;
    };
    engagement_score?: number;
};

type FeedItem = {
    id: string;
    roomId: string;
    videoUrl: string;
    creatorName: string;
    creatorHandle: string;
    creatorAvatar: string | null;
    likeCount: number;
    commentCount: number;
    caption: string;
};

type VerticalVideoFeedProps = {
    gatewayBaseUrl?: string;
    height?: number;
    onOpenProfile?: (item: FeedItem) => void;
    onNavigateToMap?: (item: FeedItem) => void;
    onOpenChatPanel?: (item: FeedItem) => void;
    onShare?: (item: FeedItem) => void;
};

const solarpunk = {
    bg: '#08120f',
    panel: 'rgba(8,18,15,0.7)',
    accentGreen: '#23c16b',
    accentGold: '#f2b134',
    white: '#f5fff8',
    dim: '#a2b3aa',
};

const HEART_ANIMATION_MS = 260;
const DOUBLE_TAP_WINDOW_MS = 240;

const toFeedItem = (event: FeedEvent): FeedItem => ({
    id: event.event_id,
    roomId: event.room_id,
    videoUrl: event.content?.url,
    creatorName: event.content?.creator_name ?? event.sender,
    creatorHandle: event.content?.creator_handle ?? event.sender,
    creatorAvatar: event.content?.creator_avatar ?? null,
    likeCount: Number(event.content?.like_count ?? 0),
    commentCount: Number(event.content?.comment_count ?? 0),
    caption: event.content?.caption ?? event.content?.body ?? '',
});

const RightSidebar = ({
    item,
    onOpenProfile,
    onLike,
    onOpenComments,
    onShare,
    onNavigateToMap,
}: {
    item: FeedItem;
    onOpenProfile: () => void;
    onLike: () => void;
    onOpenComments: () => void;
    onShare: () => void;
    onNavigateToMap: () => void;
}) => {
    const heartScale = useSharedValue(1);

    const heartStyle = useAnimatedStyle(() => ({
        transform: [{ scale: heartScale.value }],
    }));

    const handleLike = () => {
        heartScale.value = withSequence(withTiming(1.3, { duration: HEART_ANIMATION_MS / 2 }), withTiming(1, { duration: HEART_ANIMATION_MS / 2 }));
        onLike();
    };

    return (
        <YStack position='absolute' right={12} bottom={120} gap='$3' alignItems='center'>
            <Pressable onPress={onOpenProfile}>
                <YStack width={56} height={56} borderWidth={2} borderColor={solarpunk.accentGreen} overflow='hidden' style={styles.avatarOrganic}>
                    {item.creatorAvatar ? (
                        <Image source={{ uri: item.creatorAvatar }} width='100%' height='100%' />
                    ) : (
                        <YStack flex={1} justifyContent='center' alignItems='center' bg={solarpunk.panel}>
                            <Text color={solarpunk.white}>{item.creatorName.slice(0, 1).toUpperCase()}</Text>
                        </YStack>
                    )}
                </YStack>
            </Pressable>

            <Pressable onPress={handleLike}>
                <YStack alignItems='center' gap='$1'>
                    <Animated.View style={heartStyle}>
                        <Circle size={42} bg='rgba(0,0,0,0.45)'>
                            <Text color={solarpunk.accentGold} fontSize={18}>
                                ♥
                            </Text>
                        </Circle>
                    </Animated.View>
                    <Text color={solarpunk.white} fontSize={12}>
                        {item.likeCount}
                    </Text>
                </YStack>
            </Pressable>

            <Pressable onPress={onOpenComments}>
                <YStack alignItems='center' gap='$1'>
                    <Circle size={42} bg='rgba(0,0,0,0.45)'>
                        <Text color={solarpunk.white} fontSize={18}>
                            💬
                        </Text>
                    </Circle>
                    <Text color={solarpunk.white} fontSize={12}>
                        {item.commentCount}
                    </Text>
                </YStack>
            </Pressable>

            <Pressable onPress={onShare} onLongPress={onShare} delayLongPress={350}>
                <Circle size={42} bg='rgba(0,0,0,0.45)'>
                    <Text color={solarpunk.white} fontSize={18}>
                        ↗
                    </Text>
                </Circle>
            </Pressable>

            <Pressable onPress={onNavigateToMap}>
                <Circle size={42} bg='rgba(0,0,0,0.45)'>
                    <Text color={solarpunk.accentGreen} fontSize={18}>
                        📍
                    </Text>
                </Circle>
            </Pressable>
        </YStack>
    );
};

export const VerticalVideoFeed = ({ gatewayBaseUrl, height = SCREEN_HEIGHT, onOpenProfile, onNavigateToMap, onOpenChatPanel, onShare }: VerticalVideoFeedProps) => {
    const [items, setItems] = useState<FeedItem[]>([]);
    const [activeIndex, setActiveIndex] = useState(0);
    const [expandedCaptionId, setExpandedCaptionId] = useState<string | null>(null);
    const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
    const [chatItem, setChatItem] = useState<FeedItem | null>(null);
    const lastTap = useRef<{ id: string; at: number } | null>(null);
    const burstScale = useSharedValue(0);

    const burstStyle = useAnimatedStyle(() => ({
        transform: [{ scale: burstScale.value }],
        opacity: burstScale.value === 0 ? 0 : 1,
    }));

    const endpoint = useMemo(() => {
        const base = gatewayBaseUrl || Config.BLACKOUT_GATEWAY_URL || '';
        return `${String(base).replace(/\/$/, '')}/api/v1/feed`;
    }, [gatewayBaseUrl]);

    useEffect(() => {
        (async () => {
            try {
                const response = await fetch(endpoint);
                const payload = await response.json();
                const events = (payload?.videos ?? payload?.events ?? []) as FeedEvent[];
                setItems(events.filter((e) => Boolean(e?.content?.url)).map(toFeedItem));
            } catch (error) {
                console.warn('Unable to fetch video feed:', error);
            }
        })();
    }, [endpoint]);

    const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
        const top = viewableItems[0];
        if (top?.index != null) {
            setActiveIndex(top.index);
        }
    }).current;

    const viewabilityConfig = useMemo(
        () => ({
            itemVisiblePercentThreshold: 70,
        }),
        []
    );

    const likeItem = useCallback((item: FeedItem) => {
        setLikedIds((prev) => new Set(prev).add(item.id));
    }, []);

    const triggerBurst = useCallback(() => {
        burstScale.value = withSequence(withTiming(1.25, { duration: 180, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: 220, easing: Easing.in(Easing.quad) }));
    }, [burstScale]);

    const handleDoubleTapLike = useCallback(
        (item: FeedItem) => (e: GestureResponderEvent) => {
            const now = Date.now();
            if (lastTap.current?.id === item.id && now - lastTap.current.at < DOUBLE_TAP_WINDOW_MS) {
                likeItem(item);
                triggerBurst();
                lastTap.current = null;
                return;
            }

            lastTap.current = { id: item.id, at: now };
        },
        [likeItem, triggerBurst]
    );

    const renderItem = ({ item, index }: { item: FeedItem; index: number }) => {
        const isActive = index === activeIndex;
        const isExpanded = expandedCaptionId === item.id;

        return (
            <Pressable onPress={handleDoubleTapLike(item)} onLongPress={() => (onShare ? onShare(item) : Share.share({ message: item.videoUrl }))} style={{ width: SCREEN_WIDTH, height }}>
                <YStack width='100%' height='100%' bg={solarpunk.bg}>
                    <Video
                        source={{ uri: item.videoUrl }}
                        style={StyleSheet.absoluteFill}
                        paused={!isActive}
                        repeat
                        resizeMode='cover'
                        playInBackground={false}
                        playWhenInactive={false}
                        controls={false}
                    />

                    <Animated.View pointerEvents='none' style={[styles.burstHeart, burstStyle]}>
                        <Text color={solarpunk.accentGold} fontSize={72}>
                            ♥
                        </Text>
                    </Animated.View>

                    <RightSidebar
                        item={item}
                        onOpenProfile={() => onOpenProfile?.(item)}
                        onLike={() => likeItem(item)}
                        onOpenComments={() => {
                            if (onOpenChatPanel) {
                                onOpenChatPanel(item);
                            } else {
                                setChatItem(item);
                            }
                        }}
                        onShare={() => (onShare ? onShare(item) : Share.share({ message: item.videoUrl }))}
                        onNavigateToMap={() => onNavigateToMap?.(item)}
                    />

                    <YStack position='absolute' left={12} right={76} bottom={24} bg={solarpunk.panel} borderRadius={22} p='$3' gap='$2'>
                        <XStack alignItems='center' gap='$2'>
                            <Text color={solarpunk.white} fontWeight='800'>
                                {item.creatorName}
                            </Text>
                            <Text color={solarpunk.accentGreen}>@{item.creatorHandle}</Text>
                        </XStack>

                        <Pressable onPress={() => setExpandedCaptionId((prev) => (prev === item.id ? null : item.id))}>
                            <Paragraph color={solarpunk.white} numberOfLines={isExpanded ? undefined : 3}>
                                {item.caption}
                            </Paragraph>
                        </Pressable>

                        <XStack alignSelf='flex-start' px='$2' py='$1' borderRadius={999} bg='rgba(35,193,107,0.2)' borderWidth={1} borderColor={solarpunk.accentGreen}>
                            <Text color={solarpunk.accentGreen} fontSize={12}>
                                Blackout Room · {item.roomId}
                            </Text>
                        </XStack>
                    </YStack>

                    <YStack position='absolute' right={4} top='36%' gap={6}>
                        {items.map((_, dotIndex) => (
                            <YStack
                                key={dotIndex}
                                width={4}
                                height={dotIndex === activeIndex ? 26 : 10}
                                borderRadius={999}
                                bg={dotIndex === activeIndex ? solarpunk.accentGold : 'rgba(255,255,255,0.35)'}
                            />
                        ))}
                    </YStack>
                </YStack>
            </Pressable>
        );
    };

    return (
        <YStack width='100%' height={height} bg={solarpunk.bg}>
            <FlatList
                data={items}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                pagingEnabled
                snapToInterval={height}
                decelerationRate='fast'
                showsVerticalScrollIndicator={false}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
            />

            {chatItem ? (
                <YStack position='absolute' left={12} right={12} bottom={12} p='$3' borderRadius={20} bg='rgba(8,18,15,0.92)' borderWidth={1} borderColor={solarpunk.accentGreen}>
                    <Text color={solarpunk.white} fontWeight='700'>
                        ChatPanel
                    </Text>
                    <Text color={solarpunk.dim}>Open comments for room: {chatItem.roomId}</Text>
                    <Pressable onPress={() => setChatItem(null)}>
                        <Text color={solarpunk.accentGold} mt='$2'>
                            Close
                        </Text>
                    </Pressable>
                </YStack>
            ) : null}
        </YStack>
    );
};

const styles = StyleSheet.create({
    avatarOrganic: {
        borderTopLeftRadius: 21,
        borderTopRightRadius: 35,
        borderBottomLeftRadius: 33,
        borderBottomRightRadius: 17,
    },
    burstHeart: {
        position: 'absolute',
        top: '42%',
        left: '45%',
    },
});

export default VerticalVideoFeed;
