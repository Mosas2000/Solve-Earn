export interface Bounty {
    id: number;
    project: string;
    title: string;
    description: string;
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
    severity: 'critical' | 'high' | 'medium' | 'low';
    reportHash: string;
    submittedAt: number;
    status: 'pending' | 'approved' | 'rejected';
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

export interface Dispute {
    id: number;
    submissionId: number;
    initiator: string;
    reason: string;
    createdAt: number;
    votesFor: number;
    votesAgainst: number;
    status: 'open' | 'resolved';
    resolvedAt?: number;
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
