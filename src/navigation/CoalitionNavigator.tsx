import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Platform } from 'react-native';
import { useTheme } from 'tamagui';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCompass, faEnvelope, faHouse, faPlayCircle, faUser } from '@fortawesome/free-solid-svg-icons';
import DriverOrderManagementScreen from '../screens/DriverOrderManagementScreen';
import HomeRecommendationsScreen from '../screens/HomeRecommendationsScreen';
import OrderScreen from '../screens/OrderScreen';
import EntityScreen from '../screens/EntityScreen';
import ProofOfDeliveryScreen from '../screens/ProofOfDeliveryScreen';
import PostTabScreen from '../screens/PostTabScreen';
import SocialFeedScreen from '../screens/SocialFeedScreen';
import ExploreMapScreen from '../screens/ExploreMapScreen';
import CreateMapEventScreen from '../screens/CreateMapEventScreen';
import ChatHomeScreen from '../screens/ChatHomeScreen';
import ChatChannelScreen from '../screens/ChatChannelScreen';
import ChatParticipantsScreen from '../screens/ChatParticipantsScreen';
import CreateChatChannelScreen from '../screens/CreateChatChannelScreen';
import DriverProfileScreen from '../screens/DriverProfileScreen';
import DriverAccountScreen from '../screens/DriverAccountScreen';
import ProviderOnboardingScreen from '../screens/ProviderOnboardingScreen';
import PrivacySettingsScreen from '../screens/PrivacySettingsScreen';
import DriverLayout from '../layouts/DriverLayout';
import { coalitionPrimaryTab } from './coalition-config';

const isAndroid = Platform.OS === 'android';

const HomeTab = createNativeStackNavigator({
    initialRouteName: 'HomeRecommendations',
    screens: {
        HomeRecommendations: { screen: HomeRecommendationsScreen, options: { headerShown: false } },
        // Backward compatibility: keep legacy route names for existing order flows.
        DriverOrderManagement: { screen: DriverOrderManagementScreen, options: { headerShown: false } },
        Order: { screen: OrderScreen, options: { headerShown: false } },
        OrderModal: { screen: OrderScreen, options: { headerShown: false, presentation: 'modal' } },
        Entity: { screen: EntityScreen, options: { headerShown: false, presentation: 'modal' } },
        ProofOfDelivery: { screen: ProofOfDeliveryScreen, options: { headerShown: false } },
    },
});

const FeedTab = createNativeStackNavigator({
    initialRouteName: 'FeedMain',
    screens: {
        FeedMain: { screen: SocialFeedScreen, options: { headerShown: false } },
        // Backward compatibility: preserve PostTab route name for existing deep links.
        PostTab: { screen: PostTabScreen, options: { headerShown: false } },
        CreateMapEvent: { screen: CreateMapEventScreen, options: { headerShown: false, presentation: 'modal' } },
    },
});

const ExploreTab = createNativeStackNavigator({
    initialRouteName: 'Test',
    screens: {
        Test: { screen: ExploreMapScreen, options: { headerShown: false } },
    },
});

const MessagesTab = createNativeStackNavigator({
    initialRouteName: 'ChatHome',
    screens: {
        // Backward compatibility: preserve chat route names used by deep links and in-app navigation.
        ChatHome: { screen: ChatHomeScreen, options: { headerShown: false } },
        ChatChannel: { screen: ChatChannelScreen, options: { headerShown: false } },
        ChatParticipants: { screen: ChatParticipantsScreen, options: { headerShown: false, presentation: 'modal' } },
        CreateChatChannel: { screen: CreateChatChannelScreen, options: { headerShown: false, presentation: 'modal' } },
    },
});

const YouTab = createNativeStackNavigator({
    initialRouteName: 'DriverProfile',
    screens: {
        DriverProfile: { screen: DriverProfileScreen, options: { headerShown: false } },
        DriverAccount: { screen: DriverAccountScreen, options: { headerShown: false } },
        ProviderOnboarding: { screen: ProviderOnboardingScreen, options: { headerShown: false } },
        PrivacySettings: { screen: PrivacySettingsScreen, options: { headerTitle: 'Privacy Settings' } },
    },
});

export const coalitionTabs = {
    Home: { screen: HomeTab },
    Feed: { screen: FeedTab },
    Explore: { screen: ExploreTab },
    Messages: { screen: MessagesTab },
    You: { screen: YouTab },
};

const CoalitionNavigator = createBottomTabNavigator({
    layout: DriverLayout,
    screenOptions: ({ route }) => {
        const theme = useTheme();
        const isPrimaryFeedTab = route.name === coalitionPrimaryTab;
        const icons = {
            Home: faHouse,
            Feed: faPlayCircle,
            Explore: faCompass,
            Messages: faEnvelope,
            You: faUser,
        };

        return {
            headerShown: false,
            tabBarActiveTintColor: theme.primary.val,
            tabBarInactiveTintColor: theme.tabIconBlur.val,
            tabBarStyle: {
                borderTopWidth: 1,
                borderTopColor: theme.borderColor.val,
                height: isAndroid ? 64 : 72,
            },
            tabBarIcon: ({ focused }) => (
                <FontAwesomeIcon
                    icon={icons[route.name]}
                    size={isPrimaryFeedTab ? 28 : 18}
                    color={focused ? theme.primary.val : theme.tabIconBlur.val}
                />
            ),
            tabBarLabelStyle: {
                fontSize: isPrimaryFeedTab ? 13 : 11,
                fontWeight: isPrimaryFeedTab ? '700' : '500',
            },
            tabBarItemStyle: isPrimaryFeedTab
                ? {
                      marginTop: -6,
                  }
                : undefined,
        };
    },
    screens: coalitionTabs,
});

export default CoalitionNavigator;
