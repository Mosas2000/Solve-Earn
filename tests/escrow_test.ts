import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v1.7.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.170.0/testing/asserts.ts';

// ---------------------------------------------------------------------------
// Escrow creation
// ---------------------------------------------------------------------------

Clarinet.test({
    name: "Employer can create an escrow with valid parameters",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const employer = accounts.get('wallet_1')!;
        const worker = accounts.get('wallet_2')!;

        let block = chain.mineBlock([
            Tx.contractCall(
                'escrow',
                'create-escrow',
                [
                    types.principal(worker.address),
                    types.uint(5000000),
                    types.uint(1440),
                ],
                employer.address
            )
        ]);

        block.receipts[0].result.expectOk().expectUint(1);
        block.receipts[0].events.expectSTXTransferEvent(
            5000000,
            employer.address,
            `${accounts.get('deployer')!.address}.escrow`
        );
    }
});

Clarinet.test({
    name: "Escrow nonce increments correctly on successive creates",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const employer = accounts.get('wallet_1')!;
        const worker = accounts.get('wallet_2')!;

        let block = chain.mineBlock([
            Tx.contractCall(
                'escrow',
                'create-escrow',
                [
                    types.principal(worker.address),
                    types.uint(1000000),
                    types.uint(1440),
                ],
                employer.address
            ),
            Tx.contractCall(
                'escrow',
                'create-escrow',
                [
                    types.principal(worker.address),
                    types.uint(2000000),
                    types.uint(2880),
                ],
                employer.address
            ),
        ]);

        block.receipts[0].result.expectOk().expectUint(1);
        block.receipts[1].result.expectOk().expectUint(2);

        let readBlock = chain.mineBlock([
            Tx.contractCall(
                'escrow',
                'get-total-escrows',
                [],
                employer.address
            )
        ]);

        readBlock.receipts[0].result.expectOk().expectUint(2);
    }
});

Clarinet.test({
    name: "Cannot create escrow with yourself",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const employer = accounts.get('wallet_1')!;

        let block = chain.mineBlock([
            Tx.contractCall(
                'escrow',
                'create-escrow',
                [
                    types.principal(employer.address),
                    types.uint(1000000),
                    types.uint(1440),
                ],
                employer.address
            )
        ]);

        block.receipts[0].result.expectErr().expectUint(406);
    }
});

Clarinet.test({
    name: "Cannot create escrow with zero amount",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const employer = accounts.get('wallet_1')!;
        const worker = accounts.get('wallet_2')!;

        let block = chain.mineBlock([
            Tx.contractCall(
                'escrow',
                'create-escrow',
                [
                    types.principal(worker.address),
                    types.uint(0),
                    types.uint(1440),
                ],
                employer.address
            )
        ]);

        block.receipts[0].result.expectErr().expectUint(402);
    }
});

// ---------------------------------------------------------------------------
// Milestone management
// ---------------------------------------------------------------------------

Clarinet.test({
    name: "Employer can add milestones to a pending escrow",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const employer = accounts.get('wallet_1')!;
        const worker = accounts.get('wallet_2')!;

        let block = chain.mineBlock([
            Tx.contractCall(
                'escrow',
                'create-escrow',
                [
                    types.principal(worker.address),
                    types.uint(5000000),
                    types.uint(1440),
                ],
                employer.address
            )
        ]);

        block.receipts[0].result.expectOk().expectUint(1);

        block = chain.mineBlock([
            Tx.contractCall(
                'escrow',
                'add-milestone',
                [
                    types.uint(1),
                    types.utf8("Design review"),
                    types.uint(1000000),
                ],
                employer.address
            ),
            Tx.contractCall(
                'escrow',
                'add-milestone',
                [
                    types.uint(1),
                    types.utf8("Implementation"),
                    types.uint(3000000),
                ],
                employer.address
            ),
            Tx.contractCall(
                'escrow',
                'add-milestone',
                [
                    types.uint(1),
                    types.utf8("Final delivery"),
                    types.uint(1000000),
                ],
                employer.address
            ),
        ]);

        block.receipts[0].result.expectOk().expectUint(0);
        block.receipts[1].result.expectOk().expectUint(1);
        block.receipts[2].result.expectOk().expectUint(2);
    }
});

Clarinet.test({
    name: "Worker cannot add milestones to an escrow",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const employer = accounts.get('wallet_1')!;
        const worker = accounts.get('wallet_2')!;

        chain.mineBlock([
            Tx.contractCall(
                'escrow',
                'create-escrow',
                [
                    types.principal(worker.address),
                    types.uint(5000000),
                    types.uint(1440),
                ],
                employer.address
            )
        ]);

        let block = chain.mineBlock([
            Tx.contractCall(
                'escrow',
                'add-milestone',
                [
                    types.uint(1),
                    types.utf8("Unauthorized milestone"),
                    types.uint(1000000),
                ],
                worker.address
            )
        ]);

        block.receipts[0].result.expectErr().expectUint(400);
    }
});

