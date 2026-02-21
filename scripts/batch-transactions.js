// ---------------------------------------------------------------------------
// Batch Transaction Script
//
// Sends 30 random on-chain transactions per wallet across the three
// deployed contracts (bounty-vault, reputation, dispute-resolver).
//
// Usage:
//   1. Add funded wallet mnemonics to settings/Mainnet.toml under
//      [accounts.wallet-1] through [accounts.wallet-10].
//
//   2. Run:
//        node scripts/batch-transactions.js
//
//      Or dry-run (shows plan without broadcasting):
//        node scripts/batch-transactions.js --dry-run
//
// Fee: 250-300 uSTX per transaction (set by BASE_FEE / MAX_FEE).
//
// Important: create-bounty transfers STX from the caller into the
// contract (the bounty pool). Each wallet needs enough STX to cover
// both the pool amounts and the transaction fees. The bounty pool
// values are intentionally small (0.2-0.5 STX each).
//
// The script manages nonces manually to avoid conflicts when sending
// multiple transactions from the same wallet.
// ---------------------------------------------------------------------------

const {
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
    getNonce,
} = require('@stacks/transactions');
const { STACKS_MAINNET } = require('@stacks/network');
const { generateWallet } = require('@stacks/wallet-sdk');
const TOML = require('@iarna/toml');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const network = STACKS_MAINNET;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || 'SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T';
const BOUNTY_CONTRACT = 'bounty-vault';
const REPUTATION_CONTRACT = 'reputation';
const DISPUTE_CONTRACT = 'dispute-resolver';

const TX_PER_WALLET = 30;
const BASE_FEE = 250;       // uSTX — minimum fee
const MAX_FEE = 300;        // uSTX — cap
const DELAY_BETWEEN_TX = 800; // ms between broadcasts per wallet (avoid rate-limits)
const DELAY_BETWEEN_WALLETS = 2000; // ms between starting each wallet batch
const DRY_RUN = process.argv.includes('--dry-run');

// Severity options for vulnerability submissions
const SEVERITIES = ['critical', 'high', 'medium', 'low'];

// Dispute reasons pool
const DISPUTE_REASONS = [
    'Inadequate vulnerability evidence provided',
    'Severity rating does not match findings',
    'Duplicate submission of known issue',
    'Report lacks reproduction steps',
    'Fix verification incomplete',
    'Scope boundary disagreement',
    'Timeline dispute on disclosure',
    'Reward calculation seems incorrect',
    'Third-party dependency issue',
    'Response time exceeded expectation',
];

