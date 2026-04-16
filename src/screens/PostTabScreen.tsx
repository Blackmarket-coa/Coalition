import { Alert } from 'react-native';
import PostTab, { type PostTypeCard } from '@blackstar/ui/src/components/PostTab';
import { useAuth } from '../contexts/AuthContext';

const PostTabScreen = ({ navigation }) => {
    const { driver } = useAuth();
    const providerId = driver?.getAttribute?.('meta')?.provider_id ?? driver?.getAttribute?.('provider_id') ?? null;
    const isProvider = Boolean(providerId);

    const navigateToComposer = (card: PostTypeCard) => {
        if (card.providerOnly && !isProvider) {
            Alert.alert('Become a Provider', 'Create a provider profile to list offerings', [
                { text: 'Maybe later', style: 'cancel' },
                { text: 'Create Profile', onPress: () => navigation.navigate('ProviderOnboarding') },
            ]);
            return;
        }

        navigation.navigate(card.route);
    };

    return <PostTab isProvider={isProvider} onSelect={navigateToComposer} onUpsellPress={() => navigation.navigate('ProviderOnboarding')} />;
};

export default PostTabScreen;