Clarinet.test({
    name: "Cannot add milestone with zero amount",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const employer = accounts.get('wallet_1')!;
        const worker = accounts.get('wallet_2')!;

        chain.mineBlock([
            Tx.contractCall(
                'escrow',
                'create-escrow',
                [
                    types.principal(worker.address),
                    types.uint(5000000),
                    types.uint(1440),
                ],
                employer.address
            )
        ]);

        let block = chain.mineBlock([
            Tx.contractCall(
                'escrow',
                'add-milestone',
                [
                    types.uint(1),
                    types.utf8("Empty milestone"),
                    types.uint(0),
                ],
                employer.address
            )
        ]);

        block.receipts[0].result.expectErr().expectUint(402);
    }
});

Clarinet.test({
    name: "Cannot exceed maximum milestone limit",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const employer = accounts.get('wallet_1')!;
        const worker = accounts.get('wallet_2')!;

        chain.mineBlock([
            Tx.contractCall(
                'escrow',
                'create-escrow',
                [
                    types.principal(worker.address),
                    types.uint(50000000),
                    types.uint(14400),
                ],
                employer.address
            )
        ]);

        // Add 10 milestones (the max)
        const milestoneTxs = [];
        for (let i = 0; i < 10; i++) {
            milestoneTxs.push(
                Tx.contractCall(
                    'escrow',
                    'add-milestone',
                    [
                        types.uint(1),
                        types.utf8(`Milestone ${i + 1}`),
                        types.uint(1000000),
                    ],
                    employer.address
                )
            );
        }

        let block = chain.mineBlock(milestoneTxs);

        for (let i = 0; i < 10; i++) {
            block.receipts[i].result.expectOk();
        }

        // Attempt the 11th milestone
        block = chain.mineBlock([
            Tx.contractCall(
                'escrow',
                'add-milestone',
                [
                    types.uint(1),
                    types.utf8("One too many"),
                    types.uint(500000),
                ],
                employer.address
            )
        ]);

        block.receipts[0].result.expectErr().expectUint(408);
    }
});

// ---------------------------------------------------------------------------
// Escrow activation
// ---------------------------------------------------------------------------

Clarinet.test({
    name: "Worker can activate a pending escrow",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const employer = accounts.get('wallet_1')!;
        const worker = accounts.get('wallet_2')!;

        chain.mineBlock([
            Tx.contractCall(
                'escrow',
                'create-escrow',
                [
                    types.principal(worker.address),
                    types.uint(5000000),
                    types.uint(1440),
                ],
                employer.address
            )
        ]);

        let block = chain.mineBlock([
            Tx.contractCall(
                'escrow',
                'activate-escrow',
                [types.uint(1)],
                worker.address
            )
        ]);

        block.receipts[0].result.expectOk().expectBool(true);
    }
});

Clarinet.test({
    name: "Employer cannot activate their own escrow",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const employer = accounts.get('wallet_1')!;
        const worker = accounts.get('wallet_2')!;

        chain.mineBlock([
            Tx.contractCall(
                'escrow',
                'create-escrow',
                [
                    types.principal(worker.address),
                    types.uint(5000000),
                    types.uint(1440),
                ],
                employer.address
            )
        ]);

        let block = chain.mineBlock([
            Tx.contractCall(
                'escrow',
                'activate-escrow',
                [types.uint(1)],
                employer.address
            )
        ]);

        block.receipts[0].result.expectErr().expectUint(400);
    }
});

Clarinet.test({
    name: "Cannot activate escrow after deadline has passed",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const employer = accounts.get('wallet_1')!;
        const worker = accounts.get('wallet_2')!;

        chain.mineBlock([
            Tx.contractCall(
                'escrow',
                'create-escrow',
                [
                    types.principal(worker.address),
                    types.uint(5000000),
                    types.uint(5),
                ],
                employer.address
            )
        ]);

        // Mine blocks past the deadline
        chain.mineEmptyBlock(10);

        let block = chain.mineBlock([
            Tx.contractCall(
                'escrow',
                'activate-escrow',
                [types.uint(1)],
                worker.address
            )
        ]);

        block.receipts[0].result.expectErr().expectUint(407);
    }
});

// ---------------------------------------------------------------------------
// Milestone release
// ---------------------------------------------------------------------------

Clarinet.test({
    name: "Employer can release milestone payment to worker",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const employer = accounts.get('wallet_1')!;
        const worker = accounts.get('wallet_2')!;
        const deployer = accounts.get('deployer')!;

        // Create and set up escrow
        chain.mineBlock([
            Tx.contractCall(
                'escrow',
                'create-escrow',
                [
                    types.principal(worker.address),
                    types.uint(5000000),
                    types.uint(1440),
                ],
                employer.address
            )
        ]);

        chain.mineBlock([
            Tx.contractCall(
                'escrow',
                'add-milestone',
                [
                    types.uint(1),
                    types.utf8("First deliverable"),
                    types.uint(2000000),
                ],
                employer.address
            )
        ]);

        chain.mineBlock([
            Tx.contractCall(
                'escrow',
                'activate-escrow',
                [types.uint(1)],
                worker.address
            )
        ]);

        // Release milestone
        let block = chain.mineBlock([
            Tx.contractCall(
                'escrow',
                'release-milestone',
                [types.uint(1), types.uint(0)],
                employer.address
            )
        ]);

        block.receipts[0].result.expectOk().expectBool(true);
        block.receipts[0].events.expectSTXTransferEvent(
            2000000,
            `${deployer.address}.escrow`,
            worker.address
        );
    }
});

