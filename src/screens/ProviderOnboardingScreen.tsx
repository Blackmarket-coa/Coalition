import { useEffect, useMemo, useState } from 'react';
import { Button, Input, Switch, Text, XStack, YStack } from 'tamagui';
import { useAuth } from '../contexts/AuthContext';
import { getProviderOnboardingProfile, upsertProviderOnboardingProfile } from '../services/blackstar-gateway';

const ProviderOnboardingScreen = () => {
    const { driver } = useAuth();
    const providerId = driver?.id ?? 'provider_local';

    const [displayName, setDisplayName] = useState('');
    const [serviceArea, setServiceArea] = useState('');
    const [capabilities, setCapabilities] = useState('deliveries,aid');
    const [medusaVendorLinked, setMedusaVendorLinked] = useState(false);
    const [blackstarDriverLinked, setBlackstarDriverLinked] = useState(false);
    const [blackoutIdentityLinked, setBlackoutIdentityLinked] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const loadProfile = async () => {
            const profile = await getProviderOnboardingProfile(providerId);
            setDisplayName(profile.displayName ?? '');
            setServiceArea(profile.serviceArea ?? '');
            setCapabilities((profile.capabilities ?? []).join(','));
            setMedusaVendorLinked(Boolean(profile.medusaVendorLinked));
            setBlackstarDriverLinked(Boolean(profile.blackstarDriverLinked));
            setBlackoutIdentityLinked(Boolean(profile.blackoutIdentityLinked));
        };

        loadProfile();
    }, [providerId]);

    const readinessScore = useMemo(() => {
        let score = 0;
        if (medusaVendorLinked) score += 1;
        if (blackstarDriverLinked) score += 1;
        if (blackoutIdentityLinked) score += 1;
        return `${score}/3 systems linked`;
    }, [medusaVendorLinked, blackstarDriverLinked, blackoutIdentityLinked]);

    const handleSave = async () => {
        setIsSaving(true);
        await upsertProviderOnboardingProfile({
            providerId,
            displayName,
            serviceArea,
            capabilities: capabilities
                .split(',')
                .map((item) => item.trim())
                .filter(Boolean),
            medusaVendorLinked,
            blackstarDriverLinked,
            blackoutIdentityLinked,
        });
        setIsSaving(false);
    };

    return (
        <YStack flex={1} bg='$background' p='$4' gap='$4'>
            <Text color='$textPrimary' fontSize='$8' fontWeight='bold'>
                Provider Onboarding
            </Text>
            <Text color='$textSecondary'>Cross-system readiness: {readinessScore}</Text>

            <YStack gap='$2'>
                <Text color='$textSecondary'>Display name</Text>
                <Input value={displayName} onChangeText={setDisplayName} placeholder='Provider display name' />
            </YStack>

            <YStack gap='$2'>
                <Text color='$textSecondary'>Service area</Text>
                <Input value={serviceArea} onChangeText={setServiceArea} placeholder='Neighborhood / district' />
            </YStack>

            <YStack gap='$2'>
                <Text color='$textSecondary'>Capabilities (comma-separated)</Text>
                <Input value={capabilities} onChangeText={setCapabilities} placeholder='deliveries, aid, logistics' />
            </YStack>

            <XStack justifyContent='space-between' alignItems='center'>
                <Text color='$textPrimary'>Medusa vendor linked</Text>
                <Switch checked={medusaVendorLinked} onCheckedChange={setMedusaVendorLinked}>
                    <Switch.Thumb animation='quick' />
                </Switch>
            </XStack>

            <XStack justifyContent='space-between' alignItems='center'>
                <Text color='$textPrimary'>Blackstar driver linked</Text>
                <Switch checked={blackstarDriverLinked} onCheckedChange={setBlackstarDriverLinked}>
                    <Switch.Thumb animation='quick' />
                </Switch>
            </XStack>

            <XStack justifyContent='space-between' alignItems='center'>
                <Text color='$textPrimary'>Blackout identity linked</Text>
                <Switch checked={blackoutIdentityLinked} onCheckedChange={setBlackoutIdentityLinked}>
                    <Switch.Thumb animation='quick' />
                </Switch>
            </XStack>

            <Button bg='$primary' onPress={handleSave} disabled={isSaving}>
                <Button.Text color='$white'>{isSaving ? 'Saving...' : 'Save Provider Profile'}</Button.Text>
            </Button>
        </YStack>
    );
};

export default ProviderOnboardingScreen;
