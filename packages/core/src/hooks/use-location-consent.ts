import useStorage from './use-storage';
import { LocationPrecisionMode } from '../utils/location-consent';

export interface StoredLocationConsent {
    granted: boolean;
    precision: LocationPrecisionMode;
    updatedAt: string | null;
}

const DEFAULT_LOCATION_CONSENT: StoredLocationConsent = {
    granted: false,
    precision: 'off',
    updatedAt: null,
};

const useLocationConsent = () => {
    const [locationConsent, setLocationConsent] = useStorage<StoredLocationConsent>('LOCATION_CONSENT_SETTINGS', DEFAULT_LOCATION_CONSENT);

    return {
        locationConsent,
        setLocationConsent,
    };
};

export default useLocationConsent;
