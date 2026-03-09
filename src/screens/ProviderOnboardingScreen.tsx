import { useMemo, useState } from 'react';
import { Pressable, ScrollView } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { launchImageLibrary } from 'react-native-image-picker';
import { Button, Input, Paragraph, Text, XStack, YStack } from 'tamagui';
import { useAuth } from '../contexts/AuthContext';
import { createProviderProfile, type ProviderOfferingInput, type ProviderRole } from '../services/blackstar-gateway';

const steps = ['Roles', 'Profile', 'Location', 'Offerings', 'Review'];
const phi = 1.618;
const roleOptions: Array<{ role: ProviderRole; icon: string }> = [
    { role: 'Grower', icon: '✺' },
    { role: 'Maker', icon: '◈' },
    { role: 'Mover', icon: '➤' },
    { role: 'Healer', icon: '✶' },
    { role: 'Teacher', icon: '⌘' },
    { role: 'Builder', icon: '▣' },
    { role: 'Organizer', icon: '⟡' },
];

const radiusChoices = [
    { label: 'Neighborhood ~0.5mi', value: 0.5 },
    { label: 'District ~1mi', value: 1 },
    { label: 'City ~3mi', value: 3 },
    { label: 'Region ~10mi', value: 10 },
];

const pricingModes: ProviderOfferingInput['pricing_mode'][] = ['price', 'time_bank', 'free', 'sliding_scale'];

const solarpunk = {
    bg: '#0b1411',
    panel: 'rgba(18,42,24,0.84)',
    green: '#2dd477',
    gold: '#f2b134',
    text: '#f5fff8',
    muted: '#a4b8ab',
};

