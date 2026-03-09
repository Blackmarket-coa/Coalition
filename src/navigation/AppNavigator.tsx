import { createStaticNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Boot, LocationPermission, InstanceLink } from './stacks/CoreStack';
import AuthStack from './stacks/AuthStack';
import DriverNavigator from './DriverNavigator';
import CoalitionNavigator from './CoalitionNavigator';
import OnboardingNavigator from './OnboardingNavigator';
import { useAuth, useIsAuthenticated } from '@blackstar/core/src/contexts/AuthContext';
import AppLayout from '../layouts/AppLayout';
import { isDriverRole, resolveAuthenticatedNavigator } from './coalition-config';
import { isCoalitionNavEnabled, isCoalitionOnboardingEnabled } from '../services/feature-flags';
import useStorage from '../hooks/use-storage';
import { ONBOARDING_STORAGE_KEY_PREFIX } from '../services/onboarding';

function useAuthenticatedNavigatorRouteName() {
    const { driver } = useAuth();
    const coalitionNavEnabled = isCoalitionNavEnabled();

    return resolveAuthenticatedNavigator({ coalitionNavEnabled, isDriver: isDriverRole(driver) });
}

function useShouldShowCoalitionNavigator() {
    const { driver } = useAuth();
    const [onboardingState] = useStorage(`${ONBOARDING_STORAGE_KEY_PREFIX}:${driver?.id ?? 'anon'}`, null);
    return useAuthenticatedNavigatorRouteName() === 'CoalitionNavigator' && (!isCoalitionOnboardingEnabled() || Boolean(onboardingState?.completedAt));
}

function useShouldShowDriverNavigator() {
    return useAuthenticatedNavigatorRouteName() === 'DriverNavigator';
}

function useShouldShowOnboardingNavigator() {
    const isAuthenticated = useIsAuthenticated();
    const { driver } = useAuth();
    const [onboardingState] = useStorage(`${ONBOARDING_STORAGE_KEY_PREFIX}:${driver?.id ?? 'anon'}`, null);
    return isAuthenticated && isCoalitionOnboardingEnabled() && useAuthenticatedNavigatorRouteName() === 'CoalitionNavigator' && !onboardingState?.completedAt;
}

const RootStack = createNativeStackNavigator({
    initialRouteName: 'Boot',
    layout: AppLayout,
    screens: {
        Boot,
        LocationPermission,
        InstanceLink,
        ...AuthStack,
        OnboardingNavigator: {
            if: useShouldShowOnboardingNavigator,
            screen: OnboardingNavigator,
            options: { headerShown: false, gestureEnabled: false, animation: 'none' },
        },
        CoalitionNavigator: {
            if: useShouldShowCoalitionNavigator,
            screen: CoalitionNavigator,
            options: { headerShown: false, gestureEnabled: false, animation: 'none' },
        },
        DriverNavigator: {
            if: useShouldShowDriverNavigator,
            screen: DriverNavigator,
            options: { headerShown: false, gestureEnabled: false, animation: 'none' },
        },
    },
});

const AppNavigator = createStaticNavigation(RootStack);
export default AppNavigator;
