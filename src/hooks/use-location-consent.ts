import { useEffect } from 'react';
import useStorage from './use-storage';
import { DEFAULT_LOCATION_CONSENT, LocationConsentSettings } from '../utils/location-consent';
import { LOCATION_CONSENT_SETTINGS_KEY, migrateLegacyLocationConsentIfNeeded } from '../utils/location-consent-storage';

const useLocationConsent = () => {
    const [locationConsent, setLocationConsent] = useStorage<LocationConsentSettings>(LOCATION_CONSENT_SETTINGS_KEY, DEFAULT_LOCATION_CONSENT);

    useEffect(() => {
        let mounted = true;

        const runMigration = async () => {
            const migrated = await migrateLegacyLocationConsentIfNeeded();
            if (mounted && migrated) {
                setLocationConsent(migrated);
            }
        };

        void runMigration();

        return () => {
            mounted = false;
        };
    }, [setLocationConsent]);

    return {
        locationConsent,
        setLocationConsent,
    };
};

export default useLocationConsent;
