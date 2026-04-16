import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, TextInput } from 'react-native';
import { Button, Paragraph, Text, XStack, YStack } from 'tamagui';
import { deriveSpatialEventStatus } from '../services/event-timeline';
import { addOptimisticSpatialFeedItem, getGatewayFeedConfig, type SpatialEventType, type SpatialFeedItem, type SpatialVisibility } from '../services/spatial-feed';
import { SPATIAL_EVENT_CATEGORIES } from '../services/spatial-taxonomy';

const EVENT_TYPES: SpatialEventType[] = [...SPATIAL_EVENT_CATEGORIES.map((category) => category.key), 'aid', 'jobs', 'infrastructure', 'other'];
const VISIBILITY_OPTIONS: SpatialVisibility[] = ['public', 'community', 'private'];

const toNumber = (value: string, fallback: number) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const CreateMapEventScreen = ({ navigation }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [eventType, setEventType] = useState<SpatialEventType>('community_event');
    const [startsAt, setStartsAt] = useState(new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16));
    const [endsAt, setEndsAt] = useState(new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().slice(0, 16));
    const [latitude, setLatitude] = useState('40.7128');
    const [longitude, setLongitude] = useState('-74.0060');
    const [visibility, setVisibility] = useState<SpatialVisibility>('community');
    const [mediaUrl, setMediaUrl] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const canSubmit = useMemo(() => title.trim().length >= 3 && startsAt.trim() && latitude.trim() && longitude.trim(), [title, startsAt, latitude, longitude]);

    const submitMapEvent = async () => {
        if (!canSubmit) {
            Alert.alert('Missing details', 'Please complete title, start time, and location coordinates.');
            return;
        }

        const normalizedStartsAt = new Date(startsAt).toISOString();
        const normalizedEndsAt = endsAt.trim() ? new Date(endsAt).toISOString() : undefined;
        const localId = `local-map-event-${Date.now()}`;
        const optimisticItem: SpatialFeedItem = {
            id: localId,
            layer: 'votes',
            title: title.trim(),
            latitude: toNumber(latitude, 0),
            longitude: toNumber(longitude, 0),
            visibility,
            eventType,
            startsAt: normalizedStartsAt,
            endsAt: normalizedEndsAt,
            status: deriveSpatialEventStatus({ startsAt: normalizedStartsAt, endsAt: normalizedEndsAt }),
            source: 'gateway',
            meta: {
                description: description.trim(),
                mediaUrl: mediaUrl.trim() || undefined,
                optimistic: true,
            },
        };

        addOptimisticSpatialFeedItem(optimisticItem);

        const { host, apiKey } = getGatewayFeedConfig();
        const payload = {
            title: title.trim(),
            description: description.trim(),
            eventType,
            startsAt: normalizedStartsAt,
            endsAt: normalizedEndsAt,
            location: {
                latitude: optimisticItem.latitude,
                longitude: optimisticItem.longitude,
            },
            visibility,
            media: mediaUrl.trim() ? [{ kind: 'link', url: mediaUrl.trim() }] : [],
        };

        setSubmitting(true);

        try {
            if (host) {
                const endpointVariants = ['/v1/spatial/events', '/api/v1/spatial/events'];
                let persisted = false;

                for (const path of endpointVariants) {
                    try {
                        const response = await fetch(`${host.replace(/\/$/, '')}${path}`, {
                            method: 'POST',
                            headers: {
                                Accept: 'application/json',
                                'Content-Type': 'application/json',
                                ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
                            },
                            body: JSON.stringify(payload),
                        });

                        if (!response.ok) {
                            continue;
                        }

                        persisted = true;
                        break;
                    } catch {
                        // Try next endpoint variant.
                    }
                }

                if (!persisted) {
                    Alert.alert('Saved locally', 'Event was added to your local map/feed state and will sync when gateway is reachable.');
                }
            }

            navigation.navigate('Explore');
        } catch (error) {
            console.warn('Unable to submit map event to gateway:', error);
            Alert.alert('Saved locally', 'Event was added locally but could not be posted to gateway right now.');
            navigation.goBack();
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <YStack flex={1} bg='$background'>
            <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
                <Text fontSize='$8' fontWeight='800'>
                    Community Alert/Event
                </Text>
                <Paragraph color='$textSecondary'>Share a location-based event or alert with your neighborhood map + feed.</Paragraph>

                <YStack gap='$2'>
                    <Text fontWeight='700'>Title</Text>
                    <TextInput value={title} onChangeText={setTitle} placeholder='Power outage prep meetup' style={{ borderWidth: 1, borderColor: '#4b5563', borderRadius: 10, padding: 12, color: '#fff' }} />
                </YStack>

                <YStack gap='$2'>
                    <Text fontWeight='700'>Description</Text>
                    <TextInput
                        value={description}
                        onChangeText={setDescription}
                        placeholder='Add details for attendees'
                        multiline
                        style={{ borderWidth: 1, borderColor: '#4b5563', borderRadius: 10, padding: 12, color: '#fff', minHeight: 96, textAlignVertical: 'top' }}
                    />
                </YStack>

                <YStack gap='$2'>
                    <Text fontWeight='700'>Category (eventType)</Text>
                    <XStack flexWrap='wrap' gap='$2'>
                        {EVENT_TYPES.map((type) => (
                            <Button key={type} size='$3' bg={eventType === type ? '$primary' : '$gray-500'} onPress={() => setEventType(type)}>
                                <Button.Text color='$white'>{type}</Button.Text>
                            </Button>
                        ))}
                    </XStack>
                </YStack>

                <YStack gap='$2'>
                    <Text fontWeight='700'>Start datetime (ISO/local)</Text>
                    <TextInput value={startsAt} onChangeText={setStartsAt} placeholder='2026-04-16T18:30' style={{ borderWidth: 1, borderColor: '#4b5563', borderRadius: 10, padding: 12, color: '#fff' }} />
                </YStack>

                <YStack gap='$2'>
                    <Text fontWeight='700'>End datetime (optional)</Text>
                    <TextInput value={endsAt} onChangeText={setEndsAt} placeholder='2026-04-16T20:00' style={{ borderWidth: 1, borderColor: '#4b5563', borderRadius: 10, padding: 12, color: '#fff' }} />
                </YStack>

                <YStack gap='$2'>
                    <Text fontWeight='700'>Location picker (lat/lng)</Text>
                    <XStack gap='$2'>
                        <TextInput
                            value={latitude}
                            onChangeText={setLatitude}
                            keyboardType='numeric'
                            placeholder='Latitude'
                            style={{ flex: 1, borderWidth: 1, borderColor: '#4b5563', borderRadius: 10, padding: 12, color: '#fff' }}
                        />
                        <TextInput
                            value={longitude}
                            onChangeText={setLongitude}
                            keyboardType='numeric'
                            placeholder='Longitude'
                            style={{ flex: 1, borderWidth: 1, borderColor: '#4b5563', borderRadius: 10, padding: 12, color: '#fff' }}
                        />
                    </XStack>
                </YStack>

                <YStack gap='$2'>
                    <Text fontWeight='700'>Visibility / privacy</Text>
                    <XStack gap='$2'>
                        {VISIBILITY_OPTIONS.map((option) => (
                            <Button key={option} size='$3' bg={visibility === option ? '$primary' : '$gray-500'} onPress={() => setVisibility(option)}>
                                <Button.Text color='$white'>{option}</Button.Text>
                            </Button>
                        ))}
                    </XStack>
                </YStack>

                <YStack gap='$2'>
                    <Text fontWeight='700'>Optional media URL</Text>
                    <TextInput value={mediaUrl} onChangeText={setMediaUrl} placeholder='https://...' style={{ borderWidth: 1, borderColor: '#4b5563', borderRadius: 10, padding: 12, color: '#fff' }} />
                </YStack>

                <Button disabled={!canSubmit || submitting} onPress={submitMapEvent} bg='$primary' mt='$2'>
                    <Button.Text color='$white'>{submitting ? 'Posting…' : 'Post alert/event'}</Button.Text>
                </Button>
            </ScrollView>
        </YStack>
    );
};

export default CreateMapEventScreen;
