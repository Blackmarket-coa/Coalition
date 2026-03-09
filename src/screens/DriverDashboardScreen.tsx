import { useEffect, useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Text, YStack, XStack, useTheme, Button } from 'tamagui';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { useLocation } from '../contexts/LocationContext';
import { useOrderManager } from '../contexts/OrderManagerContext';
import { humanize } from 'inflected';
import { get } from '../utils';
import OdometerNumber from '../components/OdometerNumber';
import useAppTheme from '../hooks/use-app-theme';
import { BlackstarAssignment, BlackstarClaim, BlackstarJob, claimGatewayJob, getGatewayAssignments, getGatewayClaims, getGatewayJobs } from '../services/blackstar-gateway';
import { useAuth } from '../contexts/AuthContext';

const WidgetContainer = ({ px = '$4', py = '$4', children, ...props }) => {
    const { isDarkMode } = useAppTheme();
    return (
        <YStack borderRadius='$6' bg='$surface' px={px} py={py} borderWidth={1} borderColor={isDarkMode ? '$transparent' : '$gray-300'} {...props}>
            {children}
        </YStack>
    );
};

const DriverDashboardScreen = () => {
    const theme = useTheme();
    const navigation = useNavigation();
    const { driver } = useAuth();
    const { isTracking, location } = useLocation();
    const { allActiveOrders } = useOrderManager();
    const [jobs, setJobs] = useState<BlackstarJob[]>([]);
    const [claims, setClaims] = useState<BlackstarClaim[]>([]);
    const [assignments, setAssignments] = useState<BlackstarAssignment[]>([]);

    useEffect(() => {
        const loadGatewayData = async () => {
            const [nextJobs, nextClaims, nextAssignments] = await Promise.all([getGatewayJobs(), getGatewayClaims(), getGatewayAssignments()]);
            setJobs(nextJobs);
            setClaims(nextClaims);
            setAssignments(nextAssignments);
        };

        loadGatewayData();
    }, []);

    const firstAssignmentPath = assignments[0]?.path ?? [];
    const openJobs = useMemo(() => jobs.filter((job) => job.status === 'open' && job.claimable), [jobs]);

    const handleClaimFirstJob = async () => {
        const firstJob = openJobs[0];
        if (!firstJob) return;

        const nextClaim = await claimGatewayJob(firstJob.id, driver?.id ?? 'provider_local');
        setClaims((current) => [nextClaim, ...current]);
    };

    return (
        <YStack flex={1} bg='$background'>
            <YStack flex={1} padding='$4' gap='$4'>
                <YStack space='$4'>
                    <WidgetContainer>
                        <XStack>
                            <YStack flex={1}>
                                <Text color='$textPrimary'>Tracking:</Text>
                            </YStack>
                            <YStack flex={1} alignItems='flex-end'>
                                <Text color={isTracking ? '$successBorder' : '$textSecondary'}>{isTracking ? 'Yes' : 'No'}</Text>
                            </YStack>
                        </XStack>
                    </WidgetContainer>
                    <WidgetContainer>
                        <Text color='$textPrimary' fontWeight='bold' mb='$3'>
                            Location:
                        </Text>
                        <XStack flexWrap='wrap' gap='$3'>
                            {['latitude', 'longitude', 'heading', 'altitude'].map((key, index) => {
                                return (
                                    <YStack key={index} width='45%' overflow='hidden'>
                                        <Text color='$textSecondary'>{humanize(key)}:</Text>
                                        <Text color='$textPrimary' numberOfLines={1}>
                                            {get(location, `coords.${key}`)}
                                        </Text>
                                    </YStack>
                                );
                            })}
                        </XStack>
                    </WidgetContainer>
                    <WidgetContainer>
                        <XStack justifyContent='space-between' alignItems='center' mb='$2'>
                            <Text color='$textPrimary' fontWeight='700'>
                                Gateway Jobs & Claims
                            </Text>
                            <Button size='$2' bg='$primary' onPress={handleClaimFirstJob} disabled={openJobs.length === 0}>
                                <Button.Text color='$white'>Claim next job</Button.Text>
                            </Button>
                        </XStack>
                        <Text color='$textSecondary'>Open jobs: {openJobs.length}</Text>
                        <Text color='$textSecondary'>Pending claims: {claims.filter((claim) => claim.status === 'pending').length}</Text>
                    </WidgetContainer>
                    <WidgetContainer height={200} overflow='hidden'>
                        <Text color='$textPrimary' fontWeight='700' mb='$2'>
                            Routing & Assignment Map
                        </Text>
                        <MapView
                            style={{ flex: 1 }}
                            initialRegion={{
                                latitude: firstAssignmentPath[0]?.latitude ?? 40.7128,
                                longitude: firstAssignmentPath[0]?.longitude ?? -74.006,
                                latitudeDelta: 0.04,
                                longitudeDelta: 0.04,
                            }}
                        >
                            {jobs
                                .filter((job) => job.pickup)
                                .map((job) => (
                                    <Marker key={`pickup_${job.id}`} coordinate={job.pickup} title={`${job.title} pickup`} pinColor='green' />
                                ))}
                            {jobs
                                .filter((job) => job.dropoff)
                                .map((job) => (
                                    <Marker key={`dropoff_${job.id}`} coordinate={job.dropoff} title={`${job.title} dropoff`} pinColor='red' />
                                ))}
                            {assignments.map((assignment) => (
                                <Polyline key={assignment.id} coordinates={assignment.path} strokeColor={theme['$blue-500'].val} strokeWidth={3} />
                            ))}
                        </MapView>
                    </WidgetContainer>
                </YStack>
                <XStack gap='$4'>
                    <WidgetContainer flex={1} alignItems='center' justifyContent='center'>
                        <YStack>
                            <Text color='$textPrimary' fontWeight='bold' mb='$2'>
                                Active Orders
                            </Text>
                        </YStack>
                        <YStack>
                            <OdometerNumber value={allActiveOrders.length} digitStyle={{ color: theme['$textSecondary'].val }} digitHeight={36} />
                        </YStack>
                    </WidgetContainer>
                    <WidgetContainer flex={1} alignItems='center' justifyContent='center'>
                        <YStack>
                            <Text color='$textPrimary' fontWeight='bold' mb='$2'>
                                Speed
                            </Text>
                        </YStack>
                        <YStack>
                            <OdometerNumber value={get(location, 'coords.speed', 0)} digitStyle={{ color: theme['$textSecondary'].val }} digitHeight={36} />
                        </YStack>
                    </WidgetContainer>
                </XStack>
                <Button variant='outlined' onPress={() => navigation.navigate('DriverAccountTab', { screen: 'ProviderOnboarding' } as never)}>
                    <Button.Text color='$textPrimary'>Open provider onboarding</Button.Text>
                </Button>
            </YStack>
        </YStack>
    );
};

export default DriverDashboardScreen;