Clarinet.test({
    name: "Worker cannot release their own milestone",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const employer = accounts.get('wallet_1')!;
        const worker = accounts.get('wallet_2')!;

        chain.mineBlock([
            Tx.contractCall(
                'escrow',
                'create-escrow',
                [
                    types.principal(worker.address),
                    types.uint(5000000),
                    types.uint(1440),
                ],
                employer.address
            )
        ]);

        chain.mineBlock([
            Tx.contractCall(
                'escrow',
                'add-milestone',
                [
                    types.uint(1),
                    types.utf8("Worker tries to self-release"),
                    types.uint(2000000),
                ],
                employer.address
            )
        ]);

        chain.mineBlock([
            Tx.contractCall(
                'escrow',
                'activate-escrow',
                [types.uint(1)],
                worker.address
            )
        ]);

        let block = chain.mineBlock([
            Tx.contractCall(
                'escrow',
                'release-milestone',
                [types.uint(1), types.uint(0)],
                worker.address
            )
        ]);

        block.receipts[0].result.expectErr().expectUint(400);
    }
});

Clarinet.test({
    name: "Cannot release the same milestone twice",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const employer = accounts.get('wallet_1')!;
        const worker = accounts.get('wallet_2')!;

        chain.mineBlock([
            Tx.contractCall(
                'escrow',
                'create-escrow',
                [
                    types.principal(worker.address),
                    types.uint(5000000),
                    types.uint(1440),
                ],
                employer.address
            )
        ]);

        chain.mineBlock([
            Tx.contractCall(
                'escrow',
                'add-milestone',
                [
                    types.uint(1),
                    types.utf8("Only release once"),
                    types.uint(2000000),
                ],
                employer.address
            )
        ]);

        chain.mineBlock([
            Tx.contractCall(
                'escrow',
                'activate-escrow',
                [types.uint(1)],
                worker.address
            )
        ]);

        chain.mineBlock([
            Tx.contractCall(
                'escrow',
                'release-milestone',
                [types.uint(1), types.uint(0)],
                employer.address
            )
        ]);

        let block = chain.mineBlock([
            Tx.contractCall(
                'escrow',
                'release-milestone',
                [types.uint(1), types.uint(0)],
                employer.address
            )
        ]);

        block.receipts[0].result.expectErr().expectUint(405);
    }
});

Clarinet.test({
    name: "Cannot release milestone on a pending escrow",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const employer = accounts.get('wallet_1')!;
        const worker = accounts.get('wallet_2')!;

        chain.mineBlock([
            Tx.contractCall(
                'escrow',
                'create-escrow',
                [
                    types.principal(worker.address),
                    types.uint(5000000),
                    types.uint(1440),
                ],
                employer.address
            )
        ]);

        chain.mineBlock([
            Tx.contractCall(
                'escrow',
                'add-milestone',
                [
                    types.uint(1),
                    types.utf8("Too early"),
                    types.uint(2000000),
                ],
                employer.address
            )
        ]);

        let block = chain.mineBlock([
            Tx.contractCall(
                'escrow',
                'release-milestone',
                [types.uint(1), types.uint(0)],
                employer.address
            )
        ]);

        block.receipts[0].result.expectErr().expectUint(403);
    }
});

// ---------------------------------------------------------------------------
// Dispute handling
// ---------------------------------------------------------------------------

Clarinet.test({
    name: "Worker can dispute an active escrow",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const employer = accounts.get('wallet_1')!;
        const worker = accounts.get('wallet_2')!;

        chain.mineBlock([
            Tx.contractCall(
                'escrow',
                'create-escrow',
                [
                    types.principal(worker.address),
                    types.uint(5000000),
                    types.uint(1440),
                ],
                employer.address
            )
        ]);

        chain.mineBlock([
            Tx.contractCall(
                'escrow',
                'activate-escrow',
                [types.uint(1)],
                worker.address
            )
        ]);

        let block = chain.mineBlock([
            Tx.contractCall(
                'escrow',
                'dispute-escrow',
                [types.uint(1)],
                worker.address
            )
        ]);

        block.receipts[0].result.expectOk().expectBool(true);
    }
});

