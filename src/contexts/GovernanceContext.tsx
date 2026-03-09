import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EventEmitter } from 'events';
import type { MatrixClient, Room } from 'matrix-js-sdk';
import * as Y from 'yjs';
import { MatrixProvider as YMatrixProvider } from 'y-matrix';
import { open } from '@op-engineering/op-sqlite';
import { useMatrix } from './MatrixContext';

const PROPOSAL_STATE_EVENT = 'im.blackout.governance.proposal';
const VOTE_EVENT = 'im.blackout.governance.vote';
const DELEGATION_EVENT = 'im.blackout.governance.delegation';

type ProposalStage = 'draft' | 'discuss' | 'amend' | 'close' | 'decide';
type Ballot = 'approve' | 'reject' | 'abstain';

interface GovernanceConfig {
    quorumThreshold: number;
    delegationDepthLimit: number;
}

interface ProposalRecord {
    id: string;
    roomId: string;
    title: string;
    body: string;
    stage: ProposalStage;
    authorId: string;
    updatedAt: number;
}

interface VoteRecord {
    proposalId: string;
    voterId: string;
    ballot: Ballot;
    ts: number;
}

interface DelegationRecord {
    roomId: string;
    delegator: string;
    delegate: string;
    attestation: string;
    ts: number;
}

class GovernanceConfigStore {
    private readonly key = 'BLACKOUT_GOVERNANCE_CONFIG';

    async get(): Promise<GovernanceConfig> {
        const raw = await AsyncStorage.getItem(this.key);
        if (!raw) {
            return { quorumThreshold: 0.5, delegationDepthLimit: 5 };
        }

        try {
            const parsed = JSON.parse(raw) as Partial<GovernanceConfig>;
            return {
                quorumThreshold: parsed.quorumThreshold ?? 0.5,
                delegationDepthLimit: parsed.delegationDepthLimit ?? 5,
            };
        } catch {
            return { quorumThreshold: 0.5, delegationDepthLimit: 5 };
        }
    }

    async set(next: Partial<GovernanceConfig>) {
        const current = await this.get();
        await AsyncStorage.setItem(this.key, JSON.stringify({ ...current, ...next }));
    }
}

class GovernanceSqliteStore {
    private readonly db = open({ name: 'blackout-governance.db' });

    async migrate() {
        await this.db.execute(`
            CREATE TABLE IF NOT EXISTS proposals (
              id TEXT PRIMARY KEY,
              room_id TEXT NOT NULL,
              title TEXT NOT NULL,
              body TEXT NOT NULL,
              stage TEXT NOT NULL,
              author_id TEXT NOT NULL,
              updated_at INTEGER NOT NULL
            );
        `);

        await this.db.execute(`
            CREATE TABLE IF NOT EXISTS votes (
              proposal_id TEXT NOT NULL,
              voter_id TEXT NOT NULL,
              ballot TEXT NOT NULL,
              ts INTEGER NOT NULL,
              PRIMARY KEY (proposal_id, voter_id)
            );
        `);

        await this.db.execute(`
            CREATE TABLE IF NOT EXISTS delegations (
              room_id TEXT NOT NULL,
              delegator TEXT NOT NULL,
              delegate TEXT NOT NULL,
              attestation TEXT NOT NULL,
              ts INTEGER NOT NULL,
              PRIMARY KEY (room_id, delegator)
            );
        `);
    }

    async upsertProposal(record: ProposalRecord) {
        await this.db.execute(
            `
              INSERT INTO proposals (id, room_id, title, body, stage, author_id, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET
                title=excluded.title,
                body=excluded.body,
                stage=excluded.stage,
                updated_at=excluded.updated_at;
            `,
            [record.id, record.roomId, record.title, record.body, record.stage, record.authorId, record.updatedAt]
        );
    }

    async listProposals(roomId: string): Promise<ProposalRecord[]> {
        const result = await this.db.execute('SELECT * FROM proposals WHERE room_id = ? ORDER BY updated_at DESC;', [roomId]);
        return (result.rows ?? []) as ProposalRecord[];
    }

    async upsertVote(record: VoteRecord) {
        await this.db.execute(
            `
              INSERT INTO votes (proposal_id, voter_id, ballot, ts)
              VALUES (?, ?, ?, ?)
              ON CONFLICT(proposal_id, voter_id) DO UPDATE SET
                ballot=excluded.ballot,
                ts=excluded.ts;
            `,
            [record.proposalId, record.voterId, record.ballot, record.ts]
        );
    }

    async listVotes(proposalId: string): Promise<VoteRecord[]> {
        const result = await this.db.execute('SELECT * FROM votes WHERE proposal_id = ? ORDER BY ts ASC;', [proposalId]);
        return (result.rows ?? []) as VoteRecord[];
    }

    async upsertDelegation(record: DelegationRecord) {
        await this.db.execute(
            `
              INSERT INTO delegations (room_id, delegator, delegate, attestation, ts)
              VALUES (?, ?, ?, ?, ?)
              ON CONFLICT(room_id, delegator) DO UPDATE SET
                delegate=excluded.delegate,
                attestation=excluded.attestation,
                ts=excluded.ts;
            `,
            [record.roomId, record.delegator, record.delegate, record.attestation, record.ts]
        );
    }

