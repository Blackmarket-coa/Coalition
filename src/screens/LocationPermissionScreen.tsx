import React, { useState, useCallback } from 'react';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform, Linking } from 'react-native';
import { request, check, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { Button, Text, YStack, Image, XStack, AlertDialog } from 'tamagui';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faMapMarkerAlt } from '@fortawesome/free-solid-svg-icons';
import { requestWebGeolocationPermission } from '../utils/location';
import { buildLocationConsent } from '../utils/location-consent';
import useLocationConsent from '../hooks/use-location-consent';
import useStorage from '../hooks/use-storage';
import { buildLocationConsent } from '../utils/location-consent';
import { useLanguage } from '../contexts/LanguageContext';
import useDimensions from '../hooks/use-dimensions';

const LocationPermissionScreen: React.FC = () => {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const { screenWidth } = useDimensions();
    const { t } = useLanguage();

    const [isDialogOpen, setDialogOpen] = useState(false);
    const [dialogMode, setDialogMode] = useState<'retry' | 'settings'>('retry');
    const { setLocationConsent } = useLocationConsent();
    const [, setLocationConsent] = useStorage('LOCATION_CONSENT_SETTINGS', { granted: false, precision: 'off', updatedAt: null });

    // Navigate to Boot, passing whether location is enabled
    const finish = useCallback(
        (granted: boolean, precision: 'precise' | 'approximate' | 'off' = granted ? 'precise' : 'off') => {
            setLocationConsent(buildLocationConsent(granted, precision));
            navigation.reset({
                index: 0,
                routes: [{ name: 'Boot', params: { locationEnabled: granted } }],
            });
        },
        [navigation, setLocationConsent]
    );

    // Open app settings
    const openSettings = () => {
        Linking.openSettings();
        setDialogOpen(false);
    };

    const checkCurrentPermissionPrecision = useCallback(async (): Promise<'precise' | 'approximate' | 'off'> => {
        if (Platform.OS === 'web') {
            return 'off';
        }

        if (Platform.OS === 'ios') {
            const status = await check(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
            return status === RESULTS.GRANTED ? 'precise' : 'off';
        }

        const fineStatus = await check(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION);
        if (fineStatus === RESULTS.GRANTED) {
            return 'precise';
        }

        const coarseStatus = await check(PERMISSIONS.ANDROID.ACCESS_COARSE_LOCATION);
        if (coarseStatus === RESULTS.GRANTED) {
            return 'approximate';
        }

        return 'off';
    }, []);

    // Re-check status when coming back from Settings
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

    // Request permission and decide dialog mode
    const requestLocationPermission = useCallback(
        async (mode: 'precise' | 'approximate' = 'precise') => {
            if (Platform.OS === 'web') {
                const granted = await requestWebGeolocationPermission();
                return finish(granted, granted ? mode : 'off');
            }

            const perm =
                Platform.OS === 'ios' ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE : mode === 'approximate' ? PERMISSIONS.ANDROID.ACCESS_COARSE_LOCATION : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;

            const status = await request(perm);
            if (status === RESULTS.GRANTED) {
                return finish(true, mode);
            }

            if (status === RESULTS.DENIED) {
                setDialogMode('retry');
            } else {
                setDialogMode('settings');
            }
            setDialogOpen(true);
        },
        [finish]
    );

    return (
        <YStack flex={1} bg='$background' pt={insets.top} pb={insets.bottom} alignItems='center' justifyContent='center' padding='$6'>
            <YStack alignItems='center' justifyContent='center'>
                <Image source={require('../../assets/images/isometric-geolocation-1.png')} width={360} height={360} resizeMode='contain' />
            </YStack>

            <Text fontSize='$8' fontWeight='bold' color='$textPrimary' mb='$2' textAlign='center'>
                {t('LocationPermissionScreen.enableLocationServices')}
            </Text>
            <Text color='$textSecondary' fontSize='$4' textAlign='center' mb='$6'>
                {t('LocationPermissionScreen.enableLocationPrompt')}
            </Text>

            <Button size='$5' bg='$primary' color='$white' width='100%' onPress={() => requestLocationPermission('precise')} icon={<FontAwesomeIcon icon={faMapMarkerAlt} color='white' />}>
                <Button.Text color='$white'>{t('LocationPermissionScreen.shareAndContinue')}</Button.Text>
            </Button>

            <Button size='$5' variant='outlined' mt='$3' width='100%' onPress={() => requestLocationPermission('approximate')}>
                <Button.Text color='$textPrimary'>{t('LocationPermissionScreen.shareApproximate')}</Button.Text>
            </Button>

            <Button size='$5' variant='ghost' mt='$3' onPress={() => finish(false, 'off')}>
                <Button.Text color='$textSecondary'>{t('LocationPermissionScreen.skipForNow')}</Button.Text>
            </Button>

            <AlertDialog open={isDialogOpen} onOpenChange={setDialogOpen}>
                <AlertDialog.Portal>
                    <AlertDialog.Overlay key='overlay' animation='quick' opacity={0.5} />
                    <AlertDialog.Content elevate bordered key='content' bg='$background' width={screenWidth * 0.9} px='$4' py='$3' borderWidth={1} borderColor='$borderColor'>
                        <AlertDialog.Title color='$textPrimary' fontSize={24}>
                            {dialogMode === 'retry' ? t('LocationPermissionScreen.permissionNeededTitle') : t('LocationPermissionScreen.enableInSettingsTitle')}
                        </AlertDialog.Title>

                        <AlertDialog.Description color='$textSecondary' mb='$6' mt='$2'>
                            {dialogMode === 'retry' ? t('LocationPermissionScreen.permissionDeniedPrompt') : t('LocationPermissionScreen.locationBlockedPrompt')}
                        </AlertDialog.Description>

                        <XStack space='$3' justifyContent='flex-end'>
                            <Button
                                bg='$secondary'
                                borderWidth={1}
                                borderColor='$borderColorWithShadow'
                                onPress={() => {
                                    setDialogOpen(false);
                                    finish(false);
                                }}
                            >
                                {t('common.cancel')}
                            </Button>

                            {dialogMode === 'retry' && (
                                <Button
                                    bg='$info'
                                    borderWidth={1}
                                    borderColor='$infoBorder'
                                    onPress={() => {
                                        setDialogOpen(false);
                                        requestLocationPermission();
                                    }}
                                >
                                    {t('common.tryAgain')}
                                </Button>
                            )}

                            {dialogMode === 'settings' && (
                                <Button onPress={openSettings} bg='$info' borderWidth={1} borderColor='$infoBorder'>
                                    {t('LocationPermissionScreen.goToSettings')}
                                </Button>
                            )}
                        </XStack>
                    </AlertDialog.Content>
                </AlertDialog.Portal>
            </AlertDialog>
        </YStack>
    );
};

export default LocationPermissionScreen;
