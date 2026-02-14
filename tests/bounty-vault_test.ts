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
        const project = accounts.get('wallet_1')!;
        const researcher = accounts.get('wallet_2')!;

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
