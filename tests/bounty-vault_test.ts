import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v1.7.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.170.0/testing/asserts.ts';

Clarinet.test({
    name: "Can create bounty with valid parameters",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const project = accounts.get('wallet_1')!;

        let block = chain.mineBlock([
            Tx.contractCall(
                'bounty-vault',
                'create-bounty',
                [
                    types.utf8("Critical API Vulnerability"),
                    types.utf8("Looking for security issues in our API"),
                    types.uint(10000000),
                    types.uint(5000000),
                    types.uint(3000000),
                    types.uint(1500000),
                    types.uint(500000),
                    types.uint(14400)
                ],
                project.address
            )
        ]);

        block.receipts[0].result.expectOk().expectUint(1);
    }
});

Clarinet.test({
    name: "Researcher can submit vulnerability",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const project = accounts.get('wallet_1')!;
        const researcher = accounts.get('wallet_2')!;

        let block = chain.mineBlock([
            Tx.contractCall(
                'bounty-vault',
                'create-bounty',
                [
                    types.utf8("SQL Injection Hunt"),
                    types.utf8("Find SQL injection vulnerabilities"),
                    types.uint(5000000),
                    types.uint(2000000),
                    types.uint(1000000),
                    types.uint(500000),
                    types.uint(250000),
                    types.uint(14400)
                ],
                project.address
            )
        ]);

        const bountyId = block.receipts[0].result.expectOk().expectUint(1);

        block = chain.mineBlock([
            Tx.contractCall(
                'bounty-vault',
                'submit-vulnerability',
                [
                    types.uint(bountyId),
                    types.ascii("high"),
                    types.buff(new Uint8Array(32).fill(1))
                ],
                researcher.address
            )
        ]);

        block.receipts[0].result.expectOk().expectUint(1);
    }
});

Clarinet.test({
    name: "Project can approve and pay submission",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const project = accounts.get('wallet_1')!;
        const researcher = accounts.get('wallet_2')!;

        // Reduce approval delay for test speed
        chain.mineBlock([
            Tx.contractCall(
                'bounty-vault',
                'set-approval-delay',
                [types.uint(2)],
                deployer.address
            )
        ]);

        let block = chain.mineBlock([
            Tx.contractCall(
                'bounty-vault',
                'create-bounty',
                [
                    types.utf8("XSS Vulnerability"),
                    types.utf8("Find XSS issues"),
                    types.uint(3000000),
                    types.uint(1500000),
                    types.uint(800000),
                    types.uint(400000),
                    types.uint(200000),
                    types.uint(14400)
                ],
                project.address
            ),
            Tx.contractCall(
                'bounty-vault',
                'submit-vulnerability',
                [
                    types.uint(1),
                    types.ascii("medium"),
                    types.buff(new Uint8Array(32).fill(2))
                ],
                researcher.address
            )
        ]);

        // Mine blocks to satisfy approval delay
        for (let i = 0; i < 3; i++) {
            chain.mineEmptyBlock();
        }

        block = chain.mineBlock([
            Tx.contractCall(
                'bounty-vault',
                'approve-submission',
                [types.uint(1)],
                project.address
            )
        ]);

        block.receipts[0].result.expectOk().expectBool(true);
    }
});

Clarinet.test({
    name: "Rejects duplicate report hash on the same bounty",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const project = accounts.get('wallet_1')!;
        const researcher = accounts.get('wallet_2')!;
        const reportHash = new Uint8Array(32).fill(9);

        chain.mineBlock([
            Tx.contractCall(
                'bounty-vault',
                'create-bounty',
                [
                    types.utf8("Duplicate Hash Test"),
                    types.utf8("Test duplicate hash rejection"),
                    types.uint(5000000),
                    types.uint(2000000),
                    types.uint(1000000),
                    types.uint(500000),
                    types.uint(250000),
                    types.uint(14400)
                ],
                project.address
            )
        ]);

        // First submission should succeed
        let block = chain.mineBlock([
            Tx.contractCall(
                'bounty-vault',
                'submit-vulnerability',
                [
                    types.uint(1),
                    types.ascii("high"),
                    types.buff(reportHash)
                ],
                researcher.address
            )
        ]);
        block.receipts[0].result.expectOk();

        // Second submission with same hash should fail with err u205
        block = chain.mineBlock([
            Tx.contractCall(
                'bounty-vault',
                'submit-vulnerability',
                [
                    types.uint(1),
                    types.ascii("medium"),
                    types.buff(reportHash)
                ],
                researcher.address
            )
        ]);
        block.receipts[0].result.expectErr().expectUint(205);
    }
});

