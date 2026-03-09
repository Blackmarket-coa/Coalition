import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import BottomSheet, { BottomSheetFlatList, BottomSheetTextInput, BottomSheetView } from '@gorhom/bottom-sheet';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { BlurView } from '@react-native-community/blur';
import { Circle, Paragraph, Text, XStack, YStack } from 'tamagui';
import { useMatrix, useRoom } from '@blackstar/core/src/contexts/MatrixContext';

type ChatPanelProps = {
    roomId: string;
    mode?: 'overlay' | 'full';
    visible?: boolean;
    onClose?: () => void;
};

const relativeTime = (timestamp?: number) => {
    if (!timestamp) return 'now';
    const diff = Math.max(0, Date.now() - timestamp);
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
};

const ChatPanel = ({ roomId, mode = 'overlay', visible = true, onClose }: ChatPanelProps) => {
    const { client } = useMatrix();
    const { timelineEvents, members, roomName, typingIndicators, send } = useRoom(roomId);
    const [draft, setDraft] = useState('');

    const initialIndex = mode === 'full' ? 0 : visible ? 0 : -1;
    const snapPoints = useMemo(() => (mode === 'full' ? ['100%'] : ['50%', '88%']), [mode]);

    const comments = useMemo(
        () =>
            timelineEvents
                .map((event: any) => {
                    const encrypted = event?.isEncrypted?.() || event?.getType?.() === 'm.room.encrypted';
                    if (encrypted) {
                        client?.decryptEventIfNeeded?.(event);
                    }

                    const content = event?.getContent?.() ?? {};
                    const sender = event?.getSender?.() ?? 'unknown';
                    const member = members.find((m: any) => m.userId === sender);
                    const encryptionInfo = client?.crypto?.getEncryptionInfoForEvent?.(event);
                    const verified = Boolean(encryptionInfo?.senderDevice?.isVerified?.());

                    return {
                        id: event?.getId?.() ?? `${sender}-${event?.getTs?.() ?? Math.random()}`,
                        sender,
                        displayName: member?.name ?? sender,
                        avatarUrl: member?.getAvatarUrl?.(client?.getHomeserverUrl?.(), 42, 42, 'crop', false, false),
                        text: content?.body ?? (encrypted ? '[Encrypted message]' : ''),
                        ts: event?.getTs?.(),
                        encrypted,
                        verified,
                    };
                })
                .filter((event) => event.text),
        [client, timelineEvents, members]
    );

    const handleSend = useCallback(async () => {
        const trimmed = draft.trim();
        if (!trimmed) return;
        await send(trimmed);
        setDraft('');
    }, [draft, send]);

    return (
        <BottomSheet
            index={initialIndex}
            enablePanDownToClose={mode === 'overlay'}
            onClose={onClose}
            snapPoints={snapPoints}
            backgroundStyle={{ backgroundColor: 'rgba(18,42,24,0.88)' }}
            handleIndicatorStyle={{ backgroundColor: '#23c16b' }}
        >
            <BottomSheetView style={styles.container}>
                <BlurView style={StyleSheet.absoluteFillObject} blurType='dark' blurAmount={18} reducedTransparencyFallbackColor='rgba(18,42,24,0.88)' />

                <XStack px='$4' py='$2' alignItems='center' justifyContent='space-between'>
                    <YStack>
                        <Text color='#f5fff8' fontWeight='800'>
                            {roomName}
                        </Text>
                        <XStack mt='$1' bg='rgba(35,193,107,0.16)' borderRadius={999} px='$2' py='$1' alignSelf='flex-start' alignItems='center' gap='$1'>
                            <Text fontSize={11} color='#23c16b'>
                                🔒 E2E Encrypted
                            </Text>
                        </XStack>
                    </YStack>
                    {mode === 'overlay' ? (
                        <Pressable onPress={onClose}>
                            <Text color='#f2b134'>Close</Text>
                        </Pressable>
                    ) : null}
                </XStack>

                <BottomSheetFlatList
                    data={comments}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16, gap: 12 }}
                    renderItem={({ item }) => (
                        <Animated.View entering={FadeInDown.duration(180)}>
                            <XStack gap='$2' alignItems='flex-start'>
                                <YStack
                                    width={38}
                                    height={38}
                                    borderWidth={1}
                                    borderColor='#23c16b'
                                    style={styles.avatarBlob}
                                    overflow='hidden'
                                    justifyContent='center'
                                    alignItems='center'
                                    bg='rgba(255,255,255,0.08)'
                                >
                                    <Text color='#f5fff8'>{item.displayName.slice(0, 1).toUpperCase()}</Text>
                                </YStack>
                                <YStack flex={1} bg='rgba(0,0,0,0.22)' borderRadius={16} p='$2'>
                                    <XStack justifyContent='space-between' alignItems='center'>
                                        <XStack alignItems='center' gap='$1'>
                                            <Text color='#f5fff8' fontWeight='700'>
                                                {item.displayName}
                                            </Text>
                                            {item.verified ? <Text color='#23c16b'>🔒</Text> : null}
                                        </XStack>
                                        <Text color='#a2b3aa' fontSize={11}>
                                            {relativeTime(item.ts)}
                                        </Text>
                                    </XStack>
                                    <Paragraph color='#f5fff8' mt='$1'>
                                        {item.text}
                                    </Paragraph>
                                </YStack>
                            </XStack>
                        </Animated.View>
                    )}
                />

                {typingIndicators.length > 0 ? (
                    <XStack px='$4' pb='$2'>
                        <Text color='#a2b3aa' fontSize={12}>
                            {typingIndicators.join(', ')} typing…
                        </Text>
                    </XStack>
                ) : null}

                <XStack px='$3' pb='$3' pt='$1' alignItems='center' gap='$2'>
                    <BottomSheetTextInput value={draft} onChangeText={setDraft} placeholder='Write a comment...' placeholderTextColor='#9ab0a3' style={styles.input} />
                    <Pressable onPress={handleSend}>
                        <Circle size={40} bg='rgba(35,193,107,0.22)' borderWidth={1} borderColor='#23c16b'>
                            <Text color='#23c16b'>➤</Text>
                        </Circle>
                    </Pressable>
                </XStack>
            </BottomSheetView>
        </BottomSheet>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'rgba(18,42,24,0.88)',
        backdropFilter: 'blur(16px)' as any,
    },
    input: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.28)',
        color: '#f5fff8',
        borderColor: '#23c16b',
        borderWidth: 1,
        borderRadius: 18,
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    avatarBlob: {
        borderTopLeftRadius: 14,
        borderTopRightRadius: 24,
        borderBottomRightRadius: 12,
        borderBottomLeftRadius: 22,
    },
});

export default ChatPanel;
