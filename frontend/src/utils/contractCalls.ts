// ---------------------------------------------------------------------------
// Contract interaction layer
//
// Network:
//   The active network and contract address are resolved by the
//   centralised config module (config/network.ts) using environment
//   variables. See .env.example for available options.
//
// Post-condition policy:
//   Every transaction uses PostConditionMode.Deny so the wallet will reject
//   any token transfer that is not explicitly declared. Functions that move
//   STX attach a post-condition specifying the exact (or maximum) amount,
//   while non-transfer operations use an empty post-conditions array.
// ---------------------------------------------------------------------------

import { openContractCall } from '@stacks/connect';
import {
    AnchorMode,
    PostConditionMode,
    uintCV,
    stringUtf8CV,
    stringAsciiCV,
    bufferCV,
    callReadOnlyFunction,
    cvToJSON,
    principalCV,
    boolCV,
    makeStandardSTXPostCondition,
    makeContractSTXPostCondition,
    FungibleConditionCode,
} from '@stacks/transactions';
import { createNetwork, CONTRACT_ADDRESS } from '@/config/network';
import type { CreateBountyForm, SeverityLevel } from '@/types';
import { transactionTracker } from './transactionTracker';
import { getExplorerTxUrl } from './explorerUtils';

const network = createNetwork();
const BOUNTY_CONTRACT = 'bounty-vault';
const REPUTATION_CONTRACT = 'reputation';
const DISPUTE_CONTRACT = 'dispute-resolver';
const ESCROW_CONTRACT = 'escrow';

export async function createBounty(
    formData: CreateBountyForm,
    senderAddress: string,
    onSuccess?: () => void,
    onError?: (error: string) => void
): Promise<string> {
    const durationBlocks = formData.durationDays * 144;

    const totalPoolMicro = formData.totalPool * 1000000;

    // The sender must transfer exactly the total bounty pool into the contract
    const postConditions = [
        makeStandardSTXPostCondition(
            senderAddress,
            FungibleConditionCode.Equal,
            totalPoolMicro
        ),
    ];

    return new Promise((resolve, reject) => {
        const txOptions = {
            contractAddress: CONTRACT_ADDRESS,
            contractName: BOUNTY_CONTRACT,
            functionName: 'create-bounty',
            functionArgs: [
                stringUtf8CV(formData.title),
                stringUtf8CV(formData.description),
                uintCV(totalPoolMicro),
                uintCV(formData.criticalReward * 1000000),
                uintCV(formData.highReward * 1000000),
                uintCV(formData.mediumReward * 1000000),
                uintCV(formData.lowReward * 1000000),
                uintCV(durationBlocks),
            ],
            network,
            anchorMode: AnchorMode.Any,
            postConditionMode: PostConditionMode.Deny,
            postConditions,
            onFinish: (data: any) => {
                console.log('Transaction broadcast:', data);
                const txId = data.txId;

                // Track the transaction
                transactionTracker.trackTransaction(
                    txId,
                    'create-bounty',
                    onSuccess,
                    onError
                );

                resolve(txId);
            },
            onCancel: () => {
                console.log('Transaction canceled');
                const error = 'Transaction canceled by user';
                if (onError) onError(error);
                reject(new Error(error));
            },
        };

        openContractCall(txOptions);
    });
}

export async function submitVulnerability(
    bountyId: number,
    severity: SeverityLevel,
    reportHash: Uint8Array,
    senderAddress: string,
    onSuccess?: () => void,
    onError?: (error: string) => void
): Promise<string> {
    return new Promise((resolve, reject) => {
        const txOptions = {
            contractAddress: CONTRACT_ADDRESS,
            contractName: BOUNTY_CONTRACT,
            functionName: 'submit-vulnerability',
            functionArgs: [
                uintCV(bountyId),
                stringAsciiCV(severity),
                bufferCV(reportHash),
            ],
            network,
            anchorMode: AnchorMode.Any,
            postConditionMode: PostConditionMode.Deny,
            postConditions: [],
            onFinish: (data: any) => {
                console.log('Transaction broadcast:', data);
                const txId = data.txId;

                // Track the transaction
                transactionTracker.trackTransaction(
                    txId,
                    'submit-vulnerability',
                    onSuccess,
                    onError
                );

                resolve(txId);
            },
            onCancel: () => {
                console.log('Transaction canceled');
                const error = 'Transaction canceled by user';
                if (onError) onError(error);
                reject(new Error(error));
            },
        };

        openContractCall(txOptions);
    });
}