Clarinet.test({
    name: "Rejects researcher after reaching max submissions per bounty",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const project = accounts.get('wallet_1')!;
        const researcher = accounts.get('wallet_2')!;

        chain.mineBlock([
            Tx.contractCall(
                'bounty-vault',
                'create-bounty',
                [
                    types.utf8("Max Submissions Test"),
                    types.utf8("Test per-researcher submission cap"),
                    types.uint(5000000),
                    types.uint(2000000),
                    types.uint(1000000),
                    types.uint(500000),
                    types.uint(250000),
                    types.uint(14400)
                ],
                project.address
            )
        ]);

        // Submit 3 different reports (the max)
        for (let i = 1; i <= 3; i++) {
            const hash = new Uint8Array(32).fill(i);
            let block = chain.mineBlock([
                Tx.contractCall(
                    'bounty-vault',
                    'submit-vulnerability',
                    [
                        types.uint(1),
                        types.ascii("low"),
                        types.buff(hash)
                    ],
                    researcher.address
                )
            ]);
            block.receipts[0].result.expectOk();
        }

        // 4th submission should fail with err u206
        const hash4 = new Uint8Array(32).fill(4);
        let block = chain.mineBlock([
            Tx.contractCall(
                'bounty-vault',
                'submit-vulnerability',
                [
                    types.uint(1),
                    types.ascii("critical"),
                    types.buff(hash4)
                ],
                researcher.address
            )
        ]);
        block.receipts[0].result.expectErr().expectUint(206);
    }
});

Clarinet.test({
    name: "Rejects bounty owner from submitting to their own bounty",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const project = accounts.get('wallet_1')!;

        chain.mineBlock([
            Tx.contractCall(
                'bounty-vault',
                'create-bounty',
                [
                    types.utf8("Self-Submit Test"),
                    types.utf8("Test self-submission prevention"),
                    types.uint(5000000),
                    types.uint(2000000),
                    types.uint(1000000),
                    types.uint(500000),
                    types.uint(250000),
                    types.uint(14400)
                ],
                project.address
            )
        ]);

        // Owner submitting to their own bounty should fail with err u207
        let block = chain.mineBlock([
            Tx.contractCall(
                'bounty-vault',
                'submit-vulnerability',
                [
                    types.uint(1),
                    types.ascii("critical"),
                    types.buff(new Uint8Array(32).fill(99))
                ],
                project.address
            )
        ]);
        block.receipts[0].result.expectErr().expectUint(207);
    }
});

Clarinet.test({
    name: "Project can reject a vulnerability submission",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const project = accounts.get('wallet_1')!;
        const researcher = accounts.get('wallet_2')!;

        // Create bounty
        chain.mineBlock([
            Tx.contractCall(
                'bounty-vault',
                'create-bounty',
                [
                    types.utf8("Rejection Test Bounty"),
                    types.utf8("Testing submission rejection flow"),
                    types.uint(5000000),
                    types.uint(2000000),
                    types.uint(1000000),
                    types.uint(500000),
                    types.uint(250000),
                    types.uint(14400)
                ],
                project.address
            )
        ]);

        // Researcher submits vulnerability
        chain.mineBlock([
            Tx.contractCall(
                'bounty-vault',
                'submit-vulnerability',
                [
                    types.uint(1),
                    types.ascii("medium"),
                    types.buff(new Uint8Array(32).fill(10))
                ],
                researcher.address
            )
        ]);

        // Project rejects the submission
        let block = chain.mineBlock([
            Tx.contractCall(
                'bounty-vault',
                'reject-submission',
                [types.uint(1)],
                project.address
            )
        ]);

        block.receipts[0].result.expectOk().expectBool(true);
    }
});

