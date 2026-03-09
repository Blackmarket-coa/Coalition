import React, { useMemo, useState } from 'react';
import { Modal } from 'react-native';
import { Button, Paragraph, Separator, Text, XStack, YStack } from 'tamagui';
import { useLocationConsentContext } from '@blackstar/core/src/contexts/LocationConsentContext';

const guaranteeItems = ['Approximate only — never your exact address.', 'Visible only to people you choose.', 'Hideable anytime in Privacy settings.', 'Pauses when the app is closed.'];

export const LocationConsent = ({ visible = true, onClose = () => {} }) => {
    const { requestConsent, denyConsent } = useLocationConsentContext();
    const [loading, setLoading] = useState(false);

    const modalVisible = useMemo(() => visible, [visible]);

    const handleAllow = async () => {
        setLoading(true);
        await requestConsent();
        setLoading(false);
        onClose();
    };

    const handleNotNow = async () => {
        await denyConsent();
        onClose();
    };

    return (
        <Modal visible={modalVisible} transparent animationType='fade' onRequestClose={onClose}>
            <YStack flex={1} justifyContent='center' alignItems='center' bg='rgba(0,0,0,0.5)' p='$4'>
                <YStack width='100%' maxWidth={420} bg='$background' borderRadius='$5' p='$4' gap='$3'>
                    <Text fontSize={20} fontWeight='700'>
                        Share Approximate Location?
                    </Text>
                    <Paragraph color='$color11'>Help people discover your availability while preserving privacy.</Paragraph>
                    <Separator />
                    <YStack gap='$2'>
                        {guaranteeItems.map((item) => (
                            <XStack key={item} gap='$2' alignItems='center'>
                                <Text color='$green10'>•</Text>
                                <Paragraph>{item}</Paragraph>
                            </XStack>
                        ))}
                    </YStack>
                    <XStack gap='$2' justifyContent='flex-end'>
                        <Button variant='outlined' onPress={handleNotNow} disabled={loading}>
                            Not Now
                        </Button>
                        <Button bg='$green10' color='white' onPress={handleAllow} disabled={loading}>
                            Allow Approximate Location
                        </Button>
                    </XStack>
                </YStack>
            </YStack>
        </Modal>
    );
};

export default LocationConsent;