Clarinet.test({
    name: "Employer can dispute an active escrow",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const employer = accounts.get('wallet_1')!;
        const worker = accounts.get('wallet_2')!;

        chain.mineBlock([
            Tx.contractCall(
                'escrow',
                'create-escrow',
                [
                    types.principal(worker.address),
                    types.uint(5000000),
                    types.uint(1440),
                ],
                employer.address
            )
        ]);

        chain.mineBlock([
            Tx.contractCall(
                'escrow',
                'activate-escrow',
                [types.uint(1)],
                worker.address
            )
        ]);

        let block = chain.mineBlock([
            Tx.contractCall(
                'escrow',
                'dispute-escrow',
                [types.uint(1)],
                employer.address
            )
        ]);

        block.receipts[0].result.expectOk().expectBool(true);
    }
});

Clarinet.test({
    name: "Third party cannot dispute an escrow",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const employer = accounts.get('wallet_1')!;
        const worker = accounts.get('wallet_2')!;
        const outsider = accounts.get('wallet_3')!;

        chain.mineBlock([
            Tx.contractCall(
                'escrow',
                'create-escrow',
                [
                    types.principal(worker.address),
                    types.uint(5000000),
                    types.uint(1440),
                ],
                employer.address
            )
        ]);

        chain.mineBlock([
            Tx.contractCall(
                'escrow',
                'activate-escrow',
                [types.uint(1)],
                worker.address
            )
        ]);

        let block = chain.mineBlock([
            Tx.contractCall(
                'escrow',
                'dispute-escrow',
                [types.uint(1)],
                outsider.address
            )
        ]);

        block.receipts[0].result.expectErr().expectUint(400);
    }
});

Clarinet.test({
    name: "Cannot dispute a pending escrow",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const employer = accounts.get('wallet_1')!;
        const worker = accounts.get('wallet_2')!;

        chain.mineBlock([
            Tx.contractCall(
                'escrow',
                'create-escrow',
                [
                    types.principal(worker.address),
                    types.uint(5000000),
                    types.uint(1440),
                ],
                employer.address
            )
        ]);

        let block = chain.mineBlock([
            Tx.contractCall(
                'escrow',
                'dispute-escrow',
                [types.uint(1)],
                employer.address
            )
        ]);

        block.receipts[0].result.expectErr().expectUint(403);
    }
});

// ---------------------------------------------------------------------------
// Escrow completion
// ---------------------------------------------------------------------------

Clarinet.test({
    name: "Employer can complete an active escrow",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const employer = accounts.get('wallet_1')!;
        const worker = accounts.get('wallet_2')!;

        chain.mineBlock([
            Tx.contractCall(
                'escrow',
                'create-escrow',
                [
                    types.principal(worker.address),
                    types.uint(5000000),
                    types.uint(1440),
                ],
                employer.address
            )
        ]);

        chain.mineBlock([
            Tx.contractCall(
                'escrow',
                'activate-escrow',
                [types.uint(1)],
                worker.address
            )
        ]);

        let block = chain.mineBlock([
            Tx.contractCall(
                'escrow',
                'complete-escrow',
                [types.uint(1)],
                employer.address
            )
        ]);

        block.receipts[0].result.expectOk().expectBool(true);
    }
});

Clarinet.test({
    name: "Worker cannot complete an escrow",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const employer = accounts.get('wallet_1')!;
        const worker = accounts.get('wallet_2')!;

        chain.mineBlock([
            Tx.contractCall(
                'escrow',
                'create-escrow',
                [
                    types.principal(worker.address),
                    types.uint(5000000),
                    types.uint(1440),
                ],
                employer.address
            )
        ]);

        chain.mineBlock([
            Tx.contractCall(
                'escrow',
                'activate-escrow',
                [types.uint(1)],
                worker.address
            )
        ]);

        let block = chain.mineBlock([
            Tx.contractCall(
                'escrow',
                'complete-escrow',
                [types.uint(1)],
                worker.address
            )
        ]);

        block.receipts[0].result.expectErr().expectUint(400);
    }
});

// ---------------------------------------------------------------------------
// Refund handling
// ---------------------------------------------------------------------------

Clarinet.test({
    name: "Employer can refund a pending escrow",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const employer = accounts.get('wallet_1')!;
        const worker = accounts.get('wallet_2')!;
        const deployer = accounts.get('deployer')!;

        chain.mineBlock([
            Tx.contractCall(
                'escrow',
                'create-escrow',
                [
                    types.principal(worker.address),
                    types.uint(5000000),
                    types.uint(1440),
                ],
                employer.address
            )
        ]);

        let block = chain.mineBlock([
            Tx.contractCall(
                'escrow',
                'refund-escrow',
                [types.uint(1)],
                employer.address
            )
        ]);

        block.receipts[0].result.expectOk().expectUint(5000000);
        block.receipts[0].events.expectSTXTransferEvent(
            5000000,
            `${deployer.address}.escrow`,
            employer.address
        );
    }
});