Clarinet.test({
    name: "Prevents unauthorized user from rejecting submission",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const project = accounts.get('wallet_1')!;
        const researcher = accounts.get('wallet_2')!;
        const unauthorized = accounts.get('wallet_3')!;

        // Create bounty
        chain.mineBlock([
            Tx.contractCall(
                'bounty-vault',
                'create-bounty',
                [
                    types.utf8("Auth Test Bounty"),
                    types.utf8("Testing unauthorized rejection"),
                    types.uint(5000000),
                    types.uint(2000000),
                    types.uint(1000000),
                    types.uint(500000),
                    types.uint(250000),
                    types.uint(14400)
                ],
                project.address
            )
        ]);

        // Researcher submits vulnerability
        chain.mineBlock([
            Tx.contractCall(
                'bounty-vault',
                'submit-vulnerability',
                [
                    types.uint(1),
                    types.ascii("high"),
                    types.buff(new Uint8Array(32).fill(11))
                ],
                researcher.address
            )
        ]);

        // Unauthorized user tries to reject - should fail with err u200
        let block = chain.mineBlock([
            Tx.contractCall(
                'bounty-vault',
                'reject-submission',
                [types.uint(1)],
                unauthorized.address
            )
        ]);

        block.receipts[0].result.expectErr().expectUint(200);
    }
});

Clarinet.test({
    name: "Project owner can close active bounty",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const project = accounts.get('wallet_1')!;

        // Create bounty
        chain.mineBlock([
            Tx.contractCall(
                'bounty-vault',
                'create-bounty',
                [
                    types.utf8("Close Test Bounty"),
                    types.utf8("Testing bounty closure functionality"),
                    types.uint(5000000),
                    types.uint(2000000),
                    types.uint(1000000),
                    types.uint(500000),
                    types.uint(250000),
                    types.uint(14400)
                ],
                project.address
            )
        ]);

        // Close the bounty
        let block = chain.mineBlock([
            Tx.contractCall(
                'bounty-vault',
                'close-bounty',
                [types.uint(1)],
                project.address
            )
        ]);

        block.receipts[0].result.expectOk().expectBool(true);
    }
});

Clarinet.test({
    name: "Prevents unauthorized user from closing bounty",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const project = accounts.get('wallet_1')!;
        const unauthorized = accounts.get('wallet_3')!;

        // Create bounty
        chain.mineBlock([
            Tx.contractCall(
                'bounty-vault',
                'create-bounty',
                [
                    types.utf8("Unauthorized Close Test"),
                    types.utf8("Testing unauthorized closure attempt"),
                    types.uint(5000000),
                    types.uint(2000000),
                    types.uint(1000000),
                    types.uint(500000),
                    types.uint(250000),
                    types.uint(14400)
                ],
                project.address
            )
        ]);

        // Unauthorized user tries to close - should fail with err u200
        let block = chain.mineBlock([
            Tx.contractCall(
                'bounty-vault',
                'close-bounty',
                [types.uint(1)],
                unauthorized.address
            )
        ]);

        block.receipts[0].result.expectErr().expectUint(200);
    }
});

Clarinet.test({
    name: "Prevents unauthorized user from approving submission",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const project = accounts.get('wallet_1')!;
        const researcher = accounts.get('wallet_2')!;
        const unauthorized = accounts.get('wallet_3')!;

        // Create bounty
        chain.mineBlock([
            Tx.contractCall(
                'bounty-vault',
                'create-bounty',
                [
                    types.utf8("Approval Auth Test"),
                    types.utf8("Testing unauthorized approval attempt"),
                    types.uint(5000000),
                    types.uint(2000000),
                    types.uint(1000000),
                    types.uint(500000),
                    types.uint(250000),
                    types.uint(14400)
                ],
                project.address
            )
        ]);

        // Researcher submits vulnerability
        chain.mineBlock([
            Tx.contractCall(
                'bounty-vault',
                'submit-vulnerability',
                [
                    types.uint(1),
                    types.ascii("critical"),
                    types.buff(new Uint8Array(32).fill(12))
                ],
                researcher.address
            )
        ]);

        // Unauthorized user tries to approve - should fail with err u200
        let block = chain.mineBlock([
            Tx.contractCall(
                'bounty-vault',
                'approve-submission',
                [types.uint(1)],
                unauthorized.address
            )
        ]);

        block.receipts[0].result.expectErr().expectUint(200);
    }
});

