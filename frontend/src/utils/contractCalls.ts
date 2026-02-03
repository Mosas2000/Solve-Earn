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
} from '@stacks/transactions';
import { StacksMainnet } from '@stacks/network';
import type { CreateBountyForm, SeverityLevel } from '../types';

const network = new StacksMainnet();
const CONTRACT_ADDRESS = 'SP000000000000000000000000000000000';
const BOUNTY_CONTRACT = 'bounty-vault';
const REPUTATION_CONTRACT = 'reputation';

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

export async function getResearcherProfile(
    researcher: string,
    senderAddress: string
) {
    const result = await callReadOnlyFunction({
        contractAddress: CONTRACT_ADDRESS,
        contractName: REPUTATION_CONTRACT,
        functionName: 'get-researcher-profile',
        functionArgs: [stringAsciiCV(researcher)],
        network,
        senderAddress,
    });

    return cvToJSON(result);
}
