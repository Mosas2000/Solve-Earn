export interface Bounty {
    id: number;
    project: string;
    title: string; // max 50 chars
    description: string; // max 200 chars
    totalPool: number;
    remainingPool: number;
    criticalReward: number;
    highReward: number;
    mediumReward: number;
    lowReward: number;
    expiresAt: number;
    createdAt: number;
    isActive: boolean;
}

export interface Submission {
    id: number;
    bountyId: number;
    researcher: string;
    severity: SeverityLevel; // max 8 chars
    reportHash: string;
    submittedAt: number;
    status: 'pending' | 'approved' | 'rejected'; // max 8 chars
    rewardAmount: number;
}

export interface ResearcherProfile {
    researcher: string;
    totalSubmissions: number;
    acceptedSubmissions: number;
    rejectedSubmissions: number;
    totalEarned: number;
    reputationScore: number;
    joinedAt: number;
    isVerified: boolean;
}

export type DisputeStatus = 'open' | 'resolved' | 'rejected';

export interface Dispute {
    id: number;
    submissionId: number;
    initiator: string;
    reason: string; // max 100 chars
    createdAt: number;
    votesFor: number;
    votesAgainst: number;
    status: DisputeStatus;
    resolvedAt?: number;
}

export interface VulnerabilityReport {
    severity: SeverityLevel;
    description: string;
    proofOfConcept: string;
    impact: string;
    recommendation: string;
}

export interface StoredReport extends VulnerabilityReport {
    reportHash: string;
    researcher: string;
    bountyId: number;
    submittedAt: number;
    encrypted: boolean;
}

export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low';

export interface CreateBountyForm {
    title: string;
    description: string;
    totalPool: number;
    criticalReward: number;
    highReward: number;
    mediumReward: number;
    lowReward: number;
    durationDays: number;
}

export type TransactionStatus = 
    | 'pending'       // Wallet popup shown, awaiting user action
    | 'broadcasting'  // Transaction broadcast to network
    | 'confirming'    // Transaction in mempool, waiting for confirmation
    | 'success'       // Transaction confirmed on-chain
    | 'failed'        // Transaction failed during mining
    | 'cancelled';    // User cancelled in wallet

export interface TransactionInfo {
    txId: string;
    status: TransactionStatus;
    functionName: string;
    timestamp: number;
    explorerUrl: string;
    errorMessage?: string;
}

export interface PendingTransaction {
    txId: string;
    functionName: string;
    startedAt: number;
    onSuccess?: () => void;
    onError?: (error: string) => void;
}