export async function approveSubmission(
    submissionId: number,
    rewardAmount: number,
    senderAddress: string,
    onSuccess?: () => void,
    onError?: (error: string) => void
): Promise<string> {
    // The contract pays the researcher, so constrain how much STX leaves it
    const postConditions = [
        makeContractSTXPostCondition(
            CONTRACT_ADDRESS,
            BOUNTY_CONTRACT,
            FungibleConditionCode.LessEqual,
            rewardAmount
        ),
    ];

    return new Promise((resolve, reject) => {
        const txOptions = {
            contractAddress: CONTRACT_ADDRESS,
            contractName: BOUNTY_CONTRACT,
            functionName: 'approve-submission',
            functionArgs: [uintCV(submissionId)],
            network,
            anchorMode: AnchorMode.Any,
            postConditionMode: PostConditionMode.Deny,
            postConditions,
            onFinish: (data: any) => {
                console.log('Transaction broadcast:', data);
                const txId = data.txId;

                // Track the transaction
                transactionTracker.trackTransaction(
                    txId,
                    'approve-submission',
                    onSuccess,
                    onError
                );

                resolve(txId);
            },
            onCancel: () => {
                console.log('Transaction canceled');
                const error = 'Transaction canceled by user';
                if (onError) onError(error);
                reject(new Error(error));
            },
        };

        openContractCall(txOptions);
    });
}

export async function rejectSubmission(
    submissionId: number,
    senderAddress: string,
    onSuccess?: () => void,
    onError?: (error: string) => void
): Promise<string> {
    return new Promise((resolve, reject) => {
        const txOptions = {
            contractAddress: CONTRACT_ADDRESS,
            contractName: BOUNTY_CONTRACT,
            functionName: 'reject-submission',
            functionArgs: [uintCV(submissionId)],
            network,
            anchorMode: AnchorMode.Any,
            postConditionMode: PostConditionMode.Deny,
            postConditions: [],
            onFinish: (data: any) => {
                console.log('Transaction broadcast:', data);
                const txId = data.txId;

                // Track the transaction
                transactionTracker.trackTransaction(
                    txId,
                    'reject-submission',
                    onSuccess,
                    onError
                );

                resolve(txId);
            },
            onCancel: () => {
                console.log('Transaction canceled');
                const error = 'Transaction canceled by user';
                if (onError) onError(error);
                reject(new Error(error));
            },
        };

        openContractCall(txOptions);
    });
}