Clarinet.test({
    name: "Prevents submission to expired bounty",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const project = accounts.get('wallet_1')!;
        const researcher = accounts.get('wallet_2')!;

        // Create bounty with very short duration (10 blocks)
        chain.mineBlock([
            Tx.contractCall(
                'bounty-vault',
                'create-bounty',
                [
                    types.utf8("Expiry Test Bounty"),
                    types.utf8("Testing expiration validation"),
                    types.uint(5000000),
                    types.uint(2000000),
                    types.uint(1000000),
                    types.uint(500000),
                    types.uint(250000),
                    types.uint(10)  // Very short duration
                ],
                project.address
            )
        ]);

        // Mine blocks to pass expiration
        for (let i = 0; i < 12; i++) {
            chain.mineEmptyBlock();
        }

        // Try to submit after expiration - should fail with err u203
        let block = chain.mineBlock([
            Tx.contractCall(
                'bounty-vault',
                'submit-vulnerability',
                [
                    types.uint(1),
                    types.ascii("high"),
                    types.buff(new Uint8Array(32).fill(13))
                ],
                researcher.address
            )
        ]);

        block.receipts[0].result.expectErr().expectUint(203);
    }
});

Clarinet.test({
    name: "Prevents approval when remaining pool is insufficient",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const project = accounts.get('wallet_1')!;
        const researcher1 = accounts.get('wallet_2')!;
        const researcher2 = accounts.get('wallet_3')!;

        // Reduce approval delay for test speed
        chain.mineBlock([
            Tx.contractCall(
                'bounty-vault',
                'set-approval-delay',
                [types.uint(2)],
                deployer.address
            )
        ]);

        // Create bounty with minimal pool (just enough for one critical reward)
        chain.mineBlock([
            Tx.contractCall(
                'bounty-vault',
                'create-bounty',
                [
                    types.utf8("Limited Pool Bounty"),
                    types.utf8("Testing pool depletion"),
                    types.uint(2000000),  // Only enough for one critical
                    types.uint(2000000),
                    types.uint(1000000),
                    types.uint(500000),
                    types.uint(250000),
                    types.uint(14400)
                ],
                project.address
            )
        ]);

        // First researcher submits critical vulnerability
        chain.mineBlock([
            Tx.contractCall(
                'bounty-vault',
                'submit-vulnerability',
                [
                    types.uint(1),
                    types.ascii("critical"),
                    types.buff(new Uint8Array(32).fill(14))
                ],
                researcher1.address
            )
        ]);

        // Mine blocks to satisfy approval delay
        for (let i = 0; i < 3; i++) {
            chain.mineEmptyBlock();
        }

        // Approve first submission (depletes pool)
        chain.mineBlock([
            Tx.contractCall(
                'bounty-vault',
                'approve-submission',
                [types.uint(1)],
                project.address
            )
        ]);

        // Second researcher submits
        chain.mineBlock([
            Tx.contractCall(
                'bounty-vault',
                'submit-vulnerability',
                [
                    types.uint(1),
                    types.ascii("high"),
                    types.buff(new Uint8Array(32).fill(15))
                ],
                researcher2.address
            )
        ]);

        // Mine blocks to satisfy approval delay for second submission
        for (let i = 0; i < 3; i++) {
            chain.mineEmptyBlock();
        }

        // Try to approve second when pool is depleted - should fail with err u202
        let block = chain.mineBlock([
            Tx.contractCall(
                'bounty-vault',
                'approve-submission',
                [types.uint(2)],
                project.address
            )
        ]);

        block.receipts[0].result.expectErr().expectUint(202);
    }
});

Clarinet.test({
    name: "Prevents bounty creation with insufficient pool for rewards",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const project = accounts.get('wallet_1')!;

        // Try to create bounty where total-pool < sum of rewards
        let block = chain.mineBlock([
            Tx.contractCall(
                'bounty-vault',
                'create-bounty',
                [
                    types.utf8("Invalid Pool Bounty"),
                    types.utf8("Pool smaller than reward sum"),
                    types.uint(1000000),  // Pool is 1M
                    types.uint(2000000),  // But rewards sum to much more
                    types.uint(1000000),
                    types.uint(500000),
                    types.uint(250000),
                    types.uint(14400)
                ],
                project.address
            )
        ]);

        // Should fail with err u202 (insufficient funds)
        block.receipts[0].result.expectErr().expectUint(202);
    }
});

