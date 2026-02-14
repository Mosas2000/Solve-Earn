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

export interface Dispute {
    id: number;
    submissionId: number;
    initiator: string;
    reason: string; // max 100 chars
    createdAt: number;
    votesFor: number;
    votesAgainst: number;
    status: 'open' | 'resolved'; // max 8 chars
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
