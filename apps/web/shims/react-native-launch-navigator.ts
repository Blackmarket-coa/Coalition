const LaunchNavigator = {
    APP: {
        GOOGLE_MAPS: 'google_maps',
        APPLE_MAPS: 'apple_maps',
    },
    navigate: async (_destination: string | [number, number], _options?: Record<string, unknown>) => true,
};

export default LaunchNavigator;