export async function getBounty(bountyId: number, senderAddress: string) {
    try {
        const result = await callReadOnlyFunction({
            contractAddress: CONTRACT_ADDRESS,
            contractName: BOUNTY_CONTRACT,
            functionName: 'get-bounty',
            functionArgs: [uintCV(bountyId)],
            network,
            senderAddress,
        });

        const parsed = cvToJSON(result);
        validateReadOnlyResponse(parsed, 'getBounty');
        return parsed;
    } catch (error) {
        console.error(`getBounty(${bountyId}) failed:`, error);
        throw new Error(`Failed to fetch bounty #${bountyId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export async function getSubmission(submissionId: number, senderAddress: string) {
    try {
        const result = await callReadOnlyFunction({
            contractAddress: CONTRACT_ADDRESS,
            contractName: BOUNTY_CONTRACT,
            functionName: 'get-submission',
            functionArgs: [uintCV(submissionId)],
            network,
            senderAddress,
        });

        const parsed = cvToJSON(result);
        validateReadOnlyResponse(parsed, 'getSubmission');
        return parsed;
    } catch (error) {
        console.error(`getSubmission(${submissionId}) failed:`, error);
        throw new Error(`Failed to fetch submission #${submissionId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export async function getTotalBounties(senderAddress: string) {
    try {
        const result = await callReadOnlyFunction({
            contractAddress: CONTRACT_ADDRESS,
            contractName: BOUNTY_CONTRACT,
            functionName: 'get-total-bounties',
            functionArgs: [],
            network,
            senderAddress,
        });

        const parsed = cvToJSON(result);
        validateReadOnlyResponse(parsed, 'getTotalBounties');
        return parsed;
    } catch (error) {
        console.error('getTotalBounties failed:', error);
        throw new Error(`Failed to fetch total bounties count: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export async function getTotalSubmissions(senderAddress: string) {
    try {
        const result = await callReadOnlyFunction({
            contractAddress: CONTRACT_ADDRESS,
            contractName: BOUNTY_CONTRACT,
            functionName: 'get-total-submissions',
            functionArgs: [],
            network,
            senderAddress,
        });

        const parsed = cvToJSON(result);
        validateReadOnlyResponse(parsed, 'getTotalSubmissions');
        return parsed;
    } catch (error) {
        console.error('getTotalSubmissions failed:', error);
        throw new Error(`Failed to fetch total submissions count: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export async function closeBounty(
    bountyId: number,
    remainingPool: number,
    senderAddress: string,
    onSuccess?: () => void,
    onError?: (error: string) => void
): Promise<string> {
    // The contract refunds up to remainingPool STX back to the bounty owner
    const postConditions = [
        makeContractSTXPostCondition(
            CONTRACT_ADDRESS,
            BOUNTY_CONTRACT,
            FungibleConditionCode.LessEqual,
            remainingPool
        ),
    ];

    return new Promise((resolve, reject) => {
        const txOptions = {
            contractAddress: CONTRACT_ADDRESS,
            contractName: BOUNTY_CONTRACT,
            functionName: 'close-bounty',
            functionArgs: [uintCV(bountyId)],
            network,
            anchorMode: AnchorMode.Any,
            postConditionMode: PostConditionMode.Deny,
            postConditions,
            onFinish: (data: any) => {
                console.log('Close bounty transaction sent:', data);
                const txId = data.txId;
                transactionTracker.trackTransaction(txId, 'close-bounty', onSuccess, onError);
                resolve(txId);
            },
            onCancel: () => {
                const error = 'Close bounty canceled by user';
                if (onError) onError(error);
                reject(new Error(error));
            },
        };

        openContractCall(txOptions);
    });
}

export async function registerResearcher(senderAddress: string) {
    const txOptions = {
        contractAddress: CONTRACT_ADDRESS,
        contractName: REPUTATION_CONTRACT,
        functionName: 'register-researcher',
        functionArgs: [],
        network,
        anchorMode: AnchorMode.Any,
        postConditionMode: PostConditionMode.Deny,
        postConditions: [],
        onFinish: (data: any) => {
            console.log('Transaction sent:', data);
        },
        onCancel: () => {
            console.log('Transaction canceled');
        },
    };

    await openContractCall(txOptions);
    return 'pending';
}

export async function getResearcherProfile(
    researcher: string,
    senderAddress: string
) {
    try {
        const result = await callReadOnlyFunction({
            contractAddress: CONTRACT_ADDRESS,
            contractName: REPUTATION_CONTRACT,
            functionName: 'get-researcher-profile',
            functionArgs: [principalCV(researcher)],
            network,
            senderAddress,
        });

        const parsed = cvToJSON(result);
        validateReadOnlyResponse(parsed, 'getResearcherProfile');
        return parsed;
    } catch (error) {
        console.error(`getResearcherProfile(${researcher}) failed:`, error);
        throw new Error(`Failed to fetch researcher profile for ${researcher}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export async function getReputationScore(
    researcher: string,
    senderAddress: string
) {
    try {
        const result = await callReadOnlyFunction({
            contractAddress: CONTRACT_ADDRESS,
            contractName: REPUTATION_CONTRACT,
            functionName: 'get-reputation-score',
            functionArgs: [principalCV(researcher)],
            network,
            senderAddress,
        });

        const parsed = cvToJSON(result);
        validateReadOnlyResponse(parsed, 'getReputationScore');
        return parsed;
    } catch (error) {
        console.error(`getReputationScore(${researcher}) failed:`, error);
        throw new Error(`Failed to fetch reputation score for ${researcher}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export async function getTotalResearchers(senderAddress: string) {
    try {
        const result = await callReadOnlyFunction({
            contractAddress: CONTRACT_ADDRESS,
            contractName: REPUTATION_CONTRACT,
            functionName: 'get-total-researchers',
            functionArgs: [],
            network,
            senderAddress,
        });

        const parsed = cvToJSON(result);
        validateReadOnlyResponse(parsed, 'getTotalResearchers');
        return parsed;
    } catch (error) {
        console.error('getTotalResearchers failed:', error);
        throw new Error(`Failed to fetch total researchers count: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export async function getResearcherList(senderAddress: string): Promise<string[]> {
    try {
        const result = await callReadOnlyFunction({
            contractAddress: CONTRACT_ADDRESS,
            contractName: REPUTATION_CONTRACT,
            functionName: 'get-researcher-list',
            functionArgs: [],
            network,
            senderAddress,
        });

        const parsed = cvToJSON(result);
        validateReadOnlyResponse(parsed, 'getResearcherList');

        // The response is (ok (list principal)) — extract the principal strings
        if (parsed?.value && Array.isArray(parsed.value)) {
            return parsed.value.map((item: any) => item.value as string);
        }
        return [];
    } catch (error) {
        console.error('getResearcherList failed:', error);
        throw new Error(`Failed to fetch researcher list: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export async function calculateSuccessRate(
    researcher: string,
    senderAddress: string
) {
    try {
        const result = await callReadOnlyFunction({
            contractAddress: CONTRACT_ADDRESS,
            contractName: REPUTATION_CONTRACT,
            functionName: 'calculate-success-rate',
            functionArgs: [principalCV(researcher)],
            network,
            senderAddress,
        });

        const parsed = cvToJSON(result);
        validateReadOnlyResponse(parsed, 'calculateSuccessRate');
        return parsed;
    } catch (error) {
        console.error(`calculateSuccessRate(${researcher}) failed:`, error);
        throw new Error(`Failed to calculate success rate for ${researcher}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export async function registerArbiter(senderAddress: string) {
    const txOptions = {
        contractAddress: CONTRACT_ADDRESS,
        contractName: DISPUTE_CONTRACT,
        functionName: 'register-arbiter',
        functionArgs: [],
        network,
        anchorMode: AnchorMode.Any,
        postConditionMode: PostConditionMode.Deny,
        postConditions: [],
        onFinish: (data: any) => {
            console.log('Transaction sent:', data);
        },
        onCancel: () => {
            console.log('Transaction canceled');
        },
    };

    await openContractCall(txOptions);
    return 'pending';
}

export async function createDispute(
    submissionId: number,
    reason: string,
    senderAddress: string
) {
    const txOptions = {
        contractAddress: CONTRACT_ADDRESS,
        contractName: DISPUTE_CONTRACT,
        functionName: 'create-dispute',
        functionArgs: [uintCV(submissionId), stringUtf8CV(reason)],
        network,
        anchorMode: AnchorMode.Any,
        postConditionMode: PostConditionMode.Deny,
        postConditions: [],
        onFinish: (data: any) => {
            console.log('Transaction sent:', data);
        },
        onCancel: () => {
            console.log('Transaction canceled');
        },
    };

    await openContractCall(txOptions);
    return 'pending';
}

export async function voteOnDispute(
    disputeId: number,
    vote: boolean,
    senderAddress: string
) {
    const txOptions = {
        contractAddress: CONTRACT_ADDRESS,
        contractName: DISPUTE_CONTRACT,
        functionName: 'vote-on-dispute',
        functionArgs: [uintCV(disputeId), boolCV(vote)],
        network,
        anchorMode: AnchorMode.Any,
        postConditionMode: PostConditionMode.Deny,
        postConditions: [],
        onFinish: (data: any) => {
            console.log('Transaction sent:', data);
        },
        onCancel: () => {
            console.log('Transaction canceled');
        },
    };

    await openContractCall(txOptions);
    return 'pending';
}

export async function getDispute(disputeId: number, senderAddress: string) {
    try {
        const result = await callReadOnlyFunction({
            contractAddress: CONTRACT_ADDRESS,
            contractName: DISPUTE_CONTRACT,
            functionName: 'get-dispute',
            functionArgs: [uintCV(disputeId)],
            network,
            senderAddress,
        });

        const parsed = cvToJSON(result);
        validateReadOnlyResponse(parsed, 'getDispute');
        return parsed;
    } catch (error) {
        console.error(`getDispute(${disputeId}) failed:`, error);
        throw new Error(`Failed to fetch dispute #${disputeId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export async function resolveDispute(
    disputeId: number,
    senderAddress: string,
    onSuccess?: () => void,
    onError?: (error: string) => void
): Promise<string> {
    return new Promise((resolve, reject) => {
        const txOptions = {
            contractAddress: CONTRACT_ADDRESS,
            contractName: DISPUTE_CONTRACT,
            functionName: 'resolve-dispute',
            functionArgs: [uintCV(disputeId)],
            network,
            anchorMode: AnchorMode.Any,
            postConditionMode: PostConditionMode.Deny,
            postConditions: [],
            onFinish: (data: any) => {
                console.log('Dispute resolution broadcast:', data);
                const txId = data.txId;
                transactionTracker.trackTransaction(txId, 'resolve-dispute', onSuccess, onError);
                resolve(txId);
            },
            onCancel: () => {
                const error = 'Dispute resolution canceled by user';
                if (onError) onError(error);
                reject(new Error(error));
            },
        };

        openContractCall(txOptions);
    });
}

export async function getVotingDeadline(disputeId: number, senderAddress: string) {
    try {
        const result = await callReadOnlyFunction({
            contractAddress: CONTRACT_ADDRESS,
            contractName: DISPUTE_CONTRACT,
            functionName: 'get-voting-deadline',
            functionArgs: [uintCV(disputeId)],
            network,
            senderAddress,
        });

        const parsed = cvToJSON(result);
        validateReadOnlyResponse(parsed, 'getVotingDeadline');
        return parsed;
    } catch (error) {
        console.error(`getVotingDeadline(${disputeId}) failed:`, error);
        throw new Error(`Failed to fetch voting deadline for dispute #${disputeId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export async function getArbiterStats(arbiter: string, senderAddress: string) {
    try {
        const result = await callReadOnlyFunction({
            contractAddress: CONTRACT_ADDRESS,
            contractName: DISPUTE_CONTRACT,
            functionName: 'get-arbiter-stats',
            functionArgs: [principalCV(arbiter)],
            network,
            senderAddress,
        });

        const parsed = cvToJSON(result);
        validateReadOnlyResponse(parsed, 'getArbiterStats');
        return parsed;
    } catch (error) {
        console.error(`getArbiterStats(${arbiter}) failed:`, error);
        throw new Error(`Failed to fetch arbiter stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export async function getTotalDisputes(senderAddress: string) {
    try {
        const result = await callReadOnlyFunction({
            contractAddress: CONTRACT_ADDRESS,
            contractName: DISPUTE_CONTRACT,
            functionName: 'get-total-disputes',
            functionArgs: [],
            network,
            senderAddress,
        });

        const parsed = cvToJSON(result);
        validateReadOnlyResponse(parsed, 'getTotalDisputes');
        return parsed;
    } catch (error) {
        console.error('getTotalDisputes failed:', error);
        throw new Error(`Failed to fetch total disputes count: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

// Type guards and validation helpers
function validateReadOnlyResponse(response: any, functionName: string): void {
    if (!response) {
        throw new Error(`${functionName} returned null or undefined`);
    }

    if (response.error) {
        throw new Error(`${functionName} returned error: ${JSON.stringify(response.error)}`);
    }
}

function isValidClarityValue(value: any): boolean {
    return value !== null && value !== undefined && typeof value === 'object';
}

function extractUintValue(cv: any, fieldName: string): number {
    if (!cv?.value) {
        throw new Error(`Missing or invalid ${fieldName} value`);
    }
    const num = typeof cv.value === 'string' ? parseInt(cv.value, 10) : cv.value;
    if (isNaN(num)) {
        throw new Error(`Invalid numeric value for ${fieldName}`);
    }
    return num;
}

function extractStringValue(cv: any, fieldName: string): string {
    if (!cv?.value || typeof cv.value !== 'string') {
        throw new Error(`Missing or invalid ${fieldName} value`);
    }
    return cv.value;
}

function extractBoolValue(cv: any, fieldName: string): boolean {
    if (cv?.value === undefined || typeof cv.value !== 'boolean') {
        throw new Error(`Missing or invalid ${fieldName} value`);
    }
    return cv.value;
}

// ---------------------------------------------------------------------------
// Escrow contract calls
// ---------------------------------------------------------------------------

export async function createEscrow(
    worker: string,
    totalAmount: number,
    durationBlocks: number,
    senderAddress: string,
    onSuccess?: () => void,
    onError?: (error: string) => void
): Promise<string> {
    // The sender must transfer exactly totalAmount into the escrow contract
    const postConditions = [
        makeStandardSTXPostCondition(
            senderAddress,
            FungibleConditionCode.Equal,
            totalAmount
        ),
    ];

    return new Promise((resolve, reject) => {
        const txOptions = {
            contractAddress: CONTRACT_ADDRESS,
            contractName: ESCROW_CONTRACT,
            functionName: 'create-escrow',
            functionArgs: [
                principalCV(worker),
                uintCV(totalAmount),
                uintCV(durationBlocks),
            ],
            network,
            anchorMode: AnchorMode.Any,
            postConditionMode: PostConditionMode.Deny,
            postConditions,
            onFinish: (data: any) => {
                console.log('Escrow creation broadcast:', data);
                const txId = data.txId;
                transactionTracker.trackTransaction(txId, 'create-escrow', onSuccess, onError);
                resolve(txId);
            },
            onCancel: () => {
                const error = 'Escrow creation canceled by user';
                if (onError) onError(error);
                reject(new Error(error));
            },
        };

        openContractCall(txOptions);
    });
}

export async function addMilestone(
    escrowId: number,
    description: string,
    amount: number,
    senderAddress: string,
    onSuccess?: () => void,
    onError?: (error: string) => void
): Promise<string> {
    return new Promise((resolve, reject) => {
        const txOptions = {
            contractAddress: CONTRACT_ADDRESS,
            contractName: ESCROW_CONTRACT,
            functionName: 'add-milestone',
            functionArgs: [
                uintCV(escrowId),
                stringUtf8CV(description),
                uintCV(amount),
            ],
            network,
            anchorMode: AnchorMode.Any,
            postConditionMode: PostConditionMode.Deny,
            postConditions: [],
            onFinish: (data: any) => {
                console.log('Milestone added:', data);
                const txId = data.txId;
                transactionTracker.trackTransaction(txId, 'add-milestone', onSuccess, onError);
                resolve(txId);
            },
            onCancel: () => {
                const error = 'Add milestone canceled by user';
                if (onError) onError(error);
                reject(new Error(error));
            },
        };

        openContractCall(txOptions);
    });
}

export async function activateEscrow(
    escrowId: number,
    senderAddress: string,
    onSuccess?: () => void,
    onError?: (error: string) => void
): Promise<string> {
    return new Promise((resolve, reject) => {
        const txOptions = {
            contractAddress: CONTRACT_ADDRESS,
            contractName: ESCROW_CONTRACT,
            functionName: 'activate-escrow',
            functionArgs: [uintCV(escrowId)],
            network,
            anchorMode: AnchorMode.Any,
            postConditionMode: PostConditionMode.Deny,
            postConditions: [],
            onFinish: (data: any) => {
                console.log('Escrow activated:', data);
                const txId = data.txId;
                transactionTracker.trackTransaction(txId, 'activate-escrow', onSuccess, onError);
                resolve(txId);
            },
            onCancel: () => {
                const error = 'Escrow activation canceled by user';
                if (onError) onError(error);
                reject(new Error(error));
            },
        };

        openContractCall(txOptions);
    });
}

export async function releaseMilestone(
    escrowId: number,
    milestoneIndex: number,
    milestoneAmount: number,
    senderAddress: string,
    onSuccess?: () => void,
    onError?: (error: string) => void
): Promise<string> {
    // The contract pays the worker for this milestone
    const postConditions = [
        makeContractSTXPostCondition(
            CONTRACT_ADDRESS,
            ESCROW_CONTRACT,
            FungibleConditionCode.Equal,
            milestoneAmount
        ),
    ];

    return new Promise((resolve, reject) => {
        const txOptions = {
            contractAddress: CONTRACT_ADDRESS,
            contractName: ESCROW_CONTRACT,
            functionName: 'release-milestone',
            functionArgs: [
                uintCV(escrowId),
                uintCV(milestoneIndex),
            ],
            network,
            anchorMode: AnchorMode.Any,
            postConditionMode: PostConditionMode.Deny,
            postConditions,
            onFinish: (data: any) => {
                console.log('Milestone released:', data);
                const txId = data.txId;
                transactionTracker.trackTransaction(txId, 'release-milestone', onSuccess, onError);
                resolve(txId);
            },
            onCancel: () => {
                const error = 'Milestone release canceled by user';
                if (onError) onError(error);
                reject(new Error(error));
            },
        };

        openContractCall(txOptions);
    });
}

export async function disputeEscrow(
    escrowId: number,
    senderAddress: string,
    onSuccess?: () => void,
    onError?: (error: string) => void
): Promise<string> {
    return new Promise((resolve, reject) => {
        const txOptions = {
            contractAddress: CONTRACT_ADDRESS,
            contractName: ESCROW_CONTRACT,
            functionName: 'dispute-escrow',
            functionArgs: [uintCV(escrowId)],
            network,
            anchorMode: AnchorMode.Any,
            postConditionMode: PostConditionMode.Deny,
            postConditions: [],
            onFinish: (data: any) => {
                console.log('Escrow disputed:', data);
                const txId = data.txId;
                transactionTracker.trackTransaction(txId, 'dispute-escrow', onSuccess, onError);
                resolve(txId);
            },
            onCancel: () => {
                const error = 'Escrow dispute canceled by user';
                if (onError) onError(error);
                reject(new Error(error));
            },
        };

        openContractCall(txOptions);
    });
}

export async function completeEscrow(
    escrowId: number,
    senderAddress: string,
    onSuccess?: () => void,
    onError?: (error: string) => void
): Promise<string> {
    return new Promise((resolve, reject) => {
        const txOptions = {
            contractAddress: CONTRACT_ADDRESS,
            contractName: ESCROW_CONTRACT,
            functionName: 'complete-escrow',
            functionArgs: [uintCV(escrowId)],
            network,
            anchorMode: AnchorMode.Any,
            postConditionMode: PostConditionMode.Deny,
            postConditions: [],
            onFinish: (data: any) => {
                console.log('Escrow completed:', data);
                const txId = data.txId;
                transactionTracker.trackTransaction(txId, 'complete-escrow', onSuccess, onError);
                resolve(txId);
            },
            onCancel: () => {
                const error = 'Escrow completion canceled by user';
                if (onError) onError(error);
                reject(new Error(error));
            },
        };

        openContractCall(txOptions);
    });
}

export async function refundEscrow(
    escrowId: number,
    expectedRefund: number,
    senderAddress: string,
    onSuccess?: () => void,
    onError?: (error: string) => void
): Promise<string> {
    // The contract refunds remaining funds back to the employer
    const postConditions = [
        makeContractSTXPostCondition(
            CONTRACT_ADDRESS,
            ESCROW_CONTRACT,
            FungibleConditionCode.LessEqual,
            expectedRefund
        ),
    ];

    return new Promise((resolve, reject) => {
        const txOptions = {
            contractAddress: CONTRACT_ADDRESS,
            contractName: ESCROW_CONTRACT,
            functionName: 'refund-escrow',
            functionArgs: [uintCV(escrowId)],
            network,
            anchorMode: AnchorMode.Any,
            postConditionMode: PostConditionMode.Deny,
            postConditions,
            onFinish: (data: any) => {
                console.log('Escrow refunded:', data);
                const txId = data.txId;
                transactionTracker.trackTransaction(txId, 'refund-escrow', onSuccess, onError);
                resolve(txId);
            },
            onCancel: () => {
                const error = 'Escrow refund canceled by user';
                if (onError) onError(error);
                reject(new Error(error));
            },
        };

        openContractCall(txOptions);
    });
}

export async function getEscrow(escrowId: number, senderAddress: string) {
    try {
        const result = await callReadOnlyFunction({
            contractAddress: CONTRACT_ADDRESS,
            contractName: ESCROW_CONTRACT,
            functionName: 'get-escrow',
            functionArgs: [uintCV(escrowId)],
            network,
            senderAddress,
        });

        const parsed = cvToJSON(result);
        validateReadOnlyResponse(parsed, 'getEscrow');
        return parsed;
    } catch (error) {
        console.error(`getEscrow(${escrowId}) failed:`, error);
        throw new Error(`Failed to fetch escrow #${escrowId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export async function getMilestone(escrowId: number, milestoneIndex: number, senderAddress: string) {
    try {
        const result = await callReadOnlyFunction({
            contractAddress: CONTRACT_ADDRESS,
            contractName: ESCROW_CONTRACT,
            functionName: 'get-milestone',
            functionArgs: [uintCV(escrowId), uintCV(milestoneIndex)],
            network,
            senderAddress,
        });

        const parsed = cvToJSON(result);
        validateReadOnlyResponse(parsed, 'getMilestone');
        return parsed;
    } catch (error) {
        console.error(`getMilestone(${escrowId}, ${milestoneIndex}) failed:`, error);
        throw new Error(`Failed to fetch milestone: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export async function getTotalEscrows(senderAddress: string) {
    try {
        const result = await callReadOnlyFunction({
            contractAddress: CONTRACT_ADDRESS,
            contractName: ESCROW_CONTRACT,
            functionName: 'get-total-escrows',
            functionArgs: [],
            network,
            senderAddress,
        });

        const parsed = cvToJSON(result);
        validateReadOnlyResponse(parsed, 'getTotalEscrows');
        return parsed;
    } catch (error) {
        console.error('getTotalEscrows failed:', error);
        throw new Error(`Failed to fetch total escrows count: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
