import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import Animated, { FadeIn, FadeOut, Layout, ZoomIn } from 'react-native-reanimated';
import { Paragraph, Text, XStack, YStack } from 'tamagui';
import ChatPanel from './ChatPanel';
import { useMatrix } from '@blackstar/core/src/contexts/MatrixContext';
import { useVoting } from '@blackstar/core/src/contexts/GovernanceContext';

export interface GovernanceProposalFeature {
    type: 'Feature';
    geometry: {
        type: 'Point';
        coordinates: [number, number];
    };
    properties: {
        proposal_id: string;
        title: string;
        status: 'draft' | 'discuss' | 'amend' | 'close' | 'decide';
        vote_tally: { approve: number; reject: number; abstain: number };
        closes_at: string | null;
        room_id: string;
        radius_meters?: number | null;
        description?: string;
        is_closing_soon?: boolean;
    };
}

type VoteChoice = 'approve' | 'reject' | 'abstain';

const markdownBlocks = (markdown?: string) => {
    if (!markdown) return [];
    return markdown
        .split(/\n{2,}/)
        .map((chunk) => chunk.trim())
        .filter(Boolean);
};

const OrganicVoteButton = ({
    color,
    label,
    selected,
    onPress,
}: {
    color: string;
    label: string;
    selected: boolean;
    onPress: () => void;
}) => (
    <Pressable onPress={onPress} style={[styles.voteButton, { borderColor: color, backgroundColor: selected ? `${color}55` : `${color}26` }]}>
        <Text color={selected ? '#ffffff' : color} fontWeight='800'>
            {label}
        </Text>
    </Pressable>
);

const ProposalSheet = ({ proposal, visible, onClose }: { proposal: GovernanceProposalFeature | null; visible: boolean; onClose: () => void }) => {
    const { client } = useMatrix();
    const [selectedVote, setSelectedVote] = useState<VoteChoice | null>(null);
    const [showThread, setShowThread] = useState(false);
    const { tally, castBallot } = useVoting(proposal?.properties.proposal_id ?? '');

    const snapPoints = useMemo(() => ['45%', '92%'], []);
    const totals = tally ?? proposal?.properties.vote_tally ?? { approve: 0, reject: 0, abstain: 0 };
    const totalVotes = Math.max(1, totals.approve + totals.reject + totals.abstain);

    const submitVote = async (choice: VoteChoice) => {
        if (!proposal || !client?.getUserId()) {
            return;
        }

        await (castBallot as any)?.(proposal.properties.room_id, proposal.properties.proposal_id, client.getUserId(), choice);
        setSelectedVote(choice);
    };

    if (!proposal) {
        return null;
    }

    return (
        <>
            <BottomSheet index={visible ? 0 : -1} snapPoints={snapPoints} enablePanDownToClose onClose={onClose} backgroundStyle={{ backgroundColor: '#101710' }}>
                <BottomSheetView style={styles.container}>
                    <Text fontSize={20} fontWeight='800' color='#f7fff6'>
                        {proposal.properties.title}
                    </Text>
                    <Text color='#9cc9a7' mt='$1'>
                        Status: {proposal.properties.status}
                    </Text>

                    <YStack mt='$3' gap='$2'>
                        {markdownBlocks(proposal.properties.description).map((block, idx) => (
                            <Paragraph key={`${block.slice(0, 12)}-${idx}`} color='#eff7ee'>
                                {block.replace(/^#{1,6}\s*/g, '')}
                            </Paragraph>
                        ))}
                    </YStack>

                    <YStack mt='$4' gap='$2'>
                        <Text color='#b9d7be' fontWeight='700'>
                            Live vote tally
                        </Text>
                        {(['approve', 'reject', 'abstain'] as VoteChoice[]).map((key) => {
                            const color = key === 'approve' ? '#22c55e' : key === 'reject' ? '#ef4444' : '#9ca3af';
                            const pct = Math.max(2, Math.round((totals[key] / totalVotes) * 100));
                            return (
                                <YStack key={key} gap='$1'>
                                    <XStack justifyContent='space-between'>
                                        <Text color={color}>{key}</Text>
                                        <Text color='#d6ebd7'>{totals[key]}</Text>
                                    </XStack>
                                    <YStack height={10} borderRadius={999} bg='rgba(255,255,255,0.09)'>
                                        <Animated.View layout={Layout.springify()} style={{ width: `${pct}%`, backgroundColor: color, height: 10, borderRadius: 999 }} />
                                    </YStack>
                                </YStack>
                            );
                        })}
                    </YStack>

                    <XStack mt='$4' gap='$2'>
                        <OrganicVoteButton color='#22c55e' label={selectedVote === 'approve' ? 'Approved ✓' : 'Approve'} selected={selectedVote === 'approve'} onPress={() => submitVote('approve')} />
                        <OrganicVoteButton color='#ef4444' label={selectedVote === 'reject' ? 'Rejected ✓' : 'Reject'} selected={selectedVote === 'reject'} onPress={() => submitVote('reject')} />
                        <OrganicVoteButton color='#9ca3af' label={selectedVote === 'abstain' ? 'Abstained ✓' : 'Abstain'} selected={selectedVote === 'abstain'} onPress={() => submitVote('abstain')} />
                    </XStack>

                    {selectedVote ? (
                        <Animated.View entering={ZoomIn} exiting={FadeOut}>
                            <Text mt='$2' color='#8cf0a7'>
                                Vote recorded: {selectedVote}
                            </Text>
                        </Animated.View>
                    ) : null}

                    <Pressable onPress={() => setShowThread((curr) => !curr)} style={styles.threadButton}>
                        <Text color='#f4fff4' fontWeight='700'>
                            {showThread ? 'Hide discussion' : 'Open discussion'}
                        </Text>
                    </Pressable>
                </BottomSheetView>
            </BottomSheet>

            {showThread ? <Animated.View entering={FadeIn.duration(250)}><ChatPanel roomId={proposal.properties.room_id} mode='overlay' visible onClose={() => setShowThread(false)} /></Animated.View> : null}
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 8,
    },
    voteButton: {
        flex: 1,
        borderWidth: 1,
        borderTopLeftRadius: 18,
        borderTopRightRadius: 26,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 16,
        paddingVertical: 12,
        alignItems: 'center',
    },
    threadButton: {
        marginTop: 16,
        borderWidth: 1,
        borderColor: '#2f7a45',
        borderRadius: 16,
        paddingVertical: 12,
        alignItems: 'center',
        backgroundColor: 'rgba(38,90,50,0.5)',
    },
});

export default ProposalSheet;
