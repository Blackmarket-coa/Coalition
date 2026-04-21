import React, { useMemo } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Button, Paragraph, Text, XStack, YStack } from 'tamagui';

export type PostTypeId = 'offering' | 'digital' | 'mutual_aid' | 'job' | 'proposal' | 'campaign' | 'video' | 'map_event';

export type PostTypeCard = {
    id: PostTypeId;
    title: string;
    description: string;
    icon: string;
    color: string;
    providerOnly: boolean;
    route: string;
};

const POST_TYPES: PostTypeCard[] = [
    { id: 'offering', title: 'List an Offering', description: 'Products or services in your local economy.', icon: '✶', color: '#22c55e', providerOnly: true, route: 'OfferingComposer' },
    { id: 'digital', title: 'List a Digital Product', description: 'Plugins, emoji packs, memes, software, and other downloads.', icon: '◆', color: '#8b5cf6', providerOnly: true, route: 'DigitalOfferingComposer' },
    { id: 'mutual_aid', title: 'Mutual Aid', description: 'Post a need or offer support nearby.', icon: '✳', color: '#06b6d4', providerOnly: false, route: 'AidPostCreator' },
    { id: 'job', title: 'Post a Job', description: 'Create a shipment board listing.', icon: '⬡', color: '#f59e0b', providerOnly: true, route: 'ShipmentBoardListingCreator' },
    { id: 'proposal', title: 'Start a Proposal', description: 'Launch governance discussion + voting.', icon: '◉', color: '#a855f7', providerOnly: false, route: 'ProposalComposer' },
    { id: 'campaign', title: 'Launch a Campaign', description: 'Organize a collective funding campaign.', icon: '⟡', color: '#84cc16', providerOnly: true, route: 'CollectiveCampaignCreator' },
    { id: 'video', title: 'Share a Video', description: 'Upload a short video to Matrix media.', icon: '▶', color: '#ef4444', providerOnly: false, route: 'VideoUploadFlow' },
    { id: 'map_event', title: 'Community Alert/Event', description: 'Publish map-based alerts and neighborhood events.', icon: '📍', color: '#0ea5e9', providerOnly: false, route: 'CreateMapEvent' },
];

type PostTabProps = {
    isProvider: boolean;
    onSelect: (card: PostTypeCard) => void;
    onUpsellPress: () => void;
};

const PostTile = ({ card, index, canAccess, onSelect }: { card: PostTypeCard; index: number; canAccess: boolean; onSelect: (card: PostTypeCard) => void }) => {
    const scale = useSharedValue(1);
    const glow = useSharedValue(0);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        shadowOpacity: glow.value,
        shadowRadius: 18,
    }));

    return (
        <Animated.View entering={FadeInDown.delay(index * 70).duration(320)} style={{ width: '48%' }}>
            <Pressable
                onPressIn={() => {
                    scale.value = withSpring(0.97);
                    glow.value = withSpring(0.32);
                }}
                onPressOut={() => {
                    scale.value = withSpring(1);
                    glow.value = withSpring(0.12);
                }}
                onPress={() => onSelect(card)}
            >
                <Animated.View style={[styles.tile, animatedStyle, { borderColor: `${card.color}aa`, backgroundColor: `${card.color}20`, shadowColor: card.color }]}>
                    <XStack justifyContent='space-between' alignItems='center'>
                        <Text fontSize={24}>{card.icon}</Text>
                        {card.providerOnly ? (
                            <YStack px='$2' py='$1' borderRadius={999} bg='rgba(255,255,255,0.12)'>
                                <Text fontSize={10} color='#e6f5ea' fontWeight='700'>
                                    Provider
                                </Text>
                            </YStack>
                        ) : null}
                    </XStack>
                    <Text mt='$2' fontWeight='800' color='#f4fff5'>
                        {card.title}
                    </Text>
                    <Paragraph mt='$1' color='#b8cebc' fontSize={12}>
                        {card.description}
                    </Paragraph>
                    {!canAccess && card.providerOnly ? (
                        <Text mt='$2' color='#facc15' fontSize={11}>
                            Tap to unlock
                        </Text>
                    ) : null}
                </Animated.View>
            </Pressable>
        </Animated.View>
    );
};

const PostTab = ({ isProvider, onSelect, onUpsellPress }: PostTabProps) => {
    const communityCards = useMemo(() => POST_TYPES.filter((card) => !card.providerOnly), []);
    const providerCards = useMemo(() => POST_TYPES.filter((card) => card.providerOnly), []);
    const visibleCards = isProvider ? POST_TYPES : communityCards;

    return (
        <YStack flex={1} bg='#08120d' p='$4'>
            <Text color='#f3fff5' fontSize='$8' fontWeight='800'>
                Create Post
            </Text>
            <Paragraph color='#9bb5a2' mt='$2' mb='$4'>
                Choose what you want to share with your community.
            </Paragraph>

            <XStack flexWrap='wrap' justifyContent='space-between' rowGap='$3'>
                {visibleCards.map((card, index) => (
                    <PostTile key={card.id} card={card} index={index} canAccess={!card.providerOnly || isProvider} onSelect={onSelect} />
                ))}
            </XStack>

            {!isProvider ? (
                <YStack mt='$4' gap='$2'>
                    <Text color='#9bb5a2' fontWeight='700'>Provider tools</Text>
                    <XStack flexWrap='wrap' justifyContent='space-between' rowGap='$3'>
                        {providerCards.map((card, index) => (
                            <PostTile key={card.id} card={card} index={index + communityCards.length} canAccess={false} onSelect={onSelect} />
                        ))}
                    </XStack>
                    <YStack mt='$1' p='$3' borderRadius={26} bg='rgba(34,197,94,0.16)' borderWidth={1} borderColor='rgba(34,197,94,0.48)'>
                    <Text color='#d8fbe2' fontWeight='700'>
                        Create a provider profile to list offerings
                    </Text>
                    <Button mt='$2' bg='#22c55e' onPress={onUpsellPress}>
                        <Button.Text color='#062510'>Become a Provider</Button.Text>
                    </Button>
                    </YStack>
                </YStack>
            ) : null}
        </YStack>
    );
};

const styles = StyleSheet.create({
    tile: {
        minHeight: 146,
        borderWidth: 1,
        borderTopLeftRadius: 22,
        borderTopRightRadius: 34,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 18,
        padding: 12,
        shadowOffset: { width: 0, height: 6 },
    },
});

export default PostTab;
export { POST_TYPES };