Clarinet.test({
    name: "Employer can refund after deadline passes on active escrow",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const employer = accounts.get('wallet_1')!;
        const worker = accounts.get('wallet_2')!;

        chain.mineBlock([
            Tx.contractCall(
                'escrow',
                'create-escrow',
                [
                    types.principal(worker.address),
                    types.uint(5000000),
                    types.uint(5),
                ],
                employer.address
            )
        ]);

        chain.mineBlock([
            Tx.contractCall(
                'escrow',
                'activate-escrow',
                [types.uint(1)],
                worker.address
            )
        ]);

        // Mine past the deadline
        chain.mineEmptyBlock(10);

        let block = chain.mineBlock([
            Tx.contractCall(
                'escrow',
                'refund-escrow',
                [types.uint(1)],
                employer.address
            )
        ]);

        block.receipts[0].result.expectOk().expectUint(5000000);
    }
});

Clarinet.test({
    name: "Worker cannot refund an escrow",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const employer = accounts.get('wallet_1')!;
        const worker = accounts.get('wallet_2')!;

        chain.mineBlock([
            Tx.contractCall(
                'escrow',
                'create-escrow',
                [
                    types.principal(worker.address),
                    types.uint(5000000),
                    types.uint(1440),
                ],
                employer.address
            )
        ]);

        let block = chain.mineBlock([
            Tx.contractCall(
                'escrow',
                'refund-escrow',
                [types.uint(1)],
                worker.address
            )
        ]);

        block.receipts[0].result.expectErr().expectUint(400);
    }
});

Clarinet.test({
    name: "Cannot refund active escrow before deadline",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const employer = accounts.get('wallet_1')!;
        const worker = accounts.get('wallet_2')!;

        chain.mineBlock([
            Tx.contractCall(
                'escrow',
                'create-escrow',
                [
                    types.principal(worker.address),
                    types.uint(5000000),
                    types.uint(1440),
                ],
                employer.address
            )
        ]);

        chain.mineBlock([
            Tx.contractCall(
                'escrow',
                'activate-escrow',
                [types.uint(1)],
                worker.address
            )
        ]);

        let block = chain.mineBlock([
            Tx.contractCall(
                'escrow',
                'refund-escrow',
                [types.uint(1)],
                employer.address
            )
        ]);

        block.receipts[0].result.expectErr().expectUint(403);
    }
});

// ---------------------------------------------------------------------------
// Read-only getters
// ---------------------------------------------------------------------------

Clarinet.test({
    name: "get-escrow returns correct escrow data",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const employer = accounts.get('wallet_1')!;
        const worker = accounts.get('wallet_2')!;

        chain.mineBlock([
            Tx.contractCall(
                'escrow',
                'create-escrow',
                [
                    types.principal(worker.address),
                    types.uint(5000000),
                    types.uint(1440),
                ],
                employer.address
            )
        ]);

        let block = chain.mineBlock([
            Tx.contractCall(
                'escrow',
                'get-escrow',
                [types.uint(1)],
                employer.address
            )
        ]);

        const result = block.receipts[0].result;
        const escrow = result.expectSome().expectTuple();
        assertEquals(escrow['employer'], employer.address);
        assertEquals(escrow['worker'], worker.address);
        escrow['total-amount'].expectUint(5000000);
        escrow['released-amount'].expectUint(0);
    }
});

Clarinet.test({
    name: "get-escrow returns none for non-existent ID",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const user = accounts.get('wallet_1')!;

        let block = chain.mineBlock([
            Tx.contractCall(
                'escrow',
                'get-escrow',
                [types.uint(999)],
                user.address
            )
        ]);

        block.receipts[0].result.expectNone();
    }
});

Clarinet.test({
    name: "get-milestone returns correct milestone data",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const employer = accounts.get('wallet_1')!;
        const worker = accounts.get('wallet_2')!;

        chain.mineBlock([
            Tx.contractCall(
                'escrow',
                'create-escrow',
                [
                    types.principal(worker.address),
                    types.uint(5000000),
                    types.uint(1440),
                ],
                employer.address
            )
        ]);

        chain.mineBlock([
            Tx.contractCall(
                'escrow',
                'add-milestone',
                [
                    types.uint(1),
                    types.utf8("Design phase"),
                    types.uint(2000000),
                ],
                employer.address
            )
        ]);

        let block = chain.mineBlock([
            Tx.contractCall(
                'escrow',
                'get-milestone',
                [types.uint(1), types.uint(0)],
                employer.address
            )
        ]);

        const result = block.receipts[0].result;
        const milestone = result.expectSome().expectTuple();
        milestone['amount'].expectUint(2000000);
    }
});

Clarinet.test({
    name: "get-total-escrows returns zero initially",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const user = accounts.get('wallet_1')!;

        let block = chain.mineBlock([
            Tx.contractCall(
                'escrow',
                'get-total-escrows',
                [],
                user.address
            )
        ]);

        block.receipts[0].result.expectOk().expectUint(0);
    }
});

// ---------------------------------------------------------------------------
// End-to-end flow
// ---------------------------------------------------------------------------

