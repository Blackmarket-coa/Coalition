import { createNativeStackNavigator } from '@react-navigation/native-stack';
import WelcomeOnboardingScreen from '../screens/onboarding/WelcomeOnboardingScreen';
import ProfileSetupOnboardingScreen from '../screens/onboarding/ProfileSetupOnboardingScreen';
import InterestPickerOnboardingScreen from '../screens/onboarding/InterestPickerOnboardingScreen';
import EcosystemIntentOnboardingScreen from '../screens/onboarding/EcosystemIntentOnboardingScreen';
import ConsentOnboardingScreen from '../screens/onboarding/ConsentOnboardingScreen';
import SuggestedCommunitiesOnboardingScreen from '../screens/onboarding/SuggestedCommunitiesOnboardingScreen';

const OnboardingNavigator = createNativeStackNavigator({
    initialRouteName: 'Welcome',
    screens: {
        Welcome: { screen: WelcomeOnboardingScreen, options: { headerShown: false } },
        ProfileSetup: { screen: ProfileSetupOnboardingScreen, options: { headerTitle: 'Profile Setup' } },
        InterestPicker: { screen: InterestPickerOnboardingScreen, options: { headerTitle: 'Choose Interests' } },
        EcosystemIntent: { screen: EcosystemIntentOnboardingScreen, options: { headerTitle: 'Ecosystem Intent' } },
        Consent: { screen: ConsentOnboardingScreen, options: { headerTitle: 'Consent' } },
        SuggestedCommunities: { screen: SuggestedCommunitiesOnboardingScreen, options: { headerTitle: 'Suggested Communities' } },
    },
});

export default OnboardingNavigator;