Clarinet.test({
    name: "Approve-submission updates researcher reputation score",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const project = accounts.get('wallet_1')!;
        const researcher = accounts.get('wallet_2')!;

        // Reduce approval delay for test speed
        chain.mineBlock([
            Tx.contractCall(
                'bounty-vault',
                'set-approval-delay',
                [types.uint(2)],
                deployer.address
            )
        ]);

        // Step 1: Register researcher in reputation contract
        chain.mineBlock([
            Tx.contractCall(
                'reputation',
                'register-researcher',
                [],
                researcher.address
            )
        ]);

        // Step 2: Authorize the bounty-vault contract as a trusted caller
        chain.mineBlock([
            Tx.contractCall(
                'reputation',
                'set-trusted-caller',
                [types.principal(`${deployer.address}.bounty-vault`)],
                deployer.address
            )
        ]);

        // Step 3: Create bounty and submit vulnerability
        chain.mineBlock([
            Tx.contractCall(
                'bounty-vault',
                'create-bounty',
                [
                    types.utf8("Reputation Integration Test"),
                    types.utf8("Test reputation updates on approval"),
                    types.uint(5000000),
                    types.uint(2000000),
                    types.uint(1000000),
                    types.uint(500000),
                    types.uint(250000),
                    types.uint(14400)
                ],
                project.address
            ),
            Tx.contractCall(
                'bounty-vault',
                'submit-vulnerability',
                [
                    types.uint(1),
                    types.ascii("high"),
                    types.buff(new Uint8Array(32).fill(50))
                ],
                researcher.address
            )
        ]);

        // Mine blocks to satisfy approval delay
        for (let i = 0; i < 3; i++) {
            chain.mineEmptyBlock();
        }

        // Step 4: Approve the submission
        let block = chain.mineBlock([
            Tx.contractCall(
                'bounty-vault',
                'approve-submission',
                [types.uint(1)],
                project.address
            )
        ]);

        block.receipts[0].result.expectOk();

        // Step 5: Verify reputation was updated
        let profileResult = chain.callReadOnlyFn(
            'reputation',
            'get-researcher-profile',
            [types.principal(researcher.address)],
            researcher.address
        );

        const profile = profileResult.result.expectSome().expectTuple();
        assertEquals(profile['total-submissions'], types.uint(1));
        assertEquals(profile['accepted-submissions'], types.uint(1));
        assertEquals(profile['rejected-submissions'], types.uint(0));
        assertEquals(profile['total-earned'], types.uint(1000000));
        // Initial score 50 + high severity boost 15 = 65
        assertEquals(profile['reputation-score'], types.uint(65));
    }
});

Clarinet.test({
    name: "Reject-submission updates researcher reputation score",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const project = accounts.get('wallet_1')!;
        const researcher = accounts.get('wallet_2')!;

        // Step 1: Register researcher in reputation contract
        chain.mineBlock([
            Tx.contractCall(
                'reputation',
                'register-researcher',
                [],
                researcher.address
            )
        ]);

        // Step 2: Authorize the bounty-vault contract as a trusted caller
        chain.mineBlock([
            Tx.contractCall(
                'reputation',
                'set-trusted-caller',
                [types.principal(`${deployer.address}.bounty-vault`)],
                deployer.address
            )
        ]);

        // Step 3: Create bounty and submit vulnerability
        chain.mineBlock([
            Tx.contractCall(
                'bounty-vault',
                'create-bounty',
                [
                    types.utf8("Rejection Rep Test"),
                    types.utf8("Test reputation decrease on rejection"),
                    types.uint(5000000),
                    types.uint(2000000),
                    types.uint(1000000),
                    types.uint(500000),
                    types.uint(250000),
                    types.uint(14400)
                ],
                project.address
            ),
            Tx.contractCall(
                'bounty-vault',
                'submit-vulnerability',
                [
                    types.uint(1),
                    types.ascii("medium"),
                    types.buff(new Uint8Array(32).fill(51))
                ],
                researcher.address
            )
        ]);

        // Step 4: Reject the submission
        let block = chain.mineBlock([
            Tx.contractCall(
                'bounty-vault',
                'reject-submission',
                [types.uint(1)],
                project.address
            )
        ]);

        block.receipts[0].result.expectOk();

        // Step 5: Verify reputation was updated
        let profileResult = chain.callReadOnlyFn(
            'reputation',
            'get-researcher-profile',
            [types.principal(researcher.address)],
            researcher.address
        );

        const profile = profileResult.result.expectSome().expectTuple();
        assertEquals(profile['total-submissions'], types.uint(1));
        assertEquals(profile['accepted-submissions'], types.uint(0));
        assertEquals(profile['rejected-submissions'], types.uint(1));
        assertEquals(profile['total-earned'], types.uint(0));
        // Initial score 50 - rejection penalty 5 = 45
        assertEquals(profile['reputation-score'], types.uint(45));
    }
});