Clarinet.test({
    name: "Full escrow lifecycle: create, milestone, activate, release, complete",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const employer = accounts.get('wallet_1')!;
        const worker = accounts.get('wallet_2')!;
        const deployer = accounts.get('deployer')!;

        // Step 1: Create escrow
        let block = chain.mineBlock([
            Tx.contractCall(
                'escrow',
                'create-escrow',
                [
                    types.principal(worker.address),
                    types.uint(3000000),
                    types.uint(14400),
                ],
                employer.address
            )
        ]);
        block.receipts[0].result.expectOk().expectUint(1);

        // Step 2: Add milestones
        block = chain.mineBlock([
            Tx.contractCall(
                'escrow',
                'add-milestone',
                [
                    types.uint(1),
                    types.utf8("Research and planning"),
                    types.uint(1000000),
                ],
                employer.address
            ),
            Tx.contractCall(
                'escrow',
                'add-milestone',
                [
                    types.uint(1),
                    types.utf8("Implementation and testing"),
                    types.uint(2000000),
                ],
                employer.address
            ),
        ]);
        block.receipts[0].result.expectOk().expectUint(0);
        block.receipts[1].result.expectOk().expectUint(1);

        // Step 3: Worker activates escrow
        block = chain.mineBlock([
            Tx.contractCall(
                'escrow',
                'activate-escrow',
                [types.uint(1)],
                worker.address
            )
        ]);
        block.receipts[0].result.expectOk().expectBool(true);

        // Step 4: Release first milestone
        block = chain.mineBlock([
            Tx.contractCall(
                'escrow',
                'release-milestone',
                [types.uint(1), types.uint(0)],
                employer.address
            )
        ]);
        block.receipts[0].result.expectOk().expectBool(true);
        block.receipts[0].events.expectSTXTransferEvent(
            1000000,
            `${deployer.address}.escrow`,
            worker.address
        );

        // Step 5: Release second milestone
        block = chain.mineBlock([
            Tx.contractCall(
                'escrow',
                'release-milestone',
                [types.uint(1), types.uint(1)],
                employer.address
            )
        ]);
        block.receipts[0].result.expectOk().expectBool(true);
        block.receipts[0].events.expectSTXTransferEvent(
            2000000,
            `${deployer.address}.escrow`,
            worker.address
        );

        // Step 6: Complete escrow
        block = chain.mineBlock([
            Tx.contractCall(
                'escrow',
                'complete-escrow',
                [types.uint(1)],
                employer.address
            )
        ]);
        block.receipts[0].result.expectOk().expectBool(true);

        // Verify final state
        block = chain.mineBlock([
            Tx.contractCall(
                'escrow',
                'get-escrow',
                [types.uint(1)],
                employer.address
            )
        ]);
        const escrow = block.receipts[0].result.expectSome().expectTuple();
        escrow['released-amount'].expectUint(3000000);
    }
});

Clarinet.test({
    name: "Refund returns remaining balance after partial milestone releases",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const employer = accounts.get('wallet_1')!;
        const worker = accounts.get('wallet_2')!;
        const deployer = accounts.get('deployer')!;

        // Create with short deadline
        chain.mineBlock([
            Tx.contractCall(
                'escrow',
                'create-escrow',
                [
                    types.principal(worker.address),
                    types.uint(5000000),
                    types.uint(10),
                ],
                employer.address
            )
        ]);

        // Add milestones
        chain.mineBlock([
            Tx.contractCall(
                'escrow',
                'add-milestone',
                [
                    types.uint(1),
                    types.utf8("Phase 1"),
                    types.uint(2000000),
                ],
                employer.address
            ),
            Tx.contractCall(
                'escrow',
                'add-milestone',
                [
                    types.uint(1),
                    types.utf8("Phase 2"),
                    types.uint(3000000),
                ],
                employer.address
            ),
        ]);

        // Activate
        chain.mineBlock([
            Tx.contractCall(
                'escrow',
                'activate-escrow',
                [types.uint(1)],
                worker.address
            )
        ]);

        // Release only first milestone
        chain.mineBlock([
            Tx.contractCall(
                'escrow',
                'release-milestone',
                [types.uint(1), types.uint(0)],
                employer.address
            )
        ]);

        // Wait past deadline
        chain.mineEmptyBlock(15);

        // Refund remaining
        let block = chain.mineBlock([
            Tx.contractCall(
                'escrow',
                'refund-escrow',
                [types.uint(1)],
                employer.address
            )
        ]);

        // 5000000 total - 2000000 released = 3000000 refund
        block.receipts[0].result.expectOk().expectUint(3000000);
        block.receipts[0].events.expectSTXTransferEvent(
            3000000,
            `${deployer.address}.escrow`,
            employer.address
        );
    }
});

// ---------------------------------------------------------------------------
// Cumulative milestone validation (err-exceeds-total)
// ---------------------------------------------------------------------------

