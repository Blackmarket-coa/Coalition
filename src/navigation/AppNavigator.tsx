import { createStaticNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Boot, LocationPermission, InstanceLink } from './stacks/CoreStack';
import AuthStack from './stacks/AuthStack';
import DriverNavigator from './DriverNavigator';
import CoalitionNavigator from './CoalitionNavigator';
import { useAuth } from '@blackstar/core/src/contexts/AuthContext';
import { config, toBoolean } from '../utils';
import AppLayout from '../layouts/AppLayout';
import { isDriverRole, resolveAuthenticatedNavigator } from './coalition-config';

function useAuthenticatedNavigatorRouteName() {
    const { driver } = useAuth();
    const coalitionNavEnabled = toBoolean(config('COALITION_NAV_ENABLED', 'true'));

    return resolveAuthenticatedNavigator({ coalitionNavEnabled, isDriver: isDriverRole(driver) });
}

function useShouldShowCoalitionNavigator() {
    return useAuthenticatedNavigatorRouteName() === 'CoalitionNavigator';
}

function useShouldShowDriverNavigator() {
    return useAuthenticatedNavigatorRouteName() === 'DriverNavigator';
}

const RootStack = createNativeStackNavigator({
    initialRouteName: 'Boot',
    layout: AppLayout,
    screens: {
        Boot,
        LocationPermission,
        InstanceLink,
        ...AuthStack,
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