Clarinet.test({
    name: "Full integration: register, submit, approve, verify reputation and success rate",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const project = accounts.get('wallet_1')!;
        const researcher = accounts.get('wallet_2')!;

        // Reduce approval delay for test speed
        chain.mineBlock([
            Tx.contractCall(
                'bounty-vault',
                'set-approval-delay',
                [types.uint(2)],
                deployer.address
            )
        ]);

        // Register researcher
        chain.mineBlock([
            Tx.contractCall(
                'reputation',
                'register-researcher',
                [],
                researcher.address
            )
        ]);

        // Authorize bounty-vault as trusted caller
        chain.mineBlock([
            Tx.contractCall(
                'reputation',
                'set-trusted-caller',
                [types.principal(`${deployer.address}.bounty-vault`)],
                deployer.address
            )
        ]);

        // Create bounty
        chain.mineBlock([
            Tx.contractCall(
                'bounty-vault',
                'create-bounty',
                [
                    types.utf8("Full Integration Test"),
                    types.utf8("End-to-end reputation lifecycle"),
                    types.uint(10000000),
                    types.uint(5000000),
                    types.uint(3000000),
                    types.uint(1500000),
                    types.uint(500000),
                    types.uint(14400)
                ],
                project.address
            )
        ]);

        // Submit and approve a critical vulnerability
        chain.mineBlock([
            Tx.contractCall(
                'bounty-vault',
                'submit-vulnerability',
                [
                    types.uint(1),
                    types.ascii("critical"),
                    types.buff(new Uint8Array(32).fill(60))
                ],
                researcher.address
            )
        ]);

        // Mine blocks to satisfy approval delay
        for (let i = 0; i < 3; i++) {
            chain.mineEmptyBlock();
        }

        chain.mineBlock([
            Tx.contractCall(
                'bounty-vault',
                'approve-submission',
                [types.uint(1)],
                project.address
            )
        ]);

        // Submit and reject a low severity one
        chain.mineBlock([
            Tx.contractCall(
                'bounty-vault',
                'submit-vulnerability',
                [
                    types.uint(1),
                    types.ascii("low"),
                    types.buff(new Uint8Array(32).fill(61))
                ],
                researcher.address
            )
        ]);

        chain.mineBlock([
            Tx.contractCall(
                'bounty-vault',
                'reject-submission',
                [types.uint(2)],
                project.address
            )
        ]);

        // Verify final reputation profile
        let profileResult = chain.callReadOnlyFn(
            'reputation',
            'get-researcher-profile',
            [types.principal(researcher.address)],
            researcher.address
        );

        const profile = profileResult.result.expectSome().expectTuple();
        assertEquals(profile['total-submissions'], types.uint(2));
        assertEquals(profile['accepted-submissions'], types.uint(1));
        assertEquals(profile['rejected-submissions'], types.uint(1));
        assertEquals(profile['total-earned'], types.uint(5000000));
        // Initial 50 + critical boost 20 - rejection penalty 5 = 65
        assertEquals(profile['reputation-score'], types.uint(65));

        // Verify success rate: 1 accepted out of 2 total = 50%
        let successRate = chain.callReadOnlyFn(
            'reputation',
            'calculate-success-rate',
            [types.principal(researcher.address)],
            researcher.address
        );

        successRate.result.expectOk().expectUint(50);
    }
});

