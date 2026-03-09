import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, GestureResponderEvent, Pressable, Share, StyleSheet, ViewToken } from 'react-native';
import Video from 'react-native-video';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import Config from 'react-native-config';
import { Button, Circle, Image, Paragraph, Text, XStack, YStack } from 'tamagui';
import ChatPanel from './ChatPanel';
import { createFeedRequestUrl, CtaModule, FeedEvent, FeedItem, FeedRequestParams, handleCommentAction, injectCtaCards, RenderFeedItem, toFeedItem } from './vertical-feed-utils';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

type VerticalVideoFeedProps = {
    gatewayBaseUrl?: string;
    height?: number;
    requestParams?: FeedRequestParams;
    ctaInterval?: number;
    onOpenProfile?: (item: FeedItem) => void;
    onNavigateToMap?: (item: FeedItem) => void;
    onOpenChatPanel?: (item: FeedItem) => void;
    onMissingRoom?: (item: FeedItem) => void;
    onOpenCta?: (module: CtaModule) => void;
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

const RightSidebar = ({ item, onOpenProfile, onLike, onOpenComments, onShare, onNavigateToMap }: { item: FeedItem; onOpenProfile: () => void; onLike: () => void; onOpenComments: () => void; onShare: () => void; onNavigateToMap: () => void }) => {
    const heartScale = useSharedValue(1);
    const heartStyle = useAnimatedStyle(() => ({ transform: [{ scale: heartScale.value }] }));

    const handleLike = () => {
        heartScale.value = withSequence(withTiming(1.3, { duration: HEART_ANIMATION_MS / 2 }), withTiming(1, { duration: HEART_ANIMATION_MS / 2 }));
        onLike();
    };

    return (
        <YStack position='absolute' right={12} bottom={120} gap='$3' alignItems='center'>
            <Pressable onPress={onOpenProfile}>
                <YStack width={56} height={56} borderWidth={2} borderColor={solarpunk.accentGreen} overflow='hidden' style={styles.avatarOrganic}>
                    {item.creatorAvatar ? <Image source={{ uri: item.creatorAvatar }} width='100%' height='100%' /> : <YStack flex={1} justifyContent='center' alignItems='center' bg={solarpunk.panel}><Text color={solarpunk.white}>{item.creatorName.slice(0, 1).toUpperCase()}</Text></YStack>}
                </YStack>
            </Pressable>

            <Pressable onPress={handleLike}><YStack alignItems='center' gap='$1'><Animated.View style={heartStyle}><Circle size={42} bg='rgba(0,0,0,0.45)'><Text color={solarpunk.accentGold} fontSize={18}>♥</Text></Circle></Animated.View><Text color={solarpunk.white} fontSize={12}>{item.likeCount}</Text></YStack></Pressable>
            <Pressable onPress={onOpenComments}><YStack alignItems='center' gap='$1'><Circle size={42} bg='rgba(0,0,0,0.45)'><Text color={solarpunk.white} fontSize={18}>💬</Text></Circle><Text color={solarpunk.white} fontSize={12}>{item.commentCount}</Text></YStack></Pressable>
            <Pressable onPress={onShare} onLongPress={onShare} delayLongPress={350}><Circle size={42} bg='rgba(0,0,0,0.45)'><Text color={solarpunk.white} fontSize={18}>↗</Text></Circle></Pressable>
            <Pressable onPress={onNavigateToMap}><Circle size={42} bg='rgba(0,0,0,0.45)'><Text color={solarpunk.accentGreen} fontSize={18}>📍</Text></Circle></Pressable>
        </YStack>
    );
};

const CtaCard = ({ item, height, onOpenCta }: { item: RenderFeedItem; height: number; onOpenCta?: (module: CtaModule) => void }) => {
    if (item.type !== 'cta') return null;
    return (
        <YStack width={SCREEN_WIDTH} height={height} justifyContent='center' alignItems='center' px='$5' bg={solarpunk.bg}>
            <YStack width='100%' bg='rgba(35,193,107,0.12)' borderWidth={1} borderColor={solarpunk.accentGreen} p='$4' borderRadius={18} gap='$2'>
                <Text color={solarpunk.accentGold} fontSize={22} fontWeight='700'>{item.title}</Text>
                <Paragraph color={solarpunk.white}>{item.description}</Paragraph>
                <Button mt='$2' onPress={() => onOpenCta?.(item.module)}>Open</Button>
            </YStack>
        </YStack>
    );
};

export const VerticalVideoFeed = ({ gatewayBaseUrl, height = SCREEN_HEIGHT, requestParams, ctaInterval = 4, onOpenProfile, onNavigateToMap, onOpenChatPanel, onMissingRoom, onOpenCta, onShare }: VerticalVideoFeedProps) => {
    const [items, setItems] = useState<FeedItem[]>([]);
    const [activeIndex, setActiveIndex] = useState(0);
    const [expandedCaptionId, setExpandedCaptionId] = useState<string | null>(null);
    const [chatItem, setChatItem] = useState<FeedItem | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const lastTap = useRef<{ id: string; at: number } | null>(null);
    const burstScale = useSharedValue(0);

    const burstStyle = useAnimatedStyle(() => ({ transform: [{ scale: burstScale.value }], opacity: burstScale.value === 0 ? 0 : 1 }));
    const endpoint = useMemo(() => {
        const base = gatewayBaseUrl || Config.BLACKOUT_GATEWAY_URL || '';
        return `${String(base).replace(/\/$/, '')}/api/v1/feed`;
    }, [gatewayBaseUrl]);

    const requestUrl = useMemo(() => createFeedRequestUrl(endpoint, requestParams), [endpoint, requestParams]);

    const loadFeed = useCallback(async () => {
        setIsLoading(true);
        setErrorMessage(null);
        try {
            const response = await fetch(requestUrl);
            if (!response.ok) throw new Error(`Feed request failed (${response.status})`);
            const payload = await response.json();
            const events = (payload?.videos ?? payload?.events ?? []) as FeedEvent[];
            setItems(events.filter((event) => Boolean(event?.content?.url)).map(toFeedItem));
        } catch (error) {
            setErrorMessage('Unable to load feed right now.');
            console.warn('Unable to fetch video feed:', error);
        } finally {
            setIsLoading(false);
        }
    }, [requestUrl]);

    useEffect(() => {
        loadFeed();
    }, [loadFeed]);

    const renderItems = useMemo(() => injectCtaCards(items, ctaInterval), [items, ctaInterval]);

    const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
        const top = viewableItems[0];
        if (top?.index != null) setActiveIndex(top.index);
    }).current;

    const viewabilityConfig = useMemo(() => ({ itemVisiblePercentThreshold: 70 }), []);

    const triggerBurst = useCallback(() => {
        burstScale.value = withSequence(withTiming(1.25, { duration: 180, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: 220, easing: Easing.in(Easing.quad) }));
    }, [burstScale]);

    const handleDoubleTapLike = useCallback((item: FeedItem) => (_e: GestureResponderEvent) => {
        const now = Date.now();
        if (lastTap.current?.id === item.id && now - lastTap.current.at < DOUBLE_TAP_WINDOW_MS) {
            triggerBurst();
            lastTap.current = null;
            return;
        }
        lastTap.current = { id: item.id, at: now };
    }, [triggerBurst]);

    const renderItem = ({ item, index }: { item: RenderFeedItem; index: number }) => {
        if (item.type === 'cta') {
            return <CtaCard item={item} height={height} onOpenCta={onOpenCta} />;
        }

        const feedItem = item.item;
        const isActive = index === activeIndex;
        const isExpanded = expandedCaptionId === feedItem.id;

        return (
            <Pressable onPress={handleDoubleTapLike(feedItem)} onLongPress={() => (onShare ? onShare(feedItem) : Share.share({ message: feedItem.videoUrl }))} style={{ width: SCREEN_WIDTH, height }}>
                <YStack width='100%' height='100%' bg={solarpunk.bg}>
                    <Video source={{ uri: feedItem.videoUrl }} style={StyleSheet.absoluteFill} paused={!isActive} repeat resizeMode='cover' playInBackground={false} playWhenInactive={false} controls={false} />
                    <Animated.View pointerEvents='none' style={[styles.burstHeart, burstStyle]}><Text color={solarpunk.accentGold} fontSize={72}>♥</Text></Animated.View>

                    <RightSidebar
                        item={feedItem}
                        onOpenProfile={() => onOpenProfile?.(feedItem)}
                        onLike={triggerBurst}
                        onOpenComments={() => handleCommentAction(feedItem, { onOpenChatPanel, setChatItem, onMissingRoom })}
                        onShare={() => (onShare ? onShare(feedItem) : Share.share({ message: feedItem.videoUrl }))}
                        onNavigateToMap={() => onNavigateToMap?.(feedItem)}
                    />

                    <YStack position='absolute' left={12} right={76} bottom={24} bg={solarpunk.panel} borderRadius={22} p='$3' gap='$2'>
                        <XStack alignItems='center' gap='$2'><Text color={solarpunk.white} fontWeight='800'>{feedItem.creatorName}</Text><Text color={solarpunk.accentGreen}>@{feedItem.creatorHandle}</Text></XStack>
                        <Pressable onPress={() => setExpandedCaptionId((prev) => (prev === feedItem.id ? null : feedItem.id))}><Paragraph color={solarpunk.white} numberOfLines={isExpanded ? undefined : 3}>{feedItem.caption}</Paragraph></Pressable>
                        <XStack alignSelf='flex-start' px='$2' py='$1' borderRadius={999} bg='rgba(35,193,107,0.2)' borderWidth={1} borderColor={solarpunk.accentGreen}><Text color={solarpunk.accentGreen} fontSize={12}>Blackout Room · {feedItem.roomId}</Text></XStack>
                    </YStack>
                </YStack>
            </Pressable>
        );
    };

    if (isLoading) {
        return <YStack width='100%' height={height} justifyContent='center' alignItems='center' bg={solarpunk.bg}><ActivityIndicator color={solarpunk.accentGreen} /><Text mt='$3' color={solarpunk.dim}>Loading feed…</Text></YStack>;
    }

    if (errorMessage) {
        return <YStack width='100%' height={height} justifyContent='center' alignItems='center' px='$5' bg={solarpunk.bg} gap='$3'><Text color={solarpunk.white}>{errorMessage}</Text><Button onPress={loadFeed}>Retry</Button></YStack>;
    }

    if (renderItems.length === 0) {
        return <YStack width='100%' height={height} justifyContent='center' alignItems='center' px='$5' bg={solarpunk.bg} gap='$3'><Text color={solarpunk.white}>No videos yet. Check back soon.</Text><Button onPress={loadFeed}>Refresh</Button></YStack>;
    }

    return (
        <YStack width='100%' height={height} bg={solarpunk.bg}>
            <FlatList
                data={renderItems}
                keyExtractor={(item) => (item.type === 'cta' ? item.id : item.item.id)}
                renderItem={renderItem}
                pagingEnabled
                snapToInterval={height}
                decelerationRate='fast'
                showsVerticalScrollIndicator={false}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                removeClippedSubviews
                maxToRenderPerBatch={3}
                initialNumToRender={2}
                windowSize={5}
                getItemLayout={(_, index) => ({ length: height, offset: height * index, index })}
            />
            {chatItem ? <ChatPanel roomId={chatItem.roomId} visible mode='overlay' onClose={() => setChatItem(null)} /> : null}
        </YStack>
    );
};

const styles = StyleSheet.create({
    avatarOrganic: { borderTopLeftRadius: 21, borderTopRightRadius: 35, borderBottomLeftRadius: 33, borderBottomRightRadius: 17 },
    burstHeart: { position: 'absolute', top: '42%', left: '45%' },
});

export default VerticalVideoFeed;