    async listDelegations(roomId: string): Promise<DelegationRecord[]> {
        const result = await this.db.execute('SELECT * FROM delegations WHERE room_id = ? ORDER BY ts ASC;', [roomId]);
        return (result.rows ?? []) as DelegationRecord[];
    }
}

class ProposalEngine extends EventEmitter {
    private readonly yDocs = new Map<string, Y.Doc>();
    private readonly yProviders = new Map<string, YMatrixProvider>();

    constructor(
        private readonly matrixClient: MatrixClient,
        private readonly sqlite: GovernanceSqliteStore
    ) {
        super();
    }

    private getRoom(roomId: string): Room {
        const room = this.matrixClient.getRoom(roomId);
        if (!room) throw new Error(`Matrix room not found: ${roomId}`);
        return room;
    }

    private ensureDoc(roomId: string): Y.Doc {
        const cached = this.yDocs.get(roomId);
        if (cached) return cached;

        const doc = new Y.Doc();
        const room = this.getRoom(roomId);
        const provider = new YMatrixProvider(roomId, doc, {
            matrixClient: this.matrixClient,
            room,
            type: PROPOSAL_STATE_EVENT,
        } as any);

        provider.on('sync', () => this.emit('changed', roomId));
        this.yDocs.set(roomId, doc);
        this.yProviders.set(roomId, provider);
        return doc;
    }

    async createProposal(input: Omit<ProposalRecord, 'updatedAt'>): Promise<ProposalRecord> {
        const record: ProposalRecord = { ...input, updatedAt: Date.now() };
        const doc = this.ensureDoc(record.roomId);
        const map = doc.getMap('proposals');
        map.set(record.id, record);

        await this.sqlite.upsertProposal(record);
        await this.matrixClient.sendStateEvent(record.roomId, PROPOSAL_STATE_EVENT, record, record.id);

        this.emit('changed', record.roomId);
        return record;
    }

    async transitionProposal(roomId: string, proposalId: string, stage: ProposalStage): Promise<void> {
        const proposals = await this.sqlite.listProposals(roomId);
        const proposal = proposals.find((item) => item.id === proposalId);
        if (!proposal) throw new Error('Proposal not found');

        const next = { ...proposal, stage, updatedAt: Date.now() };
        this.ensureDoc(roomId).getMap('proposals').set(proposalId, next);
        await this.sqlite.upsertProposal(next);
        await this.matrixClient.sendStateEvent(roomId, PROPOSAL_STATE_EVENT, next, proposalId);
        this.emit('changed', roomId);
    }

    async listProposals(roomId: string): Promise<ProposalRecord[]> {
        this.ensureDoc(roomId);
        return this.sqlite.listProposals(roomId);
    }
}

class VotingEngine extends EventEmitter {
    constructor(
        private readonly matrixClient: MatrixClient,
        private readonly sqlite: GovernanceSqliteStore,
        private readonly configStore: GovernanceConfigStore
    ) {
        super();
    }

    async castVote(roomId: string, proposalId: string, voterId: string, ballot: Ballot): Promise<void> {
        const vote: VoteRecord = { proposalId, voterId, ballot, ts: Date.now() };
        await this.sqlite.upsertVote(vote);

        await this.matrixClient.sendEvent(roomId, VOTE_EVENT, {
            proposal_id: proposalId,
            voter_id: voterId,
            ballot,
            ts: vote.ts,
        });

        this.emit('changed', proposalId);
    }

    async tally(proposalId: string): Promise<Record<Ballot, number>> {
        const votes = await this.sqlite.listVotes(proposalId);
        return votes.reduce<Record<Ballot, number>>(
            (acc, vote) => {
                acc[vote.ballot] += 1;
                return acc;
            },
            { approve: 0, reject: 0, abstain: 0 }
        );
    }

    async hasQuorum(proposalId: string, eligibleVoterCount: number): Promise<boolean> {
        const threshold = (await this.configStore.get()).quorumThreshold;
        const votes = await this.sqlite.listVotes(proposalId);
        if (eligibleVoterCount <= 0) return false;
        return votes.length / eligibleVoterCount >= threshold;
    }

    async listVotes(proposalId: string): Promise<VoteRecord[]> {
        return this.sqlite.listVotes(proposalId);
    }
}

class DelegatedVotingEngine extends EventEmitter {
    constructor(
        private readonly matrixClient: MatrixClient,
        private readonly sqlite: GovernanceSqliteStore,
        private readonly configStore: GovernanceConfigStore
    ) {
        super();
    }

    private async verifyAttestation(attestation: string): Promise<boolean> {
        return Boolean(attestation && attestation.length > 16);
    }

    async delegate(roomId: string, delegator: string, delegate: string, attestation: string): Promise<void> {
        if (!(await this.verifyAttestation(attestation))) {
            throw new Error('Delegation attestation verification failed');
        }

        const record: DelegationRecord = { roomId, delegator, delegate, attestation, ts: Date.now() };
        await this.sqlite.upsertDelegation(record);

        await this.matrixClient.sendEvent(roomId, DELEGATION_EVENT, {
            delegator,
            delegate,
            attestation,
            ts: record.ts,
        });

        this.emit('changed', roomId);
    }