Clarinet.test({
    name: "Timelock prevents premature approval within cooldown period",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const project = accounts.get('wallet_1')!;
        const researcher = accounts.get('wallet_2')!;

        // Create bounty and submit vulnerability
        chain.mineBlock([
            Tx.contractCall(
                'bounty-vault',
                'create-bounty',
                [
                    types.utf8("Timelock Test Bounty"),
                    types.utf8("Testing approval cooldown enforcement"),
                    types.uint(3000000),
                    types.uint(1500000),
                    types.uint(800000),
                    types.uint(400000),
                    types.uint(200000),
                    types.uint(14400)
                ],
                project.address
            )
        ]);

        chain.mineBlock([
            Tx.contractCall(
                'bounty-vault',
                'submit-vulnerability',
                [
                    types.uint(1),
                    types.ascii("low"),
                    types.buff(new Uint8Array(32).fill(70))
                ],
                researcher.address
            )
        ]);

        // Immediately try to approve without waiting - should fail with err u208
        let block = chain.mineBlock([
            Tx.contractCall(
                'bounty-vault',
                'approve-submission',
                [types.uint(1)],
                project.address
            )
        ]);

        block.receipts[0].result.expectErr().expectUint(208);
    }
});

Clarinet.test({
    name: "Contract owner can configure approval delay via governance",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const unauthorized = accounts.get('wallet_3')!;

        // Read default delay
        let delayResult = chain.callReadOnlyFn(
            'bounty-vault',
            'get-approval-delay',
            [],
            deployer.address
        );
        delayResult.result.expectOk().expectUint(10);

        // Owner updates delay
        let block = chain.mineBlock([
            Tx.contractCall(
                'bounty-vault',
                'set-approval-delay',
                [types.uint(5)],
                deployer.address
            )
        ]);
        block.receipts[0].result.expectOk().expectUint(5);

        // Verify updated delay
        delayResult = chain.callReadOnlyFn(
            'bounty-vault',
            'get-approval-delay',
            [],
            deployer.address
        );
        delayResult.result.expectOk().expectUint(5);

        // Non-owner cannot change delay
        block = chain.mineBlock([
            Tx.contractCall(
                'bounty-vault',
                'set-approval-delay',
                [types.uint(1)],
                unauthorized.address
            )
        ]);
        block.receipts[0].result.expectErr().expectUint(200);
    }
});

Clarinet.test({
    name: "High-value approval requires arbiter confirmation before proceeding",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const project = accounts.get('wallet_1')!;
        const researcher = accounts.get('wallet_2')!;

        // Set approval delay low and threshold low to trigger arbiter requirement
        chain.mineBlock([
            Tx.contractCall(
                'bounty-vault',
                'set-approval-delay',
                [types.uint(2)],
                deployer.address
            ),
            Tx.contractCall(
                'bounty-vault',
                'set-high-value-threshold',
                [types.uint(500000)],
                deployer.address
            )
        ]);

        // Create bounty with critical reward above the lowered threshold
        chain.mineBlock([
            Tx.contractCall(
                'bounty-vault',
                'create-bounty',
                [
                    types.utf8("High Value Test"),
                    types.utf8("Testing arbiter requirement"),
                    types.uint(5000000),
                    types.uint(2000000),
                    types.uint(1000000),
                    types.uint(500000),
                    types.uint(250000),
                    types.uint(14400)
                ],
                project.address
            )
        ]);

        // Researcher submits critical vulnerability (reward = 2000000 > threshold 500000)
        chain.mineBlock([
            Tx.contractCall(
                'bounty-vault',
                'submit-vulnerability',
                [
                    types.uint(1),
                    types.ascii("critical"),
                    types.buff(new Uint8Array(32).fill(80))
                ],
                researcher.address
            )
        ]);

        // Mine blocks to satisfy approval delay
        for (let i = 0; i < 3; i++) {
            chain.mineEmptyBlock();
        }

        // Try to approve without arbiter confirmation - should fail with err u209
        let block = chain.mineBlock([
            Tx.contractCall(
                'bounty-vault',
                'approve-submission',
                [types.uint(1)],
                project.address
            )
        ]);

        block.receipts[0].result.expectErr().expectUint(209);
    }
});