const ProviderOnboardingScreen = () => {
    const { driver } = useAuth();
    const userId = driver?.id ?? 'provider_local';

    const [step, setStep] = useState(0);
    const [roles, setRoles] = useState<ProviderRole[]>([]);
    const [name, setName] = useState('');
    const [handle, setHandle] = useState('');
    const [bio, setBio] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [displayRadiusMiles, setDisplayRadiusMiles] = useState(1);
    const [offerings, setOfferings] = useState<ProviderOfferingInput[]>([{ name: '', description: '', pricing_mode: 'free' }]);
    const [isSubmitting, setSubmitting] = useState(false);
    const [resultMessage, setResultMessage] = useState('');

    const progressX = useSharedValue(0);

    const segmentWeights = useMemo(() => steps.map((_, i) => Math.pow(phi, i + 1)), []);

    const totalWeight = useMemo(() => segmentWeights.reduce((a, b) => a + b, 0), [segmentWeights]);

    const slideStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: progressX.value }],
    }));

    const moveStep = (next: number) => {
        progressX.value = withSpring(next > step ? -18 : 18, { damping: 16, stiffness: 180 }, () => {
            progressX.value = withSpring(0, { damping: 18, stiffness: 190 });
        });
        setStep(next);
    };

    const toggleRole = (role: ProviderRole) => {
        setRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));
    };

    const updateOffering = (idx: number, patch: Partial<ProviderOfferingInput>) => {
        setOfferings((prev) => prev.map((item, i) => (i === idx ? { ...item, ...patch } : item)));
    };

    const addOffering = () => setOfferings((prev) => [...prev, { name: '', description: '', pricing_mode: 'free' }]);

    const uploadAvatar = async () => {
        const res = await launchImageLibrary({ mediaType: 'photo', selectionLimit: 1 });
        const uri = res.assets?.[0]?.uri;
        if (uri) setAvatarUrl(uri);
    };

    const submit = async () => {
        setSubmitting(true);
        setResultMessage('');
        try {
            const response = await createProviderProfile({
                user_id: userId,
                roles,
                profile: { name, handle, bio, avatar_url: avatarUrl || undefined },
                location: { display_radius_miles: displayRadiusMiles },
                offerings: offerings.filter((o) => o.name.trim() && o.description.trim()),
            });
            setResultMessage(response.ok ? 'Provider profile created successfully.' : 'Profile creation failed.');
        } catch (error) {
            setResultMessage(error instanceof Error ? error.message : 'Profile creation failed.');
        }
        setSubmitting(false);
    };

    return (
        <YStack flex={1} bg={solarpunk.bg} p='$4'>
            <Text color={solarpunk.text} fontSize='$8' fontWeight='800'>
                Become a Provider
            </Text>
            <Paragraph color={solarpunk.muted} mt='$2' mb='$3'>
                Multi-step setup for vendor / driver / organizer profiles.
            </Paragraph>

            <XStack gap='$1' mb='$3'>
                {steps.map((label, idx) => (
                    <YStack key={label} flex={segmentWeights[idx] / totalWeight} h={8} borderRadius={999} bg={idx <= step ? solarpunk.gold : 'rgba(255,255,255,0.15)'} />
                ))}
            </XStack>

            <Animated.View entering={FadeIn.duration(180)} style={slideStyle}>
                <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
                    <YStack bg={solarpunk.panel} borderRadius={34} p='$4' gap='$3'>
                        {step === 0 ? (
                            <YStack gap='$2'>
                                <Text color={solarpunk.text} fontSize='$6' fontWeight='700'>
                                    1. Role Selection
                                </Text>
                                <XStack flexWrap='wrap' gap='$2'>
                                    {roleOptions.map((option) => {
                                        const active = roles.includes(option.role);
                                        return (
                                            <Pressable key={option.role} onPress={() => toggleRole(option.role)}>
                                                <YStack
                                                    width={108}
                                                    borderRadius={active ? 34 : 24}
                                                    p='$3'
                                                    bg={active ? 'rgba(45,212,119,0.18)' : 'rgba(0,0,0,0.25)'}
                                                    borderWidth={1}
                                                    borderColor={active ? solarpunk.green : 'rgba(255,255,255,0.12)'}
                                                    alignItems='center'
                                                >
                                                    <Text color={active ? solarpunk.green : solarpunk.text} fontSize={24}>
                                                        {option.icon}
                                                    </Text>
                                                    <Text color={solarpunk.text}>{option.role}</Text>
                                                </YStack>
                                            </Pressable>
                                        );
                                    })}
                                </XStack>
                            </YStack>
                        ) : null}

                        {step === 1 ? (
                            <YStack gap='$2'>
                                <Text color={solarpunk.text} fontSize='$6' fontWeight='700'>
                                    2. Profile Details
                                </Text>
                                <Input value={name} onChangeText={setName} placeholder='Name' />
                                <Input value={handle} onChangeText={setHandle} placeholder='Handle' />
                                <Input value={bio} onChangeText={setBio} placeholder='Bio' multiline />
                                <XStack alignItems='center' gap='$2'>
                                    <Button onPress={uploadAvatar} bg='rgba(45,212,119,0.2)' borderColor={solarpunk.green} borderWidth={1}>
                                        Upload Avatar
                                    </Button>
                                    <Paragraph color={solarpunk.muted} flex={1} numberOfLines={1}>
                                        {avatarUrl || 'No avatar selected'}
                                    </Paragraph>
                                </XStack>
                            </YStack>
                        ) : null}

                        {step === 2 ? (
                            <YStack gap='$2'>
                                <Text color={solarpunk.text} fontSize='$6' fontWeight='700'>
                                    3. Location Consent
                                </Text>
                                <Paragraph color={solarpunk.muted}>Providers appear on map with privacy fuzzing. Choose your visibility radius.</Paragraph>
                                {radiusChoices.map((choice) => (
                                    <Pressable key={choice.value} onPress={() => setDisplayRadiusMiles(choice.value)}>
                                        <YStack
                                            p='$3'
                                            borderRadius={24}
                                            borderWidth={1}
                                            borderColor={displayRadiusMiles === choice.value ? solarpunk.green : 'rgba(255,255,255,0.12)'}
                                            bg={displayRadiusMiles === choice.value ? 'rgba(45,212,119,0.16)' : 'rgba(0,0,0,0.24)'}
                                        >
                                            <Text color={solarpunk.text}>{choice.label}</Text>
                                        </YStack>
                                    </Pressable>
                                ))}
                            </YStack>
                        ) : null}

                        {step === 3 ? (
                            <YStack gap='$2'>
                                <Text color={solarpunk.text} fontSize='$6' fontWeight='700'>
                                    4. Offerings
                                </Text>
                                {offerings.map((offering, idx) => (
                                    <YStack key={idx} p='$3' borderRadius={24} bg='rgba(0,0,0,0.24)' gap='$2'>
                                        <Input value={offering.name} onChangeText={(v) => updateOffering(idx, { name: v })} placeholder='Offering name' />
                                        <Input value={offering.description} onChangeText={(v) => updateOffering(idx, { description: v })} placeholder='Description' />
                                        <XStack gap='$2' flexWrap='wrap'>
                                            {pricingModes.map((mode) => (
                                                <Pressable key={mode} onPress={() => updateOffering(idx, { pricing_mode: mode })}>
                                                    <YStack
                                                        px='$2'
                                                        py='$1'
                                                        borderRadius={999}
                                                        bg={offering.pricing_mode === mode ? 'rgba(242,177,52,0.2)' : 'rgba(255,255,255,0.08)'}
                                                        borderWidth={1}
                                                        borderColor={offering.pricing_mode === mode ? solarpunk.gold : 'rgba(255,255,255,0.15)'}
                                                    >
                                                        <Text color={solarpunk.text}>{mode}</Text>
                                                    </YStack>
                                                </Pressable>
                                            ))}
                                        </XStack>
                                        {offering.pricing_mode === 'price' ? (
                                            <Input
                                                keyboardType='decimal-pad'
                                                value={offering.price != null ? String(offering.price) : ''}
                                                onChangeText={(v) => updateOffering(idx, { price: Number(v) || 0 })}
                                                placeholder='Price'
                                            />
                                        ) : null}
                                    </YStack>
                                ))}
                                <Button onPress={addOffering} bg='rgba(45,212,119,0.2)' borderColor={solarpunk.green} borderWidth={1}>
                                    Add Offering
                                </Button>
                            </YStack>
                        ) : null}

                        {step === 4 ? (
                            <YStack gap='$2'>
                                <Text color={solarpunk.text} fontSize='$6' fontWeight='700'>
                                    5. Review & Confirm
                                </Text>
                                <Paragraph color={solarpunk.muted}>Roles: {roles.join(', ') || 'None selected'}</Paragraph>
                                <Paragraph color={solarpunk.muted}>Name: {name || '-'}</Paragraph>
                                <Paragraph color={solarpunk.muted}>Handle: {handle || '-'}</Paragraph>
                                <Paragraph color={solarpunk.muted}>Radius: {displayRadiusMiles}mi</Paragraph>
                                <Paragraph color={solarpunk.muted}>Offerings: {offerings.filter((o) => o.name && o.description).length}</Paragraph>
                                <Button onPress={submit} disabled={isSubmitting} bg={solarpunk.gold}>
                                    <Button.Text color='#092010'>{isSubmitting ? 'Submitting...' : 'Submit Provider Profile'}</Button.Text>
                                </Button>
                                {resultMessage ? <Paragraph color={solarpunk.text}>{resultMessage}</Paragraph> : null}
                            </YStack>
                        ) : null}
                    </YStack>
                </ScrollView>
            </Animated.View>

            <XStack position='absolute' left={16} right={16} bottom={16} justifyContent='space-between'>
                <Button disabled={step === 0} onPress={() => moveStep(Math.max(0, step - 1))} bg='rgba(255,255,255,0.12)'>
                    Back
                </Button>
                <Button disabled={step >= steps.length - 1 || (step === 0 && roles.length === 0)} onPress={() => moveStep(Math.min(steps.length - 1, step + 1))} bg={solarpunk.green}>
                    Next
                </Button>
            </XStack>
        </YStack>
    );
};

export default ProviderOnboardingScreen;
