import {
    makeContractCall,
    broadcastTransaction,
    AnchorMode,
    PostConditionMode,
    uintCV,
    stringUtf8CV,
    stringAsciiCV,
    bufferCV,
    callReadOnlyFunction,
    cvToJSON,
    principalCV,
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
        senderAddress,
        network,
        anchorMode: AnchorMode.Any,
        postConditionMode: PostConditionMode.Allow,
    };

    const transaction = await makeContractCall(txOptions);
    const broadcastResponse = await broadcastTransaction(transaction, network);
    return broadcastResponse.txid;
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
        senderAddress,
        network,
        anchorMode: AnchorMode.Any,
        postConditionMode: PostConditionMode.Allow,
    };

    const transaction = await makeContractCall(txOptions);
    const broadcastResponse = await broadcastTransaction(transaction, network);
    return broadcastResponse.txid;
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
        senderAddress,
        network,
        anchorMode: AnchorMode.Any,
        postConditionMode: PostConditionMode.Allow,
    };

    const transaction = await makeContractCall(txOptions);
    const broadcastResponse = await broadcastTransaction(transaction, network);
    return broadcastResponse.txid;
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
        senderAddress,
        network,
        anchorMode: AnchorMode.Any,
        postConditionMode: PostConditionMode.Allow,
    };

    const transaction = await makeContractCall(txOptions);
    const broadcastResponse = await broadcastTransaction(transaction, network);
    return broadcastResponse.txid;
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

export async function closeBounty(bountyId: number, senderAddress: string) {
    const txOptions = {
        contractAddress: CONTRACT_ADDRESS,
        contractName: BOUNTY_CONTRACT,
        functionName: 'close-bounty',
        functionArgs: [uintCV(bountyId)],
        senderAddress,
        network,
        anchorMode: AnchorMode.Any,
        postConditionMode: PostConditionMode.Allow,
    };

    const transaction = await makeContractCall(txOptions);
    const broadcastResponse = await broadcastTransaction(transaction, network);
    return broadcastResponse.txid;
}

// Reputation Contract Functions
export async function registerResearcher(senderAddress: string) {
    const txOptions = {
        contractAddress: CONTRACT_ADDRESS,
        contractName: REPUTATION_CONTRACT,
        functionName: 'register-researcher',
        functionArgs: [],
        senderAddress,
        network,
        anchorMode: AnchorMode.Any,
        postConditionMode: PostConditionMode.Allow,
    };

    const transaction = await makeContractCall(txOptions);
    const broadcastResponse = await broadcastTransaction(transaction, network);
    return broadcastResponse.txid;
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

// Dispute Contract Functions
export async function registerArbiter(senderAddress: string) {
    const txOptions = {
        contractAddress: CONTRACT_ADDRESS,
        contractName: DISPUTE_CONTRACT,
        functionName: 'register-arbiter',
        functionArgs: [],
        senderAddress,
        network,
        anchorMode: AnchorMode.Any,
        postConditionMode: PostConditionMode.Allow,
    };

    const transaction = await makeContractCall(txOptions);
    const broadcastResponse = await broadcastTransaction(transaction, network);
    return broadcastResponse.txid;
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
        senderAddress,
        network,
        anchorMode: AnchorMode.Any,
        postConditionMode: PostConditionMode.Allow,
    };

    const transaction = await makeContractCall(txOptions);
    const broadcastResponse = await broadcastTransaction(transaction, network);
    return broadcastResponse.txid;
}

export async function voteOnDispute(
    disputeId: number,
    voteFor: boolean,
    senderAddress: string
) {
    const txOptions = {
        contractAddress: CONTRACT_ADDRESS,
        contractName: DISPUTE_CONTRACT,
        functionName: 'vote-on-dispute',
        functionArgs: [uintCV(disputeId), voteFor],
        senderAddress,
        network,
        anchorMode: AnchorMode.Any,
        postConditionMode: PostConditionMode.Allow,
    };

    const transaction = await makeContractCall(txOptions);
    const broadcastResponse = await broadcastTransaction(transaction, network);
    return broadcastResponse.txid;
}

export async function getDispute(disputeId: number, senderAddress: string) {
    const result = await callReadOnlyFunction({
        contractAddress: CONTRACT_ADDRESS,
        contractName: DISPUTE_CONTRACT,
        functionName: 'get-dispute',
        functionArgs: [uintCV(disputeId)],
        network,
        senderAddress,
    });

    return cvToJSON(result);
}