Clarinet.test({
    name: "Milestones cannot cumulatively exceed the escrow total",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const employer = accounts.get('wallet_1')!;
        const worker = accounts.get('wallet_2')!;

        chain.mineBlock([
            Tx.contractCall('escrow', 'create-escrow', [
                types.principal(worker.address),
                types.uint(10_000_000),
                types.uint(1440),
            ], employer.address),
            Tx.contractCall('escrow', 'add-milestone', [
                types.uint(1), types.utf8("Phase 1"), types.uint(6_000_000),
            ], employer.address),
        ]);

        // Second milestone would push committed total over 10M
        let block = chain.mineBlock([
            Tx.contractCall('escrow', 'add-milestone', [
                types.uint(1), types.utf8("Phase 2"), types.uint(5_000_000),
            ], employer.address),
        ]);

        block.receipts[0].result.expectErr().expectUint(409);
    }
});

// ---------------------------------------------------------------------------
// Complete-escrow pending milestone guard (err-milestones-pending)
// ---------------------------------------------------------------------------

Clarinet.test({
    name: "Cannot complete escrow with unreleased committed milestones",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const employer = accounts.get('wallet_1')!;
        const worker = accounts.get('wallet_2')!;

        chain.mineBlock([
            Tx.contractCall('escrow', 'create-escrow', [
                types.principal(worker.address),
                types.uint(10_000_000),
                types.uint(1440),
            ], employer.address),
            Tx.contractCall('escrow', 'add-milestone', [
                types.uint(1), types.utf8("Phase 1"), types.uint(4_000_000),
            ], employer.address),
            Tx.contractCall('escrow', 'add-milestone', [
                types.uint(1), types.utf8("Phase 2"), types.uint(3_000_000),
            ], employer.address),
            Tx.contractCall('escrow', 'activate-escrow', [types.uint(1)], worker.address),
            // Release only the first milestone
            Tx.contractCall('escrow', 'release-milestone', [
                types.uint(1), types.uint(0),
            ], employer.address),
        ]);

        // Try completing with Phase 2 still pending
        let block = chain.mineBlock([
            Tx.contractCall('escrow', 'complete-escrow', [types.uint(1)], employer.address),
        ]);

        block.receipts[0].result.expectErr().expectUint(410);
    }
});

// ---------------------------------------------------------------------------
// Surplus refund on completion
// ---------------------------------------------------------------------------

Clarinet.test({
    name: "Completing escrow refunds uncommitted surplus to employer",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const employer = accounts.get('wallet_1')!;
        const worker = accounts.get('wallet_2')!;
        const deployer = accounts.get('deployer')!;

        chain.mineBlock([
            Tx.contractCall('escrow', 'create-escrow', [
                types.principal(worker.address),
                types.uint(10_000_000),
                types.uint(1440),
            ], employer.address),
            Tx.contractCall('escrow', 'add-milestone', [
                types.uint(1), types.utf8("Only task"), types.uint(7_000_000),
            ], employer.address),
            Tx.contractCall('escrow', 'activate-escrow', [types.uint(1)], worker.address),
            Tx.contractCall('escrow', 'release-milestone', [
                types.uint(1), types.uint(0),
            ], employer.address),
        ]);

        let block = chain.mineBlock([
            Tx.contractCall('escrow', 'complete-escrow', [types.uint(1)], employer.address),
        ]);

        block.receipts[0].result.expectOk().expectBool(true);
        // Surplus: 10M - 7M = 3M refunded
        block.receipts[0].events.expectSTXTransferEvent(
            3_000_000,
            `${deployer.address}.escrow`,
            employer.address
        );
    }
});

// ---------------------------------------------------------------------------
// Resolve escrow dispute
// ---------------------------------------------------------------------------

Clarinet.test({
    name: "Arbiter can resolve dispute in favour of worker",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const employer = accounts.get('wallet_1')!;
        const worker = accounts.get('wallet_2')!;
        const arbiter = accounts.get('wallet_3')!;

        // Register arbiter first
        chain.mineBlock([
            Tx.contractCall('dispute-resolver', 'register-arbiter', [
                types.principal(arbiter.address),
            ], deployer.address),
        ]);

        chain.mineBlock([
            Tx.contractCall('escrow', 'create-escrow', [
                types.principal(worker.address),
                types.uint(5_000_000),
                types.uint(1440),
            ], employer.address),
            Tx.contractCall('escrow', 'activate-escrow', [types.uint(1)], worker.address),
            Tx.contractCall('escrow', 'dispute-escrow', [types.uint(1)], worker.address),
        ]);

        let block = chain.mineBlock([
            Tx.contractCall('escrow', 'resolve-escrow-dispute', [
                types.uint(1), types.bool(true),
            ], arbiter.address),
        ]);

        block.receipts[0].result.expectOk().expectBool(true);
    }
});

