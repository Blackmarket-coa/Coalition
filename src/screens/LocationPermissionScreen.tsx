import React, { useState, useCallback, useMemo } from 'react';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform, Linking } from 'react-native';
import { request, check, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { Button, Text, YStack, Image, XStack, AlertDialog, Separator } from 'tamagui';
import { requestWebGeolocationPermission } from '../utils/location';
import useLocationConsent from '../hooks/use-location-consent';
import { buildLocationConsent } from '../utils/location-consent';
import useDimensions from '../hooks/use-dimensions';

const LocationPermissionScreen: React.FC = () => {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const { screenWidth } = useDimensions();
    const { setLocationConsent } = useLocationConsent();

    const [isDialogOpen, setDialogOpen] = useState(false);
    const [dialogMode, setDialogMode] = useState<'retry' | 'settings'>('retry');

    const canRequestPrecise = useMemo(() => Platform.OS === 'ios' || Platform.OS === 'android', []);

    const finish = useCallback(
        (granted: boolean, precision: 'precise' | 'approximate' | 'off') => {
            setLocationConsent(buildLocationConsent(granted, precision));
            navigation.reset({ index: 0, routes: [{ name: 'Boot', params: { locationEnabled: granted } }] });
        },
        [navigation, setLocationConsent]
    );

    const checkCurrentPermissionPrecision = useCallback(async (): Promise<'precise' | 'approximate' | 'off'> => {
        if (Platform.OS === 'web') {
            return 'off';
        }

        if (Platform.OS === 'ios') {
            const status = await check(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
            return status === RESULTS.GRANTED ? 'precise' : 'off';
        }

        const fineStatus = await check(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION);
        if (fineStatus === RESULTS.GRANTED) return 'precise';

        const coarseStatus = await check(PERMISSIONS.ANDROID.ACCESS_COARSE_LOCATION);
        if (coarseStatus === RESULTS.GRANTED) return 'approximate';

        return 'off';
    }, []);

    useFocusEffect(
        useCallback(() => {
            if (Platform.OS === 'web') return;
            (async () => {
                const precision = await checkCurrentPermissionPrecision();
                if (precision !== 'off') {
                    finish(true, precision);
                }
            })();
        }, [checkCurrentPermissionPrecision, finish])
    );

    const requestLocationPermission = useCallback(
        async (precision: 'approximate' | 'precise') => {
            if (Platform.OS === 'web') {
                const granted = await requestWebGeolocationPermission();
                return finish(granted, granted ? 'approximate' : 'off');
            }

            const permission =
                Platform.OS === 'ios'
                    ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE
                    : precision === 'precise'
                      ? PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION
                      : PERMISSIONS.ANDROID.ACCESS_COARSE_LOCATION;

            const status = await request(permission);
            if (status === RESULTS.GRANTED) {
                return finish(true, precision);
            }

            setDialogMode(status === RESULTS.DENIED ? 'retry' : 'settings');
            setDialogOpen(true);
        },
        [finish]
    );

    return (
        <YStack flex={1} bg='$background' pt={insets.top} pb={insets.bottom} alignItems='center' justifyContent='center' padding='$5'>
            <Image source={require('../../apps/mobile/assets/images/isometric-geolocation-1.png')} width={300} height={220} resizeMode='contain' />

            <Text fontSize='$8' fontWeight='700' textAlign='center'>
                Location Consent Contract
            </Text>
            <Text color='$textSecondary' textAlign='center' mt='$2' mb='$4'>
                We only use location features with your consent. You can continue without sharing location and change this later in Privacy Settings.
            </Text>

            <YStack width='100%' borderWidth={1} borderColor='$borderColorWithShadow' borderRadius='$4' p='$3' gap='$2' mb='$4'>
                <Text fontWeight='700'>What we collect</Text>
                <Text color='$textSecondary'>Approximate area for nearby feed, map layers, and local aid/job discovery.</Text>
                <Separator />
                <Text fontWeight='700'>What we never collect</Text>
                <Text color='$textSecondary'>Continuous background tracking or exact address without explicit precise opt-in.</Text>
                <Separator />
                <Text fontWeight='700'>Who can see</Text>
                <Text color='$textSecondary'>Only services that power nearby modules; public posts are not auto-tagged with exact coordinates.</Text>
                <Separator />
                <Text fontWeight='700'>How to turn off</Text>
                <Text color='$textSecondary'>Open You → Privacy Settings to revoke or downgrade location access anytime.</Text>
            </YStack>

            <Button size='$5' width='100%' bg='$primary' onPress={() => requestLocationPermission('approximate')}>
                Allow Approximate Location
            </Button>

            {canRequestPrecise ? (
                <Button size='$5' width='100%' variant='outlined' mt='$3' onPress={() => requestLocationPermission('precise')}>
                    Allow Precise Location (Optional)
                </Button>
            ) : null}

            <Button size='$5' width='100%' variant='ghost' mt='$3' onPress={() => finish(false, 'off')}>
                Not Now
            </Button>

            <AlertDialog open={isDialogOpen} onOpenChange={setDialogOpen}>
                <AlertDialog.Portal>
                    <AlertDialog.Overlay key='overlay' animation='quick' opacity={0.5} />
                    <AlertDialog.Content elevate bordered key='content' bg='$background' width={screenWidth * 0.9} px='$4' py='$3' borderWidth={1} borderColor='$borderColor'>
                        <AlertDialog.Title color='$textPrimary' fontSize={22}>
                            {dialogMode === 'retry' ? 'Location permission not granted' : 'Enable location in Settings'}
                        </AlertDialog.Title>
                        <AlertDialog.Description color='$textSecondary' mb='$6' mt='$2'>
                            {dialogMode === 'retry' ? 'You can continue with Not Now, or try again.' : 'Location is blocked at OS level. Open Settings to enable it.'}
                        </AlertDialog.Description>

                        <XStack space='$3' justifyContent='flex-end'>
                            <Button onPress={() => { setDialogOpen(false); finish(false, 'off'); }}>Not Now</Button>
                            {dialogMode === 'retry' ? <Button onPress={() => { setDialogOpen(false); requestLocationPermission('approximate'); }}>Try Again</Button> : null}
                            {dialogMode === 'settings' ? <Button onPress={() => { Linking.openSettings(); setDialogOpen(false); }}>Open Settings</Button> : null}
                        </XStack>
                    </AlertDialog.Content>
                </AlertDialog.Portal>
            </AlertDialog>
        </YStack>
    );
};

export default LocationPermissionScreen;
