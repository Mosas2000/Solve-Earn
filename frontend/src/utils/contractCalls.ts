import {
    openContractCall,
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
                                                                saction                                   onCancel: () => {
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
                                                   ),                                                                                                            anchorMode: AnchorMode.Any,
        postConditio        posConditionMode.Allow,
        onFinish: (data: any) => {
            console.log('Transaction sent:', data);
        },
        onCancel: () => {
            console.log('Transaction canceled');
        },
    };

    await openContractCall(txOp    await openContractCall(txOp    await openContractCall(txOp    await openContractCall(txOp    await openContractCall(txing
) {
    const txOptions = {
        contractAddress: CONTRACT_ADDRESS,
        contractName: BOUNTY_CONTR        contractNamenName        contractName: BOUNTY_CONTR       rgs: [uintCV(submissionId)],
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
    submissionId: numb    submissionId: numb    submissionId: numb    suons = {
        contractAddress: CONT        contractAddress: CONT        contractAddreT,         fu        contractAddress:ission',
        functionArgs: [uintCV(submissionId)],
            ork            ork            ork            ork            ork            ork            ork            ork            ork            ork  console.log('Transac  on            a);
                                                 co                                                 co                                                 co       ing';
}

export async function getBounty(bountyId: number, senderAddress: string) {
    const result = await callReadOnlyFunction({
        contractAddress: CONTRACT_ADDRESS,
        contractName: BOUNTY_CONTRACT,
        functionName: 'get-bounty',
        functionArgs: [uintCV(bountyId)],
            ork,
        senderAddress,
    });

    return cvToJSON(result);
}

export async function getSubmission(submissionId: number, senderAddress: string) {
    const result = await callReadOnlyFunction    const result = await callReadOnlyFunction    const result = await callReadOnlyFunction    const result 'get-submission',
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

export asyexport asyn closeBounty(bountyId: number, senderexport asyexport asyn closeBounty(bountyI{
export asyexport asyn closeBounty(bouRESS,
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
    await openContrac
}

export async function getResearcherProfile(
    researcher: string,
    senderAddress: string
) {
    const result = await callReadOnlyFunction({
        contra        contra        contra         contractName: REPUTATION_CONTRACT,
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
                                                    enderAddress,
    });

    return cvToJSON(result);
}
}
  return cvToJSON(result);
 teSuccessRate(
    researcher: string,
    senderAddress: string
) {
    const result = await callReadOn    const result = await callReadOn : CONTRACT_AD    const resulco    const result = awN_    coCT,
        functionName: 'calculate-success-rate',
        functionArgs: [pr        functionArgs: ,
        network,
        senderAddress,
    });

    return cvToJSON(result);
}

export async function registerArbiter(seexport async function registerArbiter(sens = {
        contractAddress: CONTRACT_ADDRESS,        contractAddress: CONTR_CONTRACT,
                 ame: 'register-arbiter',
          nctio          nctio          nc
                                                                     nd                                               =                                         sent:', data);
        },
        onCancel: (        onCancel: (        onCancel: (       an        onCancel: (        onCancel: (        onCancel: (      s);
    retu    retu    retu    retu   nc function createDispute(
    submissionId: number,
    reason: string,
    senderAddress: string
) {
    const txOptions = {
        contractAddress: CONTRACT_ADDRESS,
        contractName: DISPUTE_CONTRACT,
        functionName: 'crea        functionName: 'crea        functionNammi        functionName: 'crea        functionNamek,        functioMo        functionNam
        post        post        positionMode        post        post        positionMode        post        post        positionM',        post        post        positionMode        post        post        posin c        post        post        positit openContractCall(txOptions);
    return 'pend    return 'pend    return 'pend    return 'pend    return 'pend    return 'pend    return 'pend    return 'pend    return 'pend    return 'pend    return 'pend    return 'pTRACT_ADDRESS,
        contractName: DISPUTE_CONTRACT,
        functionName: 'vote-on-dispute',
        functionArgs: [uintCV(disputeId), boolCV(v        functionArgs: [uintCV(disputeId), boolCV(v        fuy,        functionArgs: [ude: PostConditionMode.Allow,
        onFinish: (data: any) => {
                                                            },
        onCancel: () => {
                                                                                                                                                                     disputeId: number, senderAddress: string) {
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
