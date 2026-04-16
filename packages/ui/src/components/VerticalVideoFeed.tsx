import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, GestureResponderEvent, Pressable, Share, StyleSheet, ViewToken } from 'react-native';
import Video from 'react-native-video';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import Config from 'react-native-config';
import { Button, Circle, Image, Paragraph, Text, XStack, YStack } from 'tamagui';
import ChatPanel from './ChatPanel';
import {
    createFeedRequestUrl,
    CtaModule,
    FeedEvent,
    FeedItem,
    FeedRequestParams,
    FeedTimelineFilter,
    filterVisibleFeedItems,
    getTrustSignal,
    handleCommentAction,
    injectCtaCards,
    isFeedItemInTimeline,
    RenderFeedItem,
    toFeedItem,
} from './vertical-feed-utils';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

type VerticalVideoFeedProps = {
    gatewayBaseUrl?: string;
    height?: number;
    requestParams?: FeedRequestParams;
    ctaInterval?: number;
    initialFocusItemId?: string;
    onOpenProfile?: (item: FeedItem) => void;
    onNavigateToMap?: (item: FeedItem) => void;
    onOpenFeedItem?: (item: FeedItem) => void;
    onVisibleItem?: (item: FeedItem) => void;
    onOpenChatPanel?: (item: FeedItem) => void;
    onMissingRoom?: (item: FeedItem) => void;
    onOpenCta?: (module: CtaModule) => void;
    onShare?: (item: FeedItem) => void;
    onTakeAction?: (item: FeedItem) => void;
    onReport?: (item: FeedItem) => void;
    onRateImportance?: (item: FeedItem, rating: number) => void;
    onRateImpact?: (item: FeedItem, rating: number) => void;
    onErrorCategory?: (message: string, context?: Record<string, any>) => void;
    onPerformanceSample?: (sample: { mediaStartLatencyMs: number; scrollFrameDrops: number }) => void;
};

const TIMELINE_FILTERS: { label: string; value: FeedTimelineFilter }[] = [
    { label: 'Upcoming', value: 'upcoming' },
    { label: 'Happening Now', value: 'live' },
    { label: 'Past', value: 'past' },
];

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
const MIN_RATING = 1;
const MAX_RATING = 5;

const clampRating = (value: number) => Math.max(MIN_RATING, Math.min(MAX_RATING, Math.round(value)));

const RatingRail = ({ label, aggregate, count, selected, onRate }: { label: string; aggregate: number; count: number; selected?: number; onRate: (rating: number) => void }) => (
    <YStack alignItems='center' gap='$1'>
        <Text color={solarpunk.dim} fontSize={10}>{label}</Text>
        <XStack gap='$1'>
            {[1, 2, 3, 4, 5].map((value) => {
                const isSelected = value <= (selected ?? 0);
                return (
                    <Pressable key={`${label}-${value}`} onPress={() => onRate(value)} hitSlop={4}>
                        <Circle size={12} bg={isSelected ? solarpunk.accentGreen : 'rgba(255,255,255,0.26)'} />
                    </Pressable>
                );
            })}
        </XStack>
        <Text color={solarpunk.white} fontSize={10}>{aggregate.toFixed(1)} · {count}</Text>
    </YStack>
);