Clarinet.test({
    name: "Arbiter can resolve dispute in favour of employer with refund",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const employer = accounts.get('wallet_1')!;
        const worker = accounts.get('wallet_2')!;
        const arbiter = accounts.get('wallet_3')!;

        chain.mineBlock([
            Tx.contractCall('dispute-resolver', 'register-arbiter', [
                types.principal(arbiter.address),
            ], deployer.address),
        ]);

        chain.mineBlock([
            Tx.contractCall('escrow', 'create-escrow', [
                types.principal(worker.address),
                types.uint(5_000_000),
                types.uint(1440),
            ], employer.address),
            Tx.contractCall('escrow', 'activate-escrow', [types.uint(1)], worker.address),
            Tx.contractCall('escrow', 'dispute-escrow', [types.uint(1)], employer.address),
        ]);

        let block = chain.mineBlock([
            Tx.contractCall('escrow', 'resolve-escrow-dispute', [
                types.uint(1), types.bool(false),
            ], arbiter.address),
        ]);

        block.receipts[0].result.expectOk().expectBool(true);
        // Employer gets refunded the full amount
        block.receipts[0].events.expectSTXTransferEvent(
            5_000_000,
            `${deployer.address}.escrow`,
            employer.address
        );
    }
});

Clarinet.test({
    name: "Non-arbiter cannot resolve escrow dispute",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const employer = accounts.get('wallet_1')!;
        const worker = accounts.get('wallet_2')!;
        const stranger = accounts.get('wallet_3')!;

        chain.mineBlock([
            Tx.contractCall('escrow', 'create-escrow', [
                types.principal(worker.address),
                types.uint(5_000_000),
                types.uint(1440),
            ], employer.address),
            Tx.contractCall('escrow', 'activate-escrow', [types.uint(1)], worker.address),
            Tx.contractCall('escrow', 'dispute-escrow', [types.uint(1)], worker.address),
        ]);

        let block = chain.mineBlock([
            Tx.contractCall('escrow', 'resolve-escrow-dispute', [
                types.uint(1), types.bool(true),
            ], stranger.address),
        ]);

        block.receipts[0].result.expectErr().expectUint(400);
    }
});

Clarinet.test({
    name: "Cannot resolve non-disputed escrow",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const employer = accounts.get('wallet_1')!;
        const worker = accounts.get('wallet_2')!;
        const arbiter = accounts.get('wallet_3')!;

        chain.mineBlock([
            Tx.contractCall('dispute-resolver', 'register-arbiter', [
                types.principal(arbiter.address),
            ], deployer.address),
        ]);

        chain.mineBlock([
            Tx.contractCall('escrow', 'create-escrow', [
                types.principal(worker.address),
                types.uint(5_000_000),
                types.uint(1440),
            ], employer.address),
            Tx.contractCall('escrow', 'activate-escrow', [types.uint(1)], worker.address),
        ]);

        let block = chain.mineBlock([
            Tx.contractCall('escrow', 'resolve-escrow-dispute', [
                types.uint(1), types.bool(true),
            ], arbiter.address),
        ]);

        block.receipts[0].result.expectErr().expectUint(411);
    }
});

// ---------------------------------------------------------------------------
// Read-only: get-remaining-committable
// ---------------------------------------------------------------------------

Clarinet.test({
    name: "get-remaining-committable tracks committed milestone amounts",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const employer = accounts.get('wallet_1')!;
        const worker = accounts.get('wallet_2')!;

        chain.mineBlock([
            Tx.contractCall('escrow', 'create-escrow', [
                types.principal(worker.address),
                types.uint(10_000_000),
                types.uint(1440),
            ], employer.address),
        ]);

        let full = chain.callReadOnlyFn(
            'escrow', 'get-remaining-committable', [types.uint(1)], employer.address
        );
        full.result.expectOk().expectUint(10_000_000);

        chain.mineBlock([
            Tx.contractCall('escrow', 'add-milestone', [
                types.uint(1), types.utf8("Phase 1"), types.uint(4_000_000),
            ], employer.address),
        ]);

        let partial = chain.callReadOnlyFn(
            'escrow', 'get-remaining-committable', [types.uint(1)], employer.address
        );
        partial.result.expectOk().expectUint(6_000_000);
    }
});

// ---------------------------------------------------------------------------
// Read-only: is-disputed
// ---------------------------------------------------------------------------

Clarinet.test({
    name: "is-disputed returns false for active and true for disputed escrow",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const employer = accounts.get('wallet_1')!;
        const worker = accounts.get('wallet_2')!;

        chain.mineBlock([
            Tx.contractCall('escrow', 'create-escrow', [
                types.principal(worker.address),
                types.uint(5_000_000),
                types.uint(1440),
            ], employer.address),
            Tx.contractCall('escrow', 'activate-escrow', [types.uint(1)], worker.address),
        ]);

        let before = chain.callReadOnlyFn(
            'escrow', 'is-disputed', [types.uint(1)], employer.address
        );
        before.result.expectOk().expectBool(false);

        chain.mineBlock([
            Tx.contractCall('escrow', 'dispute-escrow', [types.uint(1)], worker.address),
        ]);

        let after = chain.callReadOnlyFn(
            'escrow', 'is-disputed', [types.uint(1)], employer.address
        );
        after.result.expectOk().expectBool(true);
    }
});