Clarinet.test({
    name: "Arbiter can confirm and unlock high-value approval",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const project = accounts.get('wallet_1')!;
        const researcher = accounts.get('wallet_2')!;
        const arbiter = accounts.get('wallet_4')!;

        // Configure: low delay and low threshold
        chain.mineBlock([
            Tx.contractCall(
                'bounty-vault',
                'set-approval-delay',
                [types.uint(2)],
                deployer.address
            ),
            Tx.contractCall(
                'bounty-vault',
                'set-high-value-threshold',
                [types.uint(500000)],
                deployer.address
            )
        ]);

        // Register researcher and register arbiter
        chain.mineBlock([
            Tx.contractCall(
                'reputation',
                'register-researcher',
                [],
                researcher.address
            ),
            Tx.contractCall(
                'dispute-resolver',
                'register-arbiter',
                [],
                arbiter.address
            )
        ]);

        // Authorize bounty-vault as trusted caller for reputation
        chain.mineBlock([
            Tx.contractCall(
                'reputation',
                'set-trusted-caller',
                [types.principal(`${deployer.address}.bounty-vault`)],
                deployer.address
            )
        ]);

        // Create bounty
        chain.mineBlock([
            Tx.contractCall(
                'bounty-vault',
                'create-bounty',
                [
                    types.utf8("Arbiter Flow Test"),
                    types.utf8("Full arbiter confirmation lifecycle"),
                    types.uint(5000000),
                    types.uint(2000000),
                    types.uint(1000000),
                    types.uint(500000),
                    types.uint(250000),
                    types.uint(14400)
                ],
                project.address
            )
        ]);

        // Researcher submits critical vulnerability
        chain.mineBlock([
            Tx.contractCall(
                'bounty-vault',
                'submit-vulnerability',
                [
                    types.uint(1),
                    types.ascii("critical"),
                    types.buff(new Uint8Array(32).fill(90))
                ],
                researcher.address
            )
        ]);

        // Arbiter confirms the submission
        let block = chain.mineBlock([
            Tx.contractCall(
                'bounty-vault',
                'confirm-approval',
                [types.uint(1)],
                arbiter.address
            )
        ]);
        block.receipts[0].result.expectOk().expectBool(true);

        // Mine blocks to satisfy approval delay
        for (let i = 0; i < 3; i++) {
            chain.mineEmptyBlock();
        }

        // Now project can approve the high-value submission
        block = chain.mineBlock([
            Tx.contractCall(
                'bounty-vault',
                'approve-submission',
                [types.uint(1)],
                project.address
            )
        ]);
        block.receipts[0].result.expectOk().expectBool(true);

        // Verify confirmation is recorded
        let confirmation = chain.callReadOnlyFn(
            'bounty-vault',
            'get-approval-confirmation',
            [types.uint(1)],
            deployer.address
        );
        confirmation.result.expectSome();
    }
});

Clarinet.test({
    name: "Project owner cannot act as arbiter on their own bounty submissions",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const project = accounts.get('wallet_1')!;
        const researcher = accounts.get('wallet_2')!;

        // Project owner registers as arbiter
        chain.mineBlock([
            Tx.contractCall(
                'dispute-resolver',
                'register-arbiter',
                [],
                project.address
            )
        ]);

        // Create bounty and get a submission
        chain.mineBlock([
            Tx.contractCall(
                'bounty-vault',
                'create-bounty',
                [
                    types.utf8("Self-Arbiter Test"),
                    types.utf8("Owner should not be able to confirm"),
                    types.uint(5000000),
                    types.uint(2000000),
                    types.uint(1000000),
                    types.uint(500000),
                    types.uint(250000),
                    types.uint(14400)
                ],
                project.address
            )
        ]);

        chain.mineBlock([
            Tx.contractCall(
                'bounty-vault',
                'submit-vulnerability',
                [
                    types.uint(1),
                    types.ascii("high"),
                    types.buff(new Uint8Array(32).fill(95))
                ],
                researcher.address
            )
        ]);

        // Project owner tries to confirm their own bounty's submission - should fail
        let block = chain.mineBlock([
            Tx.contractCall(
                'bounty-vault',
                'confirm-approval',
                [types.uint(1)],
                project.address
            )
        ]);
        block.receipts[0].result.expectErr().expectUint(200);
    }
});