const RightSidebar = ({
    item,
    onOpenProfile,
    onLike,
    onOpenComments,
    onShare,
    onNavigateToMap,
    onRateImportance,
    onRateImpact,
    userImportanceRating,
    userImpactRating,
}: {
    item: FeedItem;
    onOpenProfile: () => void;
    onLike: () => void;
    onOpenComments: () => void;
    onShare: () => void;
    onNavigateToMap: () => void;
    onRateImportance: (rating: number) => void;
    onRateImpact: (rating: number) => void;
    userImportanceRating?: number;
    userImpactRating?: number;
}) => {
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
            <RatingRail label='Importance' aggregate={item.importanceAvg} count={item.ratingsCount} selected={userImportanceRating} onRate={onRateImportance} />
            <RatingRail label='Impact' aggregate={item.impactAvg} count={item.ratingsCount} selected={userImpactRating} onRate={onRateImpact} />
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

const EventCard = ({ item, height, onOpen }: { item: FeedItem; height: number; onOpen: (item: FeedItem) => void }) => (
    <Pressable onPress={() => onOpen(item)} style={{ width: SCREEN_WIDTH, height }}>
        <YStack width='100%' height='100%' justifyContent='center' px='$5' bg={solarpunk.bg}>
            <YStack width='100%' bg='rgba(35,193,107,0.12)' borderWidth={1} borderColor={solarpunk.accentGreen} p='$4' borderRadius={18} gap='$2'>
                <Text color={solarpunk.accentGold} fontSize={22} fontWeight='700'>{item.eventType ?? 'Community Event'}</Text>
                <Paragraph color={solarpunk.white}>{item.caption || 'Informational update from your community.'}</Paragraph>
                <Text color={solarpunk.dim} fontSize={12}>Status: {item.status ?? 'upcoming'}</Text>
                {typeof item.distance === 'number' ? <Text color={solarpunk.dim} fontSize={12}>Distance: {item.distance.toFixed(1)} mi</Text> : null}
                {typeof item.latitude === 'number' && typeof item.longitude === 'number' ? (
                    <Text color={solarpunk.dim} fontSize={12}>Map: {item.latitude.toFixed(5)}, {item.longitude.toFixed(5)}</Text>
                ) : null}
                <Button mt='$2' onPress={() => onOpen(item)}>Open on Explore Map</Button>
            </YStack>
        </YStack>
    </Pressable>
);

export const VerticalVideoFeed = ({ gatewayBaseUrl, height = SCREEN_HEIGHT, requestParams, ctaInterval = 4, initialFocusItemId, onOpenProfile, onNavigateToMap, onOpenFeedItem, onVisibleItem, onOpenChatPanel, onMissingRoom, onOpenCta, onShare, onTakeAction, onReport, onRateImportance, onRateImpact, onErrorCategory, onPerformanceSample }: VerticalVideoFeedProps) => {
    const [items, setItems] = useState<FeedItem[]>([]);
    const [activeIndex, setActiveIndex] = useState(0);
    const [timelineFilter, setTimelineFilter] = useState<FeedTimelineFilter>('live');
    const [expandedCaptionId, setExpandedCaptionId] = useState<string | null>(null);
    const [chatItem, setChatItem] = useState<FeedItem | null>(null);
    const [userRatings, setUserRatings] = useState<Record<string, { importance?: number; impact?: number }>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const lastTap = useRef<{ id: string; at: number } | null>(null);
    const fetchStartedAtRef = useRef(Date.now());
    const listRef = useRef<FlatList<RenderFeedItem> | null>(null);
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
            fetchStartedAtRef.current = Date.now();
            const response = await fetch(requestUrl);
            if (!response.ok) throw new Error(`Feed request failed (${response.status})`);
            const payload = await response.json();
            const events = (payload?.videos ?? payload?.events ?? []) as FeedEvent[];
            const nextItems = events.map(toFeedItem);
            setItems(filterVisibleFeedItems(nextItems));
            onPerformanceSample?.({ mediaStartLatencyMs: Date.now() - fetchStartedAtRef.current, scrollFrameDrops: 0 });
        } catch (error) {
            setErrorMessage('Unable to load feed right now.');
            onErrorCategory?.('Unable to fetch video feed', { error: String(error) });
            console.warn('Unable to fetch video feed:', error);
        } finally {
            setIsLoading(false);
        }
    }, [requestUrl, onPerformanceSample, onErrorCategory]);

    useEffect(() => {
        loadFeed();
    }, [loadFeed]);

    const timelineItems = useMemo(() => items.filter((item) => isFeedItemInTimeline(item, timelineFilter)), [items, timelineFilter]);
    const renderItems = useMemo(() => injectCtaCards(timelineItems, ctaInterval), [timelineItems, ctaInterval]);

    const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
        const top = viewableItems[0];
        if (top?.index != null) setActiveIndex(top.index);
        const topItem = top?.item as RenderFeedItem | undefined;
        if (topItem?.type === 'video') {
            onVisibleItem?.(topItem.item);
        }
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

    useEffect(() => {
        if (!initialFocusItemId || renderItems.length === 0) return;
        const targetIndex = renderItems.findIndex((entry) => entry.type === 'video' && (entry.item.id === initialFocusItemId || entry.item.roomId === initialFocusItemId));
        if (targetIndex >= 0) {
            listRef.current?.scrollToIndex({ index: targetIndex, animated: true });
        }
    }, [initialFocusItemId, renderItems]);

    const renderItem = ({ item, index }: { item: RenderFeedItem; index: number }) => {
        if (item.type === 'cta') {
            return <CtaCard item={item} height={height} onOpenCta={onOpenCta} />;
        }

        const feedItem = item.item;
        if (feedItem.kind === 'event') {
            return <EventCard item={feedItem} height={height} onOpen={(openedItem) => onOpenFeedItem?.(openedItem)} />;
        }

        const isActive = index === activeIndex;
        const isExpanded = expandedCaptionId === feedItem.id;
        const myRatings = userRatings[feedItem.id];

        return (
            <Pressable onPress={handleDoubleTapLike(feedItem)} onLongPress={() => (onShare ? onShare(feedItem) : Share.share({ message: feedItem.videoUrl ?? '' }))} style={{ width: SCREEN_WIDTH, height }}>
                <YStack width='100%' height='100%' bg={solarpunk.bg}>
                    <Video source={{ uri: feedItem.videoUrl ?? '' }} style={StyleSheet.absoluteFill} paused={!isActive} repeat resizeMode='cover' playInBackground={false} playWhenInactive={false} controls={false} />
                    <Animated.View pointerEvents='none' style={[styles.burstHeart, burstStyle]}><Text color={solarpunk.accentGold} fontSize={72}>♥</Text></Animated.View>

                    <RightSidebar
                        item={feedItem}
                        onOpenProfile={() => onOpenProfile?.(feedItem)}
                        onLike={triggerBurst}
                        onOpenComments={() => handleCommentAction(feedItem, { onOpenChatPanel, setChatItem, onMissingRoom })}
                        onShare={() => (onShare ? onShare(feedItem) : Share.share({ message: feedItem.videoUrl ?? '' }))}
                        onNavigateToMap={() => {
                            onNavigateToMap?.(feedItem);
                            onOpenFeedItem?.(feedItem);
                        }}
                        onRateImportance={(rating) => {
                            const bounded = clampRating(rating);
                            setUserRatings((prev) => ({ ...prev, [feedItem.id]: { ...prev[feedItem.id], importance: bounded } }));
                            onRateImportance?.(feedItem, bounded);
                        }}
                        onRateImpact={(rating) => {
                            const bounded = clampRating(rating);
                            setUserRatings((prev) => ({ ...prev, [feedItem.id]: { ...prev[feedItem.id], impact: bounded } }));
                            onRateImpact?.(feedItem, bounded);
                        }}
                        userImportanceRating={myRatings?.importance}
                        userImpactRating={myRatings?.impact}
                    />

                    <YStack position='absolute' left={12} right={76} bottom={24} bg={solarpunk.panel} borderRadius={22} p='$3' gap='$2'>
                        <XStack alignItems='center' gap='$2'><Text color={solarpunk.white} fontWeight='800'>{feedItem.creatorName}</Text><Text color={solarpunk.accentGreen}>@{feedItem.creatorHandle}</Text></XStack>
                        <Pressable onPress={() => setExpandedCaptionId((prev) => (prev === feedItem.id ? null : feedItem.id))}><Paragraph color={solarpunk.white} numberOfLines={isExpanded ? undefined : 3}>{feedItem.caption}</Paragraph></Pressable>
                        <XStack alignSelf='flex-start' px='$2' py='$1' borderRadius={999} bg='rgba(35,193,107,0.2)' borderWidth={1} borderColor={solarpunk.accentGreen}><Text color={solarpunk.accentGreen} fontSize={12}>Blackout Room · {feedItem.roomId}</Text></XStack>
                        <XStack alignItems='center' justifyContent='space-between'>
                            <Text color={solarpunk.dim} fontSize={12}>{getTrustSignal(feedItem)} · {feedItem.reportCount} reports</Text>
                            <Pressable onPress={() => onReport?.(feedItem)}><Text color={solarpunk.accentGold} fontSize={12}>Report</Text></Pressable>
                        </XStack>
                        <Button size='$3' onPress={() => onTakeAction?.(feedItem)}>Take Action</Button>
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
        return <YStack width='100%' height={height} justifyContent='center' alignItems='center' px='$5' bg={solarpunk.bg} gap='$3'><Text color={solarpunk.white}>No feed items yet. Check back soon.</Text><Button onPress={loadFeed}>Refresh</Button></YStack>;
    }

    return (
        <YStack width='100%' height={height} bg={solarpunk.bg}>
            <XStack px='$3' py='$2' gap='$2' justifyContent='center'>
                {TIMELINE_FILTERS.map((filter) => (
                    <Button key={filter.value} size='$3' variant={timelineFilter === filter.value ? undefined : 'outlined'} onPress={() => setTimelineFilter(filter.value)}>
                        {filter.label}
                    </Button>
                ))}
            </XStack>
            <FlatList
                ref={listRef}
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
