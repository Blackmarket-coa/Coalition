import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { config } from '../utils';
import { getString } from '../hooks/use-storage';

export type ConsentStatus = 'unknown' | 'granted' | 'denied' | 'revoked';

interface LocationConsentContextValue {
    consentStatus: ConsentStatus;
    isLocationAvailable: boolean;
    requestConsent: () => Promise<ConsentStatus>;
    revokeConsent: () => Promise<void>;
    denyConsent: () => Promise<void>;
}

const STORAGE_KEY = 'location_consent';

const LocationConsentContext = createContext<LocationConsentContextValue>({
    consentStatus: 'unknown',
    isLocationAvailable: false,
    requestConsent: async () => 'denied',
    revokeConsent: async () => {},
    denyConsent: async () => {},
});

const getPermissionForPlatform = () => {
    if (Platform.OS === 'ios') return PERMISSIONS.IOS.LOCATION_WHEN_IN_USE;
    return PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;
};

export const LocationConsentProvider = ({ children }) => {
    const [consentStatus, setConsentState] = useState<ConsentStatus>('unknown');

    const persistConsentStatus = useCallback(async (status: ConsentStatus) => {
        setConsentState(status);
        await AsyncStorage.setItem(STORAGE_KEY, status);
    }, []);

    useEffect(() => {
        (async () => {
            const stored = (await AsyncStorage.getItem(STORAGE_KEY)) as ConsentStatus | null;
            if (stored) {
                setConsentState(stored);
            }
        })();
    }, []);

    const requestConsent = useCallback(async (): Promise<ConsentStatus> => {
        const permission = getPermissionForPlatform();
        const current = await check(permission);
        const next = current === RESULTS.GRANTED ? current : await request(permission);

        const status: ConsentStatus = next === RESULTS.GRANTED ? 'granted' : 'denied';
        await persistConsentStatus(status);
        return status;
    }, [persistConsentStatus]);

    const revokeConsent = useCallback(async () => {
        const wasShared = consentStatus === 'granted';
        await persistConsentStatus('revoked');

        if (!wasShared) {
            return;
        }

        const token = getString('_driver_token');
        const backend = config('MEDUSA_BACKEND_URL');
        if (!token || !backend) {
            return;
        }

        try {
            await fetch(`${String(backend).replace(/\/$/, '')}/vendor/seller-location`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });
        } catch (error) {
            console.warn('Failed to delete seller location during revokeConsent:', error);
        }
    }, [consentStatus, persistConsentStatus]);

    const denyConsent = useCallback(async () => {
        await persistConsentStatus('denied');
    }, [persistConsentStatus]);

    const value = useMemo(
        () => ({
            consentStatus,
            requestConsent,
            revokeConsent,
            denyConsent,
            isLocationAvailable: consentStatus === 'granted',
        }),
        [consentStatus, requestConsent, revokeConsent, denyConsent]
    );

    return <LocationConsentContext.Provider value={value}>{children}</LocationConsentContext.Provider>;
};

export const useLocationConsentContext = () => useContext(LocationConsentContext);

export default LocationConsentContext;