    async resolveDelegationChain(roomId: string, userId: string): Promise<string[]> {
        const chain: string[] = [userId];
        const all = await this.sqlite.listDelegations(roomId);
        const depthLimit = (await this.configStore.get()).delegationDepthLimit;

        let current = userId;
        while (chain.length < depthLimit) {
            const link = all.find((item) => item.delegator === current);
            if (!link || chain.includes(link.delegate)) break;
            chain.push(link.delegate);
            current = link.delegate;
        }

        return chain;
    }

    async listDelegations(roomId: string): Promise<DelegationRecord[]> {
        return this.sqlite.listDelegations(roomId);
    }
}

interface GovernanceContextValue {
    proposalEngine: ProposalEngine | null;
    votingEngine: VotingEngine | null;
    delegationEngine: DelegatedVotingEngine | null;
}

const GovernanceContext = createContext<GovernanceContextValue>({
    proposalEngine: null,
    votingEngine: null,
    delegationEngine: null,
});

export const GovernanceProvider = ({ children }) => {
    const { client } = useMatrix();
    const [proposalEngine, setProposalEngine] = useState<ProposalEngine | null>(null);
    const [votingEngine, setVotingEngine] = useState<VotingEngine | null>(null);
    const [delegationEngine, setDelegationEngine] = useState<DelegatedVotingEngine | null>(null);

    useEffect(() => {
        if (!client) return;

        const sqlite = new GovernanceSqliteStore();
        const configStore = new GovernanceConfigStore();

        (async () => {
            await sqlite.migrate();
            setProposalEngine(new ProposalEngine(client as MatrixClient, sqlite));
            setVotingEngine(new VotingEngine(client as MatrixClient, sqlite, configStore));
            setDelegationEngine(new DelegatedVotingEngine(client as MatrixClient, sqlite, configStore));
        })();
    }, [client]);

    const value = useMemo(
        () => ({
            proposalEngine,
            votingEngine,
            delegationEngine,
        }),
        [proposalEngine, votingEngine, delegationEngine]
    );

    return <GovernanceContext.Provider value={value}>{children}</GovernanceContext.Provider>;
};

const useGovernance = () => useContext(GovernanceContext);

export const useProposals = (roomId: string) => {
    const { proposalEngine } = useGovernance();
    const [proposals, setProposals] = useState<ProposalRecord[]>([]);

    useEffect(() => {
        if (!proposalEngine || !roomId) return;

        const sync = async () => setProposals(await proposalEngine.listProposals(roomId));
        sync();

        const listener = (changedRoomId: string) => {
            if (changedRoomId === roomId) {
                sync();
            }
        };

        proposalEngine.on('changed', listener);
        return () => {
            proposalEngine.off('changed', listener);
        };
    }, [proposalEngine, roomId]);

    return {
        proposals,
        createProposal: proposalEngine?.createProposal.bind(proposalEngine),
        transitionProposal: proposalEngine?.transitionProposal.bind(proposalEngine),
    };
};

export const useVoting = (proposalId: string) => {
    const { votingEngine } = useGovernance();
    const [votes, setVotes] = useState<VoteRecord[]>([]);
    const [tally, setTally] = useState<Record<Ballot, number>>({ approve: 0, reject: 0, abstain: 0 });

    useEffect(() => {
        if (!votingEngine || !proposalId) return;

        const sync = async () => {
            setVotes(await votingEngine.listVotes(proposalId));
            setTally(await votingEngine.tally(proposalId));
        };
        sync();

        const listener = (changedProposalId: string) => {
            if (changedProposalId === proposalId) {
                sync();
            }
        };

        votingEngine.on('changed', listener);
        return () => {
            votingEngine.off('changed', listener);
        };
    }, [votingEngine, proposalId]);

    return {
        votes,
        tally,
        castVote: votingEngine?.castVote.bind(votingEngine),
        hasQuorum: votingEngine?.hasQuorum.bind(votingEngine),
    };
};

export const useDelegation = (userId: string, roomId?: string) => {
    const { delegationEngine } = useGovernance();
    const [chain, setChain] = useState<string[]>(userId ? [userId] : []);

    useEffect(() => {
        if (!delegationEngine || !userId || !roomId) return;

        const sync = async () => {
            setChain(await delegationEngine.resolveDelegationChain(roomId, userId));
        };
        sync();

        const listener = (changedRoomId: string) => {
            if (changedRoomId === roomId) {
                sync();
            }
        };

        delegationEngine.on('changed', listener);
        return () => {
            delegationEngine.off('changed', listener);
        };
    }, [delegationEngine, userId, roomId]);

    return {
        delegationChain: chain,
        delegate: delegationEngine?.delegate.bind(delegationEngine),
        listDelegations: roomId ? () => delegationEngine?.listDelegations(roomId) : undefined,
    };
};

export default GovernanceContext;
