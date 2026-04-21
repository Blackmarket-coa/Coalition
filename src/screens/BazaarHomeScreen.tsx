import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView } from 'react-native';
import { Button, Text, XStack, YStack } from 'tamagui';
import { useAuth } from '../contexts/AuthContext';
import { isCoalitionBazaarEnabled } from '../services/feature-flags';
import {
    fetchBazaarCatalog,
    reportBazaarListing,
    type BazaarDigitalKind,
    type BazaarListing,
} from '../services/bazaar-gateway';

interface Section {
    id: string;
    title: string;
    filter: (listing: BazaarListing) => boolean;
}

const SECTIONS: Section[] = [
    { id: 'featured', title: 'Featured', filter: (l) => (l.rating ?? 0) >= 4.5 },
    { id: 'plugins', title: 'New plugins', filter: (l) => l.digital_kind === 'plugin' },
    { id: 'emoji', title: 'Emoji & memes', filter: (l) => l.digital_kind === 'emoji_pack' || l.digital_kind === 'meme_pack' },
    { id: 'free', title: 'Free this week', filter: (l) => (l.price_cents ?? 0) === 0 },
];

const formatPrice = (listing: BazaarListing): string => {
    if (listing.price_cents == null) return '—';
    if (listing.price_cents === 0) return 'Free';
    const dollars = (listing.price_cents / 100).toFixed(2);
    return `${listing.currency_code ?? 'USD'} ${dollars}`;
};

const KIND_FILTERS: Array<{ id: BazaarDigitalKind | 'all'; label: string }> = [
    { id: 'all', label: 'All' },
    { id: 'plugin', label: 'Plugins' },
    { id: 'emoji_pack', label: 'Emoji' },
    { id: 'meme_pack', label: 'Memes' },
    { id: 'stego', label: 'Stego' },
    { id: 'software', label: 'Software' },
];

const BazaarHomeScreen = ({ navigation }: { navigation: { navigate: (screen: string, params?: Record<string, unknown>) => void } }) => {
    const { driver } = useAuth();
    const enabled = isCoalitionBazaarEnabled();
    const [listings, setListings] = useState<BazaarListing[]>([]);
    const [activeKind, setActiveKind] = useState<BazaarDigitalKind | 'all'>('all');
    const [loading, setLoading] = useState(false);

    const reload = useCallback(async (kind: BazaarDigitalKind | 'all') => {
        setLoading(true);
        try {
            const items = await fetchBazaarCatalog(kind === 'all' ? { limit: 50 } : { kind, limit: 50 });
            setListings(items);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (enabled) {
            void reload(activeKind);
        }
    }, [enabled, activeKind, reload]);

    const sectioned = useMemo(() => {
        return SECTIONS.map((section) => ({
            ...section,
            items: listings.filter(section.filter).slice(0, 10),
        })).filter((section) => section.items.length > 0);
    }, [listings]);

    const onReport = async (listing: BazaarListing) => {
        if (!driver?.id) {
            Alert.alert('Sign in required', 'You must be signed in to report a listing.');
            return;
        }
        const { ok } = await reportBazaarListing({
            product_id: listing.id,
            user_id: String(driver.id),
            reason: 'other',
        });
        Alert.alert(ok ? 'Report submitted' : 'Report failed', ok ? 'Our team will review this listing.' : 'Please try again.');
    };

    if (!enabled) {
        return (
            <YStack flex={1} p='$5' ai='center' jc='center'>
                <Text fontSize='$6' fontWeight='700' mb='$2'>
                    Bazaar is not available
                </Text>
                <Text color='$textSecondary' ta='center'>
                    The digital marketplace is disabled in this build.
                </Text>
            </YStack>
        );
    }

    return (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
            <YStack space='$4'>
                <Text fontSize='$8' fontWeight='700'>
                    Bazaar
                </Text>
                <Text color='$textSecondary'>Plugins, emoji packs, memes, and software from Coalition creators.</Text>

                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <XStack gap='$2'>
                        {KIND_FILTERS.map((filter) => (
                            <Button
                                key={filter.id}
                                size='$3'
                                variant={activeKind === filter.id ? undefined : 'outlined'}
                                onPress={() => setActiveKind(filter.id)}
                            >
                                {filter.label}
                            </Button>
                        ))}
                    </XStack>
                </ScrollView>

                {loading ? <Text color='$textSecondary'>Loading listings…</Text> : null}

                {sectioned.map((section) => (
                    <YStack key={section.id} space='$2'>
                        <Text fontSize='$6' fontWeight='700'>
                            {section.title}
                        </Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <XStack gap='$3'>
                                {section.items.map((listing) => (
                                    <YStack
                                        key={listing.id}
                                        width={260}
                                        borderWidth={1}
                                        borderColor='$borderColorWithShadow'
                                        borderRadius='$4'
                                        p='$3'
                                        space='$2'
                                    >
                                        <Text fontWeight='700'>{listing.title}</Text>
                                        <Text color='$textSecondary' numberOfLines={3}>
                                            {listing.description ?? ''}
                                        </Text>
                                        <XStack jc='space-between' ai='center'>
                                            <Text fontSize='$3' color='$textSecondary'>
                                                {listing.seller_handle ? `@${listing.seller_handle}` : 'Unknown creator'}
                                            </Text>
                                            <Text fontWeight='700'>{formatPrice(listing)}</Text>
                                        </XStack>
                                        <XStack gap='$2'>
                                            <Button
                                                flex={1}
                                                size='$3'
                                                onPress={() =>
                                                    navigation.navigate('EntityScreen', {
                                                        entity_type: 'digital_product',
                                                        id: listing.id,
                                                    })
                                                }
                                            >
                                                View
                                            </Button>
                                            <Button size='$3' variant='outlined' onPress={() => onReport(listing)}>
                                                Report
                                            </Button>
                                        </XStack>
                                    </YStack>
                                ))}
                            </XStack>
                        </ScrollView>
                    </YStack>
                ))}

                {!loading && listings.length === 0 ? (
                    <Text color='$textSecondary' ta='center' mt='$6'>
                        No listings yet — check back soon.
                    </Text>
                ) : null}
            </YStack>
        </ScrollView>
    );
};

export default BazaarHomeScreen;
