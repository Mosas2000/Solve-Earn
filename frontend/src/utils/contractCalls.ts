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
} from '@stacks/transactions';
import { StacksMainnet } from '@stacks/network';
import type { CreateBountyForm, SeverityLevel } from '../types';

const network = new StacksMainnet();
const CONTRACT_ADDRESS = 'SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T';
const BOUNTY_CONTRACT = 'bounty-vault';
const REPUTATION_CONTRACT = 'reputation';
const DISPUTE_CONTRACT = 'dispute-resolver';

export async function createBounty(
    formData: CreateBountyForm,
    senderAddress: string
) {
    const durationBlocks = formData.durationDays * 144;

    const txOptions = {
        contractAddress: CONTRACT_ADDRESS,
        contractName: BOUNTY_CONTRACT,
        functionName: 'create-bounty',
        functionArgs: [
            stringUtf8CV(formData.title),
            stringUtf8CV(formData.description),
            uintCV(formData.totalPool * 1000000),
            uintCV(formData.criticalReward * 1000000),
            uintCV(formData.highReward * 1000000),
            uintCV(formData.mediumReward * 1000000),
            uintCV(formData.lowReward * 1000000),
            uintCV(durationBlocks),
        ],
        network,
        anchorMode: AnchorMode.Any,
        postConditionMode: PostConditionMode.Allow,
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

export async function submitVulnerability(
    bountyId: number,
    severity: SeverityLevel,
    reportHash: Uint8Array,
    senderAddress: string
) {
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
        postConditionMode: PostConditionMode.Allow,
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

export async function approveSubmission(
    submissionId: number,
    senderAddress: string
) {
    const txOptions = {
        contractAddress: CONTRACT_ADDRESS,
        contractName: BOUNTY_CONTRACT,
        functionName: 'approve-submission',
        functionArgs: [uintCV(submissionId)],
        network,
        anchorMode: AnchorMode.Any,
        postConditionMode: PostConditionMode.Allow,
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

export async function rejectSubmission(
    submissionId: number,
    senderAddress: string
) {
    const txOptions = {
        contractAddress: CONTRACT_ADDRESS,
        contractName: BOUNTY_CONTRACT,
        functionName: 'reject-submission',
        functionArgs: [uintCV(submissionId)],
        network,
        anchorMode: AnchorMode.Any,
        postConditionMode: PostConditionMode.Allow,
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

export async function getBounty(bountyId: number, senderAddress: string) {
    const result = await callReadOnlyFunction({
        contractAddress: CONTRACT_ADDRESS,
        contractName: BOUNTY_CONTRACT,
        functionName: 'get-bounty',
        functionArgs: [uintCV(bountyId)],
        network,
        senderAddress,
    });

    return cvToJSON(result);
}

export async function getSubmission(submissionId: number, senderAddress: string) {
    const result = await callReadOnlyFunction({
        contractAddress: CONTRACT_ADDRESS,
        contractName: BOUNTY_CONTRACT,
        functionName: 'get-submission',
        functionArgs: [uintCV(submissionId)],
        network,
        senderAddress,
    });

    return cvToJSON(result);
}

export async function getTotalBounties(senderAddress: string) {
    const result = await callReadOnlyFunction({
        contractAddress: CONTRACT_ADDRESS,
        contractName: BOUNTY_CONTRACT,
        functionName: 'get-total-bounties',
        functionArgs: [],
        network,
        senderAddress,
    });

    return cvToJSON(result);
}

export async function getTotalSubmissions(senderAddress: string) {
    const result = await callReadOnlyFunction({
        contractAddress: CONTRACT_ADDRESS,
        contractName: BOUNTY_CONTRACT,
        functionName: 'get-total-submissions',
        functionArgs: [],
        network,
        senderAddress,
    });

    return cvToJSON(result);
}

export async function closeBounty(bountyId: number, senderAddress: string) {
    const txOptions = {
        contractAddress: CONTRACT_ADDRESS,
        contractName: BOUNTY_CONTRACT,
        functionName: 'close-bounty',
        functionArgs: [uintCV(bountyId)],
        network,
        anchorMode: AnchorMode.Any,
        postConditionMode: PostConditionMode.Allow,
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

export async function registerResearcher(senderAddress: string) {
    const txOptions = {
        contractAddress: CONTRACT_ADDRESS,
        contractName: REPUTATION_CONTRACT,
        functionName: 'register-researcher',
        functionArgs: [],
        network,
        anchorMode: AnchorMode.Any,
        postConditionMode: PostConditionMode.Allow,
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
    const result = await callReadOnlyFunction({
        contractAddress: CONTRACT_ADDRESS,
        contractName: REPUTATION_CONTRACT,
        functionName: 'get-researcher-profile',
        functionArgs: [principalCV(researcher)],
        network,
        senderAddress,
    });

    return cvToJSON(result);
}

export async function getReputationScore(
    researcher: string,
    senderAddress: string
) {
    const result = await callReadOnlyFunction({
        contractAddress: CONTRACT_ADDRESS,
        contractName: REPUTATION_CONTRACT,
        functionName: 'get-reputation-score',
        functionArgs: [principalCV(researcher)],
        network,
        senderAddress,
    });

    return cvToJSON(result);
}

export async function getTotalResearchers(senderAddress: string) {
    const result = await callReadOnlyFunction({
        contractAddress: CONTRACT_ADDRESS,
        contractName: REPUTATION_CONTRACT,
        functionName: 'get-total-researchers',
        functionArgs: [],
        network,
        senderAddress,
    });

    return cvToJSON(result);
}

export async function calculateSuccessRate(
    researcher: string,
    senderAddress: string
) {
    const result = await callReadOnlyFunction({
        contractAddress: CONTRACT_ADDRESS,
        contractName: REPUTATION_CONTRACT,
        functionName: 'calculate-success-rate',
        functionArgs: [principalCV(researcher)],
        network,
        senderAddress,
    });

    return cvToJSON(result);
}

export async function registerArbiter(senderAddress: string) {
    const txOptions = {
        contractAddress: CONTRACT_ADDRESS,
        contractName: DISPUTE_CONTRACT,
        functionName: 'register-arbiter',
        functionArgs: [],
        network,
        anchorMode: AnchorMode.Any,
        postConditionMode: PostConditionMode.Allow,
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
        postConditionMode: PostConditionMode.Allow,
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
        postConditionMode: PostConditionMode.Allow,
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
