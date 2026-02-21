// ---------------------------------------------------------------------------
// Batch Transaction Script
//
// Sends 25 random on-chain transactions per wallet across the three
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
// Fee: 300-500 uSTX per transaction (set by BASE_FEE / MAX_FEE).\n// create-bounty is the largest TX (~330 bytes) and uses fees 380-500.\n//\n// Stacks mainnet limits unconfirmed TX chaining to 25 per address,\n// so TX_PER_WALLET is set to 25.
//
// Important: create-bounty transfers STX from the caller into the
// contract (the bounty pool). Pool amounts are kept intentionally
// tiny (500-2000 uSTX each = 0.0005-0.002 STX) so that wallets
// with ~0.5 STX can send all 30 transactions without running dry.
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

const TX_PER_WALLET = 25;    // Stacks mempool allows max 25 unconfirmed TXs per address
const BASE_FEE = 300;       // uSTX — minimum fee (must cover TX byte size)
const MAX_FEE = 500;        // uSTX — cap (create-bounty is ~330 bytes, needs ≥330)
const DELAY_BETWEEN_TX = 1200; // ms between broadcasts per wallet (avoid rate-limits)
const DELAY_BETWEEN_WALLETS = 3000; // ms between starting each wallet batch
const API_MAX_RETRIES = 3;   // retries on HTTP 429 rate-limit
const API_RETRY_BASE_MS = 2000; // base delay for exponential backoff
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
// Pool amounts are intentionally tiny (500-2000 uSTX = 0.0005-0.002 STX)
// so that wallets with ~0.5 STX can create many bounties without running
// out of funds. Total cost for 8 bounties ≈ 8000 uSTX + ~2400 fees ≈ 0.01 STX.
const BOUNTY_TEMPLATES = [
    { title: 'DeFi Protocol Audit', desc: 'Security review of lending pool', pool: 2000, crit: 800, high: 600, med: 400, low: 200 },
    { title: 'NFT Marketplace Review', desc: 'Vulnerability scan of marketplace', pool: 1500, crit: 600, high: 450, med: 300, low: 150 },
    { title: 'Bridge Contract Check', desc: 'Cross-chain bridge security audit', pool: 1800, crit: 720, high: 540, med: 360, low: 180 },
    { title: 'Token Swap Audit', desc: 'AMM contract vulnerability search', pool: 1000, crit: 400, high: 300, med: 200, low: 100 },
    { title: 'Governance Module Test', desc: 'DAO governance security review', pool: 1600, crit: 640, high: 480, med: 320, low: 160 },
    { title: 'Staking Pool Review', desc: 'Staking mechanism audit', pool: 800, crit: 320, high: 240, med: 160, low: 80 },
    { title: 'Oracle Integration Test', desc: 'Price feed security validation', pool: 1200, crit: 480, high: 360, med: 240, low: 120 },
    { title: 'Wallet Contract Audit', desc: 'Multi-sig wallet security check', pool: 500, crit: 200, high: 150, med: 100, low: 50 },
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

// Fetch with retry (handles 429 rate-limiting)
async function fetchWithRetry(url, label) {
    for (let attempt = 0; attempt <= API_MAX_RETRIES; attempt++) {
        const res = await fetch(url);
        if (res.ok) return res;
        if (res.status === 429 && attempt < API_MAX_RETRIES) {
            const delay = API_RETRY_BASE_MS * Math.pow(2, attempt);
            console.log(`  Rate-limited (429) on ${label}, retrying in ${delay}ms...`);
            await sleep(delay);
            continue;
        }
        throw new Error(`HTTP ${res.status}`);
    }
}

// Fetch the current on-chain nonce for a given STX address
async function fetchNonce(address) {
    try {
        const url = `https://api.mainnet.hiro.so/v2/accounts/${address}?proof=0`;
        const res = await fetchWithRetry(url, 'nonce');
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
        const res = await fetchWithRetry(url, 'balance');
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
    // create-bounty serialises to ~330 bytes — fee must be >= byte count
    const fee = randomInt(380, MAX_FEE);
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
        fee,
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

// NOTE: set-approval-delay and set-high-value-threshold exist in the contract
// source but are NOT deployed on mainnet. Removed from transaction mix.

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
// error conditions. The plan uses a phased approach:
//
//   Phase 1: register-researcher (if needed)
//   Phase 2: create a few bounties (so later txs can reference them)
//   Phase 3: interleave all function types with proper state tracking
//
// State counters are tracked both from on-chain data AND from earlier
// wallets so that submit-vulnerability / create-dispute have valid IDs.
// ---------------------------------------------------------------------------

// Shared mutable state across wallets — bounties created by each wallet
// keyed by wallet address, and global counters updated as plans are built.
const globalState = {
    knownBounties: 0,
    knownSubmissions: 0,
    knownDisputes: 0,
    bountyOwners: {},   // bountyId -> walletAddress
    initialized: false,
};

async function buildPlan(walletIndex, address, isDeployer) {
    const plan = [];

    // Initialize global state from on-chain data once
    if (!globalState.initialized) {
        globalState.knownBounties = await queryTotalBounties();
        globalState.knownSubmissions = await queryTotalSubmissions();
        globalState.knownDisputes = await queryTotalDisputes();
        globalState.initialized = true;
    }

    // Check if already registered
    const alreadyRegistered = await queryResearcherProfile(address);

    // Track bounties created by THIS wallet (to avoid self-submission)
    const myBountyIds = new Set();

    // --- Phase 1: register researcher if not yet registered ---
    if (!alreadyRegistered) {
        plan.push(buildRegisterResearcher());
    }

    // --- Phase 2: seed bounties first (ensures every wallet creates some) ---
    // Create 3-5 bounties upfront so later slots have IDs to reference
    const seedBountyCount = randomInt(3, 5);
    for (let b = 0; b < seedBountyCount && plan.length < TX_PER_WALLET; b++) {
        plan.push(buildCreateBounty());
        globalState.knownBounties++;
        const newId = globalState.knownBounties;
        myBountyIds.add(newId);
        globalState.bountyOwners[newId] = address;
    }

    // --- Phase 3: fill remaining slots with a diverse random mix ---
    //
    // Target distribution (approximate):
    //   create-bounty:          ~20%   (5 of 25)
    //   submit-vulnerability:   ~35%   (9 of 25)
    //   create-dispute:         ~30%   (7 of 25)
    //   (deployer uses same mix — governance funcs not deployed on mainnet)

    while (plan.length < TX_PER_WALLET) {
        const roll = Math.random();

        if (roll < 0.15) {
            // Create another bounty
            plan.push(buildCreateBounty());
            globalState.knownBounties++;
            const newId = globalState.knownBounties;
            myBountyIds.add(newId);
            globalState.bountyOwners[newId] = address;

        } else if (roll < 0.50) {
            // Submit a vulnerability to someone else's bounty
            const candidates = [];
            for (let i = 1; i <= globalState.knownBounties; i++) {
                if (!myBountyIds.has(i)) {
                    candidates.push(i);
                }
            }
            if (candidates.length > 0) {
                const bountyId = randomElement(candidates);
                plan.push(buildSubmitVulnerability(bountyId));
                globalState.knownSubmissions++;
            } else {
                // No external bounties available — fallback to create-dispute or bounty
                if (globalState.knownSubmissions > 0) {
                    const sid = randomInt(1, globalState.knownSubmissions);
                    plan.push(buildCreateDispute(sid));
                    globalState.knownDisputes++;
                } else {
                    plan.push(buildCreateBounty());
                    globalState.knownBounties++;
                    myBountyIds.add(globalState.knownBounties);
                    globalState.bountyOwners[globalState.knownBounties] = address;
                }
            }

        } else if (roll < 0.75) {
            // Create a dispute on a known submission
            if (globalState.knownSubmissions > 0) {
                const sid = randomInt(1, globalState.knownSubmissions);
                plan.push(buildCreateDispute(sid));
                globalState.knownDisputes++;
            } else if (globalState.knownBounties > 0) {
                // No submissions yet — try submit-vulnerability instead
                const candidates = [];
                for (let i = 1; i <= globalState.knownBounties; i++) {
                    if (!myBountyIds.has(i)) candidates.push(i);
                }
                if (candidates.length > 0) {
                    const bountyId = randomElement(candidates);
                    plan.push(buildSubmitVulnerability(bountyId));
                    globalState.knownSubmissions++;
                } else {
                    plan.push(buildCreateBounty());
                    globalState.knownBounties++;
                    myBountyIds.add(globalState.knownBounties);
                    globalState.bountyOwners[globalState.knownBounties] = address;
                }
            } else {
                plan.push(buildCreateBounty());
                globalState.knownBounties++;
                myBountyIds.add(globalState.knownBounties);
                globalState.bountyOwners[globalState.knownBounties] = address;
            }

        } else {
            // Non-deployer fallback: submit-vulnerability or create-dispute
            const candidates = [];
            for (let i = 1; i <= globalState.knownBounties; i++) {
                if (!myBountyIds.has(i)) candidates.push(i);
            }
            if (candidates.length > 0 && Math.random() < 0.6) {
                const bountyId = randomElement(candidates);
                plan.push(buildSubmitVulnerability(bountyId));
                globalState.knownSubmissions++;
            } else if (globalState.knownSubmissions > 0) {
                const sid = randomInt(1, globalState.knownSubmissions);
                plan.push(buildCreateDispute(sid));
                globalState.knownDisputes++;
            } else {
                plan.push(buildCreateBounty());
                globalState.knownBounties++;
                myBountyIds.add(globalState.knownBounties);
                globalState.bountyOwners[globalState.knownBounties] = address;
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
    const result = await broadcastTransaction({ transaction, network });

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
    let currentNonce = nonce;

    for (let i = 0; i < plan.length; i++) {
        const tx = plan[i];

        try {
            const result = await broadcastTx(privateKey, tx, currentNonce);
            if (result.success) {
                sent++;
                currentNonce++; // only increment nonce on successful broadcast
                console.log(`  [${i + 1}/${plan.length}] OK  ${tx.label}  fee=${tx.fee}  nonce=${currentNonce - 1}  txid=${result.txid.slice(0, 12)}...`);
            } else {
                failed++;
                console.log(`  [${i + 1}/${plan.length}] ERR ${tx.label}  error=${result.error}  reason=${result.reason}`);
                // On FeeTooLow or BadNonce the nonce was NOT consumed — do not increment.
                // On TooMuchChaining, stop this wallet entirely.
                if (result.reason === 'TooMuchChaining') {
                    console.log('  Stopping wallet: mempool full (TooMuchChaining).');
                    failed += (plan.length - i - 1);
                    break;
                }
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

    // Query initial on-chain state (also seeds globalState for plan builder)
    console.log('\nQuerying on-chain state...');
    globalState.knownBounties = await queryTotalBounties();
    globalState.knownSubmissions = await queryTotalSubmissions();
    globalState.knownDisputes = await queryTotalDisputes();
    globalState.initialized = true;
    console.log(`  Bounties: ${globalState.knownBounties}  Submissions: ${globalState.knownSubmissions}  Disputes: ${globalState.knownDisputes}`);

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
