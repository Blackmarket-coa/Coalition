import { useEffect, useMemo, useState } from 'react';
import MapView, { Marker, Region } from 'react-native-maps';
import { Button, Text, XStack, YStack } from 'tamagui';
import { SpatialFeedItem, getGatewayFeedConfig, getUnifiedSpatialFeed, subscribeOptimisticSpatialFeed } from '../services/spatial-feed';
import { SPATIAL_LAYER_DEFINITIONS, SPATIAL_LAYER_KEYS, type SpatialLayerKey } from '../services/spatial-taxonomy';
import { mergeMedusaSpatialMetadata } from '../services/medusa-location';

interface ClusterPoint {
    id: string;
    latitude: number;
    longitude: number;
    count: number;
    items: SpatialFeedItem[];
    layer: SpatialLayerKey;
}

const INITIAL_REGION: Region = {
    latitude: 40.7128,
    longitude: -74.006,
    latitudeDelta: 0.08,
    longitudeDelta: 0.08,
};

const clusterItems = (items: SpatialFeedItem[], region: Region): ClusterPoint[] => {
    const delta = Math.max(region.latitudeDelta, region.longitudeDelta);
    const cellSize = Math.max(delta / 8, 0.001);
    const buckets = new Map<string, ClusterPoint>();

    items.forEach((item) => {
        const latCell = Math.floor(item.latitude / cellSize);
        const lngCell = Math.floor(item.longitude / cellSize);
        const key = `${item.layer}:${latCell}:${lngCell}`;
        const existing = buckets.get(key);

        if (existing) {
            const nextCount = existing.count + 1;
            existing.latitude = (existing.latitude * existing.count + item.latitude) / nextCount;
            existing.longitude = (existing.longitude * existing.count + item.longitude) / nextCount;
            existing.count = nextCount;
            existing.items.push(item);
            return;
        }

        buckets.set(key, {
            id: key,
            latitude: item.latitude,
            longitude: item.longitude,
            count: 1,
            items: [item],
            layer: item.layer,
        });
    });

    return [...buckets.values()];
};

const TestScreen = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [region, setRegion] = useState(INITIAL_REGION);
    const [feedItems, setFeedItems] = useState<SpatialFeedItem[]>([]);
    const [activeLayers, setActiveLayers] = useState<Record<SpatialLayerKey, boolean>>(() =>
        SPATIAL_LAYER_KEYS.reduce<Record<SpatialLayerKey, boolean>>((state, layer) => {
            state[layer] = true;
            return state;
        }, {} as Record<SpatialLayerKey, boolean>)
    );
    const selectedLayers = useMemo(() => SPATIAL_LAYER_KEYS.filter((layer) => activeLayers[layer]), [activeLayers]);

    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            const { host, apiKey } = getGatewayFeedConfig();
            const response = await getUnifiedSpatialFeed(host, apiKey, selectedLayers);
            const enriched = response.items.map((item) => {
                if (item.layer !== 'vendors') {
                    return item;
                }

                const medusaPayload = mergeMedusaSpatialMetadata(
                    { id: item.id, title: item.title },
                    { latitude: item.latitude, longitude: item.longitude, approximate: false },
                    { visibility: item.visibility, discoverable: item.visibility !== 'private' }
                );

                return { ...item, meta: { ...item.meta, medusa: medusaPayload } };
            });
            setFeedItems(enriched);
            setIsLoading(false);
        };

        load();
    }, [selectedLayers]);

    useEffect(() => {
        const unsubscribe = subscribeOptimisticSpatialFeed((optimisticItems) => {
            setFeedItems((current) => {
                const currentById = new Map(current.map((item) => [item.id, item]));
                optimisticItems.forEach((item) => currentById.set(item.id, item));
                return [...currentById.values()];
            });
        });

        return unsubscribe;
    }, []);

    const visibleItems = useMemo(() => feedItems.filter((item) => selectedLayers.includes(item.layer)), [feedItems, selectedLayers]);
    const clusters = useMemo(() => clusterItems(visibleItems, region), [visibleItems, region]);

    return (
        <YStack flex={1} bg='$background'>
            <YStack p='$3' gap='$2'>
                <Text color='$textPrimary' fontWeight='700'>
                    Unified Spatial Feed {isLoading ? '(loading...)' : `(${visibleItems.length} items)`}
                </Text>
                <XStack flexWrap='wrap' gap='$2'>
                    {SPATIAL_LAYER_DEFINITIONS.map((layer) => (
                        <Button
                            key={layer.key}
                            size='$3'
                            bg={activeLayers[layer.key] ? '$primary' : '$gray-400'}
                            onPress={() => setActiveLayers((current) => ({ ...current, [layer.key]: !current[layer.key] }))}
                        >
                            <Button.Text color='$white'>{layer.label}</Button.Text>
                        </Button>
                    ))}
                </XStack>
            </YStack>

            <YStack flex={1} overflow='hidden'>
                <MapView style={{ flex: 1 }} initialRegion={INITIAL_REGION} onRegionChangeComplete={setRegion}>
                    {clusters.map((cluster) => (
                        <Marker key={cluster.id} coordinate={{ latitude: cluster.latitude, longitude: cluster.longitude }} title={cluster.layer} description={`${cluster.count} item(s)`} />
                    ))}
                </MapView>
            </YStack>
        </YStack>
    );
};

export default TestScreen;