// Bounty configuration templates
const BOUNTY_TEMPLATES = [
    { title: 'DeFi Protocol Audit', desc: 'Security review of lending pool', pool: 500000, crit: 200000, high: 150000, med: 100000, low: 50000 },
    { title: 'NFT Marketplace Review', desc: 'Vulnerability scan of marketplace', pool: 300000, crit: 120000, high: 90000, med: 60000, low: 30000 },
    { title: 'Bridge Contract Check', desc: 'Cross-chain bridge security audit', pool: 400000, crit: 160000, high: 120000, med: 80000, low: 40000 },
    { title: 'Token Swap Audit', desc: 'AMM contract vulnerability search', pool: 250000, crit: 100000, high: 75000, med: 50000, low: 25000 },
    { title: 'Governance Module Test', desc: 'DAO governance security review', pool: 350000, crit: 140000, high: 105000, med: 70000, low: 35000 },
    { title: 'Staking Pool Review', desc: 'Staking mechanism audit', pool: 200000, crit: 80000, high: 60000, med: 40000, low: 20000 },
    { title: 'Oracle Integration Test', desc: 'Price feed security validation', pool: 450000, crit: 180000, high: 135000, med: 90000, low: 45000 },
    { title: 'Wallet Contract Audit', desc: 'Multi-sig wallet security check', pool: 280000, crit: 112000, high: 84000, med: 56000, low: 28000 },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randomHash() {
    return crypto.randomBytes(32);
}

function randomFee() {
    return randomInt(BASE_FEE, MAX_FEE);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function truncAddr(addr) {
    return addr.slice(0, 8) + '...' + addr.slice(-4);
}

// Fetch the current on-chain nonce for a given STX address
async function fetchNonce(address) {
    try {
        const url = `https://api.mainnet.hiro.so/v2/accounts/${address}?proof=0`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        return parseInt(data.nonce, 10);
    } catch (err) {
        console.error(`  Failed to fetch nonce for ${truncAddr(address)}:`, err.message);
        throw err;
    }
}

// Fetch the STX balance (in uSTX) for a given address
async function fetchBalance(address) {
    try {
        const url = `https://api.mainnet.hiro.so/v2/accounts/${address}?proof=0`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        return parseInt(data.balance, 16);
    } catch (err) {
        console.error(`  Failed to fetch balance for ${truncAddr(address)}:`, err.message);
        return 0;
    }
}

// Derive the STX address from a private key (v6 compatible)
function getAddressFromKey(privateKey) {
    const { getAddressFromPrivateKey } = require('@stacks/transactions');
    return getAddressFromPrivateKey(privateKey);
}

// ---------------------------------------------------------------------------
// TOML wallet loader
//
// Reads settings/Mainnet.toml and extracts mnemonics from
// [accounts.wallet-1] through [accounts.wallet-10]. Derives the
// first account private key from each mnemonic using @stacks/wallet-sdk.
// ---------------------------------------------------------------------------

async function loadWalletsFromToml() {
    const tomlPath = path.resolve(__dirname, '..', 'settings', 'Mainnet.toml');
    if (!fs.existsSync(tomlPath)) {
        console.error(`\nMainnet.toml not found at: ${tomlPath}`);
        console.error('Create it with wallet mnemonics under [accounts.wallet-1] etc.');
        process.exit(1);
    }

    const raw = fs.readFileSync(tomlPath, 'utf-8');
    const config = TOML.parse(raw);
    const accounts = config.accounts || {};

    // Always include deployer as wallet index 0
    const wallets = [];

    if (accounts.deployer && accounts.deployer.mnemonic) {
        const mnemonic = accounts.deployer.mnemonic;
        if (!mnemonic.startsWith('REPLACE') && !mnemonic.startsWith('$')) {
            const wallet = await generateWallet({ secretKey: mnemonic, password: '' });
            const key = wallet.accounts[0].stxPrivateKey;
            wallets.push({ index: 0, key, label: 'deployer' });
        }
    }

    // Load wallet-1 through wallet-10
    for (let i = 1; i <= 10; i++) {
        const name = `wallet-${i}`;
        const acct = accounts[name];
        if (!acct || !acct.mnemonic) continue;
        const mnemonic = acct.mnemonic;
        if (mnemonic.startsWith('REPLACE') || mnemonic.startsWith('$')) continue;

        const wallet = await generateWallet({ secretKey: mnemonic, password: '' });
        const key = wallet.accounts[0].stxPrivateKey;
        wallets.push({ index: i, key, label: name });
    }

    return wallets;
}

// ---------------------------------------------------------------------------
// Transaction builders
//
// Each builder returns { contractName, functionName, functionArgs, fee }
// and a human-readable label. They are designed so that the call will
// succeed on-chain given the current state tracking.
// ---------------------------------------------------------------------------

function buildRegisterResearcher() {
    return {
        contractName: REPUTATION_CONTRACT,
        functionName: 'register-researcher',
        functionArgs: [],
        fee: randomFee(),
        label: 'Register researcher',
    };
}

function buildCreateBounty() {
    const tpl = randomElement(BOUNTY_TEMPLATES);
    const dur = randomInt(1440, 8640); // 10-60 days in blocks
    return {
        contractName: BOUNTY_CONTRACT,
        functionName: 'create-bounty',
        functionArgs: [
            stringUtf8CV(tpl.title),
            stringUtf8CV(tpl.desc),
            uintCV(tpl.pool),
            uintCV(tpl.crit),
            uintCV(tpl.high),
            uintCV(tpl.med),
            uintCV(tpl.low),
            uintCV(dur),
        ],
        fee: MAX_FEE, // largest call, use max fee
        label: `Create bounty: ${tpl.title}`,
    };
}

function buildSubmitVulnerability(bountyId) {
    const severity = randomElement(SEVERITIES);
    const hash = randomHash();
    return {
        contractName: BOUNTY_CONTRACT,
        functionName: 'submit-vulnerability',
        functionArgs: [
            uintCV(bountyId),
            stringAsciiCV(severity),
            bufferCV(hash),
        ],
        fee: randomFee(),
        label: `Submit vulnerability (bounty #${bountyId}, ${severity})`,
    };
}

function buildCreateDispute(submissionId) {
    const reason = randomElement(DISPUTE_REASONS);
    return {
        contractName: DISPUTE_CONTRACT,
        functionName: 'create-dispute',
        functionArgs: [
            uintCV(submissionId),
            stringUtf8CV(reason),
        ],
        fee: randomFee(),
        label: `Create dispute (submission #${submissionId})`,
    };
}

function buildSetApprovalDelay() {
    const delay = randomInt(5, 50);
    return {
        contractName: BOUNTY_CONTRACT,
        functionName: 'set-approval-delay',
        functionArgs: [uintCV(delay)],
        fee: randomFee(),
        label: `Set approval delay to ${delay} blocks`,
    };
}

function buildSetHighValueThreshold() {
    const threshold = randomInt(1000000, 10000000);
    return {
        contractName: BOUNTY_CONTRACT,
        functionName: 'set-high-value-threshold',
        functionArgs: [uintCV(threshold)],
        fee: randomFee(),
        label: `Set high-value threshold to ${threshold} uSTX`,
    };
}

// ---------------------------------------------------------------------------
// Read-only query builders (used to discover on-chain state)
// ---------------------------------------------------------------------------

async function queryTotalBounties() {
    try {
        const result = await callReadOnlyFunction({
            contractAddress: CONTRACT_ADDRESS,
            contractName: BOUNTY_CONTRACT,
            functionName: 'get-total-bounties',
            functionArgs: [],
            network,
            senderAddress: CONTRACT_ADDRESS,
        });
        const json = cvToJSON(result);
        return json.value?.value ? parseInt(json.value.value, 10) : 0;
    } catch {
        return 0;
    }
}

async function queryTotalSubmissions() {
    try {
        const result = await callReadOnlyFunction({
            contractAddress: CONTRACT_ADDRESS,
            contractName: BOUNTY_CONTRACT,
            functionName: 'get-total-submissions',
            functionArgs: [],
            network,
            senderAddress: CONTRACT_ADDRESS,
        });
        const json = cvToJSON(result);
        return json.value?.value ? parseInt(json.value.value, 10) : 0;
    } catch {
        return 0;
    }
}

async function queryTotalDisputes() {
    try {
        const result = await callReadOnlyFunction({
            contractAddress: CONTRACT_ADDRESS,
            contractName: DISPUTE_CONTRACT,
            functionName: 'get-total-disputes',
            functionArgs: [],
            network,
            senderAddress: CONTRACT_ADDRESS,
        });
        const json = cvToJSON(result);
        return json.value?.value ? parseInt(json.value.value, 10) : 0;
    } catch {
        return 0;
    }
}

async function queryResearcherProfile(address) {
    try {
        const { principalCV } = require('@stacks/transactions');
        const result = await callReadOnlyFunction({
            contractAddress: CONTRACT_ADDRESS,
            contractName: REPUTATION_CONTRACT,
            functionName: 'get-researcher-profile',
            functionArgs: [principalCV(address)],
            network,
            senderAddress: CONTRACT_ADDRESS,
        });
        const json = cvToJSON(result);
        return json.value !== null;
    } catch {
        return false;
    }
}

async function queryBountyOwner(bountyId) {
    try {
        const result = await callReadOnlyFunction({
            contractAddress: CONTRACT_ADDRESS,
            contractName: BOUNTY_CONTRACT,
            functionName: 'get-bounty',
            functionArgs: [uintCV(bountyId)],
            network,
            senderAddress: CONTRACT_ADDRESS,
        });
        const json = cvToJSON(result);
        if (json.value && json.value.value) {
            return json.value.value.project?.value || null;
        }
        return null;
    } catch {
        return null;
    }
}

// ---------------------------------------------------------------------------
// Transaction plan generator
//
// For each wallet, we build a plan of 30 transactions that avoids known
// error conditions. The plan uses tracked state counters to ensure calls
// reference valid IDs and respect per-wallet constraints.
// ---------------------------------------------------------------------------

async function buildPlan(walletIndex, address, isDeployer) {
    const plan = [];

    // Check if already registered
    const alreadyRegistered = await queryResearcherProfile(address);

    // Fetch current on-chain state
    let knownBounties = await queryTotalBounties();
    let knownSubmissions = await queryTotalSubmissions();
    let knownDisputes = await queryTotalDisputes();

    // Track bounties created by THIS wallet (to avoid self-submission)
    const myBountyIds = [];
    // Track hashes submitted to each bounty (to avoid duplicates)
    const submittedHashes = new Set();

    // --- Step 1: register researcher if not yet registered ---
    if (!alreadyRegistered) {
        plan.push(buildRegisterResearcher());
    }

    // --- Step 2: fill the remaining slots with a random mix ---
    //
    // Available write operations:
    //   - create-bounty          (costs STX from pool transfer, max fee 300)
    //   - submit-vulnerability   (needs bounty not owned by self)
    //   - create-dispute         (needs a submission ID)
    //   - set-approval-delay     (deployer-only governance)
    //   - set-high-value-threshold (deployer-only governance)
    //
    // We weight the distribution to get variety while avoiding errors.

    while (plan.length < TX_PER_WALLET) {
        const remaining = TX_PER_WALLET - plan.length;
        const roll = Math.random();

        if (roll < 0.25) {
            // Create a bounty
            const bx = buildCreateBounty();
            plan.push(bx);
            knownBounties++;
            myBountyIds.push(knownBounties);
        } else if (roll < 0.55 && knownBounties > 0) {
            // Submit a vulnerability to an existing bounty
            // Pick a bounty that this wallet did NOT create
            const candidates = [];
            for (let i = 1; i <= knownBounties; i++) {
                if (!myBountyIds.includes(i)) {
                    candidates.push(i);
                }
            }
            if (candidates.length > 0) {
                const bountyId = randomElement(candidates);
                plan.push(buildSubmitVulnerability(bountyId));
                knownSubmissions++;
            } else {
                // All known bounties belong to this wallet — create dispute instead
                if (knownSubmissions > 0) {
                    const sid = randomInt(1, knownSubmissions);
                    plan.push(buildCreateDispute(sid));
                    knownDisputes++;
                } else {
                    plan.push(buildCreateBounty());
                    knownBounties++;
                    myBountyIds.push(knownBounties);
                }
            }
        } else if (roll < 0.80 && knownSubmissions > 0) {
            // Create a dispute on a known submission
            const sid = randomInt(1, knownSubmissions);
            plan.push(buildCreateDispute(sid));
            knownDisputes++;
        } else if (isDeployer && roll < 0.90) {
            // Governance: set-approval-delay (deployer only)
            plan.push(buildSetApprovalDelay());
        } else if (isDeployer && roll < 1.0) {
            // Governance: set-high-value-threshold (deployer only)
            plan.push(buildSetHighValueThreshold());
        } else {
            // Fallback: create a bounty or dispute
            if (knownSubmissions > 0 && Math.random() > 0.5) {
                const sid = randomInt(1, knownSubmissions);
                plan.push(buildCreateDispute(sid));
                knownDisputes++;
            } else {
                plan.push(buildCreateBounty());
                knownBounties++;
                myBountyIds.push(knownBounties);
            }
        }
    }

    return plan;
}

// ---------------------------------------------------------------------------
// Broadcast a single transaction
// ---------------------------------------------------------------------------

async function broadcastTx(privateKey, txSpec, nonce) {
    const txOptions = {
        contractAddress: CONTRACT_ADDRESS,
        contractName: txSpec.contractName,
        functionName: txSpec.functionName,
        functionArgs: txSpec.functionArgs,
        senderKey: privateKey,
        network,
        anchorMode: AnchorMode.Any,
        postConditionMode: PostConditionMode.Allow,
        fee: txSpec.fee,
        nonce,
    };

    const transaction = await makeContractCall(txOptions);
    const result = await broadcastTransaction(transaction, network);

    if (result.error) {
        return { success: false, error: result.error, reason: result.reason || '' };
    }
    return { success: true, txid: result.txid };
}

// ---------------------------------------------------------------------------
// Run all transactions for a single wallet
// ---------------------------------------------------------------------------

async function runWallet(walletIndex, privateKey, isDeployer) {
    const address = getAddressFromKey(privateKey);
    console.log(`\n--- Wallet ${walletIndex} (${truncAddr(address)}) ---`);

    // Build plan
    console.log('  Building transaction plan...');
    const plan = await buildPlan(walletIndex, address, isDeployer);

    // Check balance
    const balance = await fetchBalance(address);
    console.log(`  Balance: ${balance} uSTX (${(balance / 1_000_000).toFixed(6)} STX)`);

    // Estimate total fees + bounty pool costs
    const totalFees = plan.reduce((sum, tx) => sum + tx.fee, 0);
    const totalPools = plan
        .filter(tx => tx.functionName === 'create-bounty')
        .reduce((sum, tx) => {
            // pool amount is the 3rd argument (index 2)
            const poolArg = tx.functionArgs[2];
            return sum + (poolArg?.value ? Number(poolArg.value) : 0);
        }, 0);
    const estimatedCost = totalFees + totalPools;
    console.log(`  Estimated cost: ${estimatedCost} uSTX (fees: ${totalFees}, pools: ${totalPools})`);

    if (balance < estimatedCost) {
        console.error(`  WARNING: Balance (${balance}) may be insufficient for estimated cost (${estimatedCost}).`);
    }

    // Dry-run mode: show plan without broadcasting
    if (DRY_RUN) {
        console.log('  (dry-run) Transaction plan:');
        for (let i = 0; i < plan.length; i++) {
            const tx = plan[i];
            console.log(`    [${i + 1}] ${tx.contractName}::${tx.functionName}  fee=${tx.fee}  -- ${tx.label}`);
        }
        return { sent: 0, failed: 0, skipped: plan.length };
    }

    // Fetch starting nonce
    let nonce;
    try {
        nonce = await fetchNonce(address);
    } catch {
        console.error(`  Skipping wallet ${walletIndex}: cannot fetch nonce.`);
        return { sent: 0, failed: 0, skipped: TX_PER_WALLET };
    }

    console.log(`  Starting nonce: ${nonce}`);
    console.log(`  Broadcasting ${plan.length} transactions...`);

    let sent = 0;
    let failed = 0;

    for (let i = 0; i < plan.length; i++) {
        const tx = plan[i];
        const txNonce = nonce + i;

        try {
            const result = await broadcastTx(privateKey, tx, txNonce);
            if (result.success) {
                sent++;
                console.log(`  [${i + 1}/${plan.length}] OK  ${tx.label}  fee=${tx.fee}  txid=${result.txid.slice(0, 12)}...`);
            } else {
                failed++;
                console.log(`  [${i + 1}/${plan.length}] ERR ${tx.label}  error=${result.error}  reason=${result.reason}`);
            }
        } catch (err) {
            failed++;
            console.log(`  [${i + 1}/${plan.length}] EXC ${tx.label}  ${err.message}`);
        }

        if (i < plan.length - 1) {
            await sleep(DELAY_BETWEEN_TX);
        }
    }

    console.log(`  Done: ${sent} sent, ${failed} failed`);
    return { sent, failed, skipped: 0 };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
    console.log('==========================================================');
    console.log('  Solve-Earn Batch Transaction Runner');
    console.log(`  Mode: ${DRY_RUN ? 'DRY RUN (no broadcasts)' : 'LIVE'}`);
    console.log('  Network: Mainnet');
    console.log(`  Contract: ${CONTRACT_ADDRESS}`);
    console.log(`  Transactions per wallet: ${TX_PER_WALLET}`);
    console.log(`  Fee range: ${BASE_FEE}-${MAX_FEE} uSTX`);
    console.log('==========================================================');

    // Load wallet keys from settings/Mainnet.toml
    const wallets = await loadWalletsFromToml();

    if (wallets.length === 0) {
        console.error('\nNo wallet mnemonics found in settings/Mainnet.toml.');
        console.error('Add real mnemonics under [accounts.wallet-1] through [accounts.wallet-10].');
        process.exit(1);
    }

    console.log(`\nFound ${wallets.length} wallet(s): ${wallets.map(w => w.label).join(', ')}`);

    // Determine the deployer address so we know which wallet can call governance functions
    const deployerWallet = wallets.find(w => w.label === 'deployer');
    const deployerAddress = deployerWallet ? getAddressFromKey(deployerWallet.key) : null;

    // Query initial on-chain state
    console.log('\nQuerying on-chain state...');
    const totalBounties = await queryTotalBounties();
    const totalSubmissions = await queryTotalSubmissions();
    const totalDisputes = await queryTotalDisputes();
    console.log(`  Bounties: ${totalBounties}  Submissions: ${totalSubmissions}  Disputes: ${totalDisputes}`);

    // Run wallets sequentially to avoid nonce collisions across shared state
    // (each wallet runs its own batch independently)
    const summary = { totalSent: 0, totalFailed: 0, totalSkipped: 0 };

    for (const wallet of wallets) {
        const isDeployer = deployerAddress && getAddressFromKey(wallet.key) === deployerAddress;
        const result = await runWallet(wallet.index, wallet.key, isDeployer);
        summary.totalSent += result.sent;
        summary.totalFailed += result.failed;
        summary.totalSkipped += result.skipped;

        if (wallet !== wallets[wallets.length - 1]) {
            console.log(`\n  Waiting ${DELAY_BETWEEN_WALLETS}ms before next wallet...`);
            await sleep(DELAY_BETWEEN_WALLETS);
        }
    }

    console.log('\n==========================================================');
    console.log('  SUMMARY');
    console.log(`  Wallets used:       ${wallets.length}`);
    console.log(`  Total broadcast:    ${summary.totalSent}`);
    console.log(`  Total failed:       ${summary.totalFailed}`);
    console.log(`  Total skipped:      ${summary.totalSkipped}`);
    console.log(`  Fee per TX:         ${BASE_FEE}-${MAX_FEE} uSTX`);
    console.log('==========================================================');
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
