import useStorage from './use-storage';
import { DEFAULT_LOCATION_CONSENT, LocationConsentSettings } from '../utils/location-consent';
import { LOCATION_CONSENT_SETTINGS_KEY } from '../utils/location-consent-storage';

const useLocationConsent = () => {
    const [locationConsent, setLocationConsent] = useStorage<LocationConsentSettings>(LOCATION_CONSENT_SETTINGS_KEY, DEFAULT_LOCATION_CONSENT);

    return {
        locationConsent,
        setLocationConsent,
    };
};

export default useLocationConsent;
