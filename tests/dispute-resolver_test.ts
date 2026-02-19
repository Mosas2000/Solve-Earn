import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v1.7.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.170.0/testing/asserts.ts';

// ---------------------------------------------------------------------------
// Arbiter registration
// ---------------------------------------------------------------------------

Clarinet.test({
    name: "Can register as an arbiter",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const arbiter = accounts.get('wallet_1')!;

        let block = chain.mineBlock([
            Tx.contractCall('dispute-resolver', 'register-arbiter', [], arbiter.address)
        ]);

        block.receipts[0].result.expectOk().expectBool(true);

        // Verify registration
        const check = chain.callReadOnlyFn(
            'dispute-resolver',
            'is-registered-arbiter',
            [types.principal(arbiter.address)],
            arbiter.address
        );
        check.result.expectBool(true);
    }
});

Clarinet.test({
    name: "Get active arbiter count after registration",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const a1 = accounts.get('wallet_1')!;
        const a2 = accounts.get('wallet_2')!;

        chain.mineBlock([
            Tx.contractCall('dispute-resolver', 'register-arbiter', [], a1.address),
            Tx.contractCall('dispute-resolver', 'register-arbiter', [], a2.address),
        ]);

        const count = chain.callReadOnlyFn(
            'dispute-resolver',
            'get-active-arbiter-count',
            [],
            a1.address
        );
        count.result.expectOk().expectUint(2);
    }
});

// ---------------------------------------------------------------------------
// Dispute creation
// ---------------------------------------------------------------------------

Clarinet.test({
    name: "Can create a dispute",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const initiator = accounts.get('wallet_1')!;

        let block = chain.mineBlock([
            Tx.contractCall(
                'dispute-resolver',
                'create-dispute',
                [types.uint(1), types.utf8("Invalid submission report")],
                initiator.address
            )
        ]);

        block.receipts[0].result.expectOk().expectUint(1);

        const dispute = chain.callReadOnlyFn(
            'dispute-resolver',
            'get-dispute',
            [types.uint(1)],
            initiator.address
        );
        const data = dispute.result.expectSome().expectTuple();
        assertEquals(data['status'], '"open"');
    }
});

Clarinet.test({
    name: "Total disputes counter increments",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const user = accounts.get('wallet_1')!;

        chain.mineBlock([
            Tx.contractCall('dispute-resolver', 'create-dispute',
                [types.uint(1), types.utf8("Reason A")], user.address),
            Tx.contractCall('dispute-resolver', 'create-dispute',
                [types.uint(2), types.utf8("Reason B")], user.address),
        ]);

        const total = chain.callReadOnlyFn(
            'dispute-resolver', 'get-total-disputes', [], user.address
        );
        total.result.expectOk().expectUint(2);
    }
});

// ---------------------------------------------------------------------------
// Voting
// ---------------------------------------------------------------------------

Clarinet.test({
    name: "Registered arbiter can vote on a dispute",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const initiator = accounts.get('wallet_1')!;
        const arbiter = accounts.get('wallet_2')!;

        chain.mineBlock([
            Tx.contractCall('dispute-resolver', 'register-arbiter', [], arbiter.address),
            Tx.contractCall('dispute-resolver', 'create-dispute',
                [types.uint(1), types.utf8("Bad report")], initiator.address),
        ]);

        let block = chain.mineBlock([
            Tx.contractCall('dispute-resolver', 'vote-on-dispute',
                [types.uint(1), types.bool(true)], arbiter.address)
        ]);

        block.receipts[0].result.expectOk().expectBool(true);
    }
});

Clarinet.test({
    name: "Non-arbiter cannot vote",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const initiator = accounts.get('wallet_1')!;
        const random = accounts.get('wallet_3')!;

        chain.mineBlock([
            Tx.contractCall('dispute-resolver', 'create-dispute',
                [types.uint(1), types.utf8("Some reason")], initiator.address),
        ]);

        let block = chain.mineBlock([
            Tx.contractCall('dispute-resolver', 'vote-on-dispute',
                [types.uint(1), types.bool(true)], random.address)
        ]);

        block.receipts[0].result.expectErr().expectUint(303);
    }
});

Clarinet.test({
    name: "Arbiter cannot vote twice on the same dispute",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const initiator = accounts.get('wallet_1')!;
        const arbiter = accounts.get('wallet_2')!;

        chain.mineBlock([
            Tx.contractCall('dispute-resolver', 'register-arbiter', [], arbiter.address),
            Tx.contractCall('dispute-resolver', 'create-dispute',
                [types.uint(1), types.utf8("Duplicate vote test")], initiator.address),
        ]);

        chain.mineBlock([
            Tx.contractCall('dispute-resolver', 'vote-on-dispute',
                [types.uint(1), types.bool(true)], arbiter.address)
        ]);

        let block = chain.mineBlock([
            Tx.contractCall('dispute-resolver', 'vote-on-dispute',
                [types.uint(1), types.bool(false)], arbiter.address)
        ]);

        block.receipts[0].result.expectErr().expectUint(302);
    }
});

Clarinet.test({
    name: "Vote increments arbiter total-votes",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const initiator = accounts.get('wallet_1')!;
        const arbiter = accounts.get('wallet_2')!;

        chain.mineBlock([
            Tx.contractCall('dispute-resolver', 'register-arbiter', [], arbiter.address),
            Tx.contractCall('dispute-resolver', 'create-dispute',
                [types.uint(1), types.utf8("Stats test")], initiator.address),
        ]);

        chain.mineBlock([
            Tx.contractCall('dispute-resolver', 'vote-on-dispute',
                [types.uint(1), types.bool(true)], arbiter.address)
        ]);

        const stats = chain.callReadOnlyFn(
            'dispute-resolver', 'get-arbiter-stats',
            [types.principal(arbiter.address)], arbiter.address
        );
        const data = stats.result.expectSome().expectTuple();
        assertEquals(data['total-votes'], 'u1');
    }
});

Clarinet.test({
    name: "Cannot vote on a non-existent dispute",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const arbiter = accounts.get('wallet_1')!;

        chain.mineBlock([
            Tx.contractCall('dispute-resolver', 'register-arbiter', [], arbiter.address),
        ]);

        let block = chain.mineBlock([
            Tx.contractCall('dispute-resolver', 'vote-on-dispute',
                [types.uint(999), types.bool(true)], arbiter.address)
        ]);

        block.receipts[0].result.expectErr().expectUint(301);
    }
});

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

Clarinet.test({
    name: "Cannot resolve dispute before voting period ends",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const initiator = accounts.get('wallet_1')!;
        const a1 = accounts.get('wallet_2')!;
        const a2 = accounts.get('wallet_3')!;
        const a3 = accounts.get('wallet_4')!;

        chain.mineBlock([
            Tx.contractCall('dispute-resolver', 'register-arbiter', [], a1.address),
            Tx.contractCall('dispute-resolver', 'register-arbiter', [], a2.address),
            Tx.contractCall('dispute-resolver', 'register-arbiter', [], a3.address),
            Tx.contractCall('dispute-resolver', 'create-dispute',
                [types.uint(1), types.utf8("Early resolve test")], initiator.address),
        ]);

        chain.mineBlock([
            Tx.contractCall('dispute-resolver', 'vote-on-dispute',
                [types.uint(1), types.bool(true)], a1.address),
            Tx.contractCall('dispute-resolver', 'vote-on-dispute',
                [types.uint(1), types.bool(true)], a2.address),
            Tx.contractCall('dispute-resolver', 'vote-on-dispute',
                [types.uint(1), types.bool(true)], a3.address),
        ]);

        // Try to resolve immediately (voting period not ended)
        let block = chain.mineBlock([
            Tx.contractCall('dispute-resolver', 'resolve-dispute',
                [types.uint(1)], initiator.address)
        ]);

        block.receipts[0].result.expectErr().expectUint(306);
    }
});

Clarinet.test({
    name: "Cannot resolve dispute without quorum",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const initiator = accounts.get('wallet_1')!;
        const a1 = accounts.get('wallet_2')!;

        chain.mineBlock([
            Tx.contractCall('dispute-resolver', 'register-arbiter', [], a1.address),
            Tx.contractCall('dispute-resolver', 'create-dispute',
                [types.uint(1), types.utf8("No quorum test")], initiator.address),
        ]);

        chain.mineBlock([
            Tx.contractCall('dispute-resolver', 'vote-on-dispute',
                [types.uint(1), types.bool(true)], a1.address),
        ]);

        // Advance past voting period (144 blocks)
        chain.mineEmptyBlockUntil(150);

        let block = chain.mineBlock([
            Tx.contractCall('dispute-resolver', 'resolve-dispute',
                [types.uint(1)], initiator.address)
        ]);

        block.receipts[0].result.expectErr().expectUint(305);
    }
});

Clarinet.test({
    name: "Resolve dispute with majority in favour",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const initiator = accounts.get('wallet_1')!;
        const a1 = accounts.get('wallet_2')!;
        const a2 = accounts.get('wallet_3')!;
        const a3 = accounts.get('wallet_4')!;

        chain.mineBlock([
            Tx.contractCall('dispute-resolver', 'register-arbiter', [], a1.address),
            Tx.contractCall('dispute-resolver', 'register-arbiter', [], a2.address),
            Tx.contractCall('dispute-resolver', 'register-arbiter', [], a3.address),
            Tx.contractCall('dispute-resolver', 'create-dispute',
                [types.uint(1), types.utf8("Majority for test")], initiator.address),
        ]);

        chain.mineBlock([
            Tx.contractCall('dispute-resolver', 'vote-on-dispute',
                [types.uint(1), types.bool(true)], a1.address),
            Tx.contractCall('dispute-resolver', 'vote-on-dispute',
                [types.uint(1), types.bool(true)], a2.address),
            Tx.contractCall('dispute-resolver', 'vote-on-dispute',
                [types.uint(1), types.bool(false)], a3.address),
        ]);

        // Advance past voting period
        chain.mineEmptyBlockUntil(150);

        let block = chain.mineBlock([
            Tx.contractCall('dispute-resolver', 'resolve-dispute',
                [types.uint(1)], initiator.address)
        ]);

        block.receipts[0].result.expectOk();

        // Check final dispute state
        const dispute = chain.callReadOnlyFn(
            'dispute-resolver', 'get-dispute', [types.uint(1)], initiator.address
        );
        const data = dispute.result.expectSome().expectTuple();
        assertEquals(data['status'], '"resolved"');
    }
});

Clarinet.test({
    name: "Resolve dispute with majority against rejects it",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const initiator = accounts.get('wallet_1')!;
        const a1 = accounts.get('wallet_2')!;
        const a2 = accounts.get('wallet_3')!;
        const a3 = accounts.get('wallet_4')!;

        chain.mineBlock([
            Tx.contractCall('dispute-resolver', 'register-arbiter', [], a1.address),
            Tx.contractCall('dispute-resolver', 'register-arbiter', [], a2.address),
            Tx.contractCall('dispute-resolver', 'register-arbiter', [], a3.address),
            Tx.contractCall('dispute-resolver', 'create-dispute',
                [types.uint(1), types.utf8("Majority against test")], initiator.address),
        ]);

        chain.mineBlock([
            Tx.contractCall('dispute-resolver', 'vote-on-dispute',
                [types.uint(1), types.bool(false)], a1.address),
            Tx.contractCall('dispute-resolver', 'vote-on-dispute',
                [types.uint(1), types.bool(false)], a2.address),
            Tx.contractCall('dispute-resolver', 'vote-on-dispute',
                [types.uint(1), types.bool(true)], a3.address),
        ]);

        chain.mineEmptyBlockUntil(150);

        let block = chain.mineBlock([
            Tx.contractCall('dispute-resolver', 'resolve-dispute',
                [types.uint(1)], initiator.address)
        ]);

        block.receipts[0].result.expectOk();

        const dispute = chain.callReadOnlyFn(
            'dispute-resolver', 'get-dispute', [types.uint(1)], initiator.address
        );
        const data = dispute.result.expectSome().expectTuple();
        assertEquals(data['status'], '"rejected"');
    }
});

Clarinet.test({
    name: "Cannot resolve a dispute twice",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const initiator = accounts.get('wallet_1')!;
        const a1 = accounts.get('wallet_2')!;
        const a2 = accounts.get('wallet_3')!;
        const a3 = accounts.get('wallet_4')!;

        chain.mineBlock([
            Tx.contractCall('dispute-resolver', 'register-arbiter', [], a1.address),
            Tx.contractCall('dispute-resolver', 'register-arbiter', [], a2.address),
            Tx.contractCall('dispute-resolver', 'register-arbiter', [], a3.address),
            Tx.contractCall('dispute-resolver', 'create-dispute',
                [types.uint(1), types.utf8("Double resolve test")], initiator.address),
        ]);

        chain.mineBlock([
            Tx.contractCall('dispute-resolver', 'vote-on-dispute',
                [types.uint(1), types.bool(true)], a1.address),
            Tx.contractCall('dispute-resolver', 'vote-on-dispute',
                [types.uint(1), types.bool(true)], a2.address),
            Tx.contractCall('dispute-resolver', 'vote-on-dispute',
                [types.uint(1), types.bool(true)], a3.address),
        ]);

        chain.mineEmptyBlockUntil(150);

        chain.mineBlock([
            Tx.contractCall('dispute-resolver', 'resolve-dispute',
                [types.uint(1)], initiator.address)
        ]);

        let block = chain.mineBlock([
            Tx.contractCall('dispute-resolver', 'resolve-dispute',
                [types.uint(1)], initiator.address)
        ]);

        block.receipts[0].result.expectErr().expectUint(307);
    }
});

// ---------------------------------------------------------------------------
// Voting period enforcement
// ---------------------------------------------------------------------------

Clarinet.test({
    name: "Cannot vote after voting period expires",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const initiator = accounts.get('wallet_1')!;
        const arbiter = accounts.get('wallet_2')!;

        chain.mineBlock([
            Tx.contractCall('dispute-resolver', 'register-arbiter', [], arbiter.address),
            Tx.contractCall('dispute-resolver', 'create-dispute',
                [types.uint(1), types.utf8("Late vote test")], initiator.address),
        ]);

        // Advance past voting period
        chain.mineEmptyBlockUntil(150);

        let block = chain.mineBlock([
            Tx.contractCall('dispute-resolver', 'vote-on-dispute',
                [types.uint(1), types.bool(true)], arbiter.address)
        ]);

        block.receipts[0].result.expectErr().expectUint(304);
    }
});

Clarinet.test({
    name: "Cannot vote on a resolved dispute",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const initiator = accounts.get('wallet_1')!;
        const a1 = accounts.get('wallet_2')!;
        const a2 = accounts.get('wallet_3')!;
        const a3 = accounts.get('wallet_4')!;
        const lateArbiter = accounts.get('wallet_5')!;

        chain.mineBlock([
            Tx.contractCall('dispute-resolver', 'register-arbiter', [], a1.address),
            Tx.contractCall('dispute-resolver', 'register-arbiter', [], a2.address),
            Tx.contractCall('dispute-resolver', 'register-arbiter', [], a3.address),
            Tx.contractCall('dispute-resolver', 'register-arbiter', [], lateArbiter.address),
            Tx.contractCall('dispute-resolver', 'create-dispute',
                [types.uint(1), types.utf8("Closed vote test")], initiator.address),
        ]);

        chain.mineBlock([
            Tx.contractCall('dispute-resolver', 'vote-on-dispute',
                [types.uint(1), types.bool(true)], a1.address),
            Tx.contractCall('dispute-resolver', 'vote-on-dispute',
                [types.uint(1), types.bool(true)], a2.address),
            Tx.contractCall('dispute-resolver', 'vote-on-dispute',
                [types.uint(1), types.bool(true)], a3.address),
        ]);

        chain.mineEmptyBlockUntil(150);

        chain.mineBlock([
            Tx.contractCall('dispute-resolver', 'resolve-dispute',
                [types.uint(1)], initiator.address)
        ]);

        let block = chain.mineBlock([
            Tx.contractCall('dispute-resolver', 'vote-on-dispute',
                [types.uint(1), types.bool(true)], lateArbiter.address)
        ]);

        block.receipts[0].result.expectErr().expectUint(304);
    }
});

// ---------------------------------------------------------------------------
// Arbiter management
// ---------------------------------------------------------------------------

Clarinet.test({
    name: "Contract owner can deactivate an arbiter",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const arbiter = accounts.get('wallet_1')!;

        chain.mineBlock([
            Tx.contractCall('dispute-resolver', 'register-arbiter', [], arbiter.address),
        ]);

        let block = chain.mineBlock([
            Tx.contractCall('dispute-resolver', 'deactivate-arbiter',
                [types.principal(arbiter.address)], deployer.address)
        ]);

        block.receipts[0].result.expectOk().expectBool(true);

        const check = chain.callReadOnlyFn(
            'dispute-resolver', 'is-registered-arbiter',
            [types.principal(arbiter.address)], deployer.address
        );
        check.result.expectBool(false);
    }
});

Clarinet.test({
    name: "Non-owner cannot deactivate an arbiter",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const arbiter = accounts.get('wallet_1')!;
        const random = accounts.get('wallet_2')!;

        chain.mineBlock([
            Tx.contractCall('dispute-resolver', 'register-arbiter', [], arbiter.address),
        ]);

        let block = chain.mineBlock([
            Tx.contractCall('dispute-resolver', 'deactivate-arbiter',
                [types.principal(arbiter.address)], random.address)
        ]);

        block.receipts[0].result.expectErr().expectUint(300);
    }
});

Clarinet.test({
    name: "Deactivated arbiter cannot vote",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const initiator = accounts.get('wallet_1')!;
        const arbiter = accounts.get('wallet_2')!;

        chain.mineBlock([
            Tx.contractCall('dispute-resolver', 'register-arbiter', [], arbiter.address),
            Tx.contractCall('dispute-resolver', 'create-dispute',
                [types.uint(1), types.utf8("Deactivated arbiter test")], initiator.address),
        ]);

        chain.mineBlock([
            Tx.contractCall('dispute-resolver', 'deactivate-arbiter',
                [types.principal(arbiter.address)], deployer.address)
        ]);

        let block = chain.mineBlock([
            Tx.contractCall('dispute-resolver', 'vote-on-dispute',
                [types.uint(1), types.bool(true)], arbiter.address)
        ]);

        block.receipts[0].result.expectErr().expectUint(308);
    }
});

// ---------------------------------------------------------------------------
// Voting deadline read-only
// ---------------------------------------------------------------------------

Clarinet.test({
    name: "Get voting deadline returns correct block height",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const user = accounts.get('wallet_1')!;

        let block = chain.mineBlock([
            Tx.contractCall('dispute-resolver', 'create-dispute',
                [types.uint(1), types.utf8("Deadline test")], user.address),
        ]);

        // Dispute was created at block-height of the mineBlock call
        // The voting deadline should be created-at + 144
        const deadline = chain.callReadOnlyFn(
            'dispute-resolver', 'get-voting-deadline', [types.uint(1)], user.address
        );
        deadline.result.expectOk();
    }
});

// ---------------------------------------------------------------------------
// Arbiter registration access control
// ---------------------------------------------------------------------------

Clarinet.test({
    name: "Only contract owner can register arbiters",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const nonOwner = accounts.get('wallet_1')!;
        const arbiter = accounts.get('wallet_2')!;

        let block = chain.mineBlock([
            Tx.contractCall('dispute-resolver', 'register-arbiter', [
                types.principal(arbiter.address),
            ], nonOwner.address),
        ]);

        block.receipts[0].result.expectErr().expectUint(300); // err-unauthorized
    }
});

Clarinet.test({
    name: "Cannot register the same arbiter twice",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const arbiter = accounts.get('wallet_1')!;

        chain.mineBlock([
            Tx.contractCall('dispute-resolver', 'register-arbiter', [
                types.principal(arbiter.address),
            ], deployer.address),
        ]);

        let block = chain.mineBlock([
            Tx.contractCall('dispute-resolver', 'register-arbiter', [
                types.principal(arbiter.address),
            ], deployer.address),
        ]);

        block.receipts[0].result.expectErr().expectUint(309); // err-already-registered
    }
});

// ---------------------------------------------------------------------------
// Arbiter deactivation
// ---------------------------------------------------------------------------

Clarinet.test({
    name: "Owner can deactivate a registered arbiter",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const arbiter = accounts.get('wallet_1')!;

        chain.mineBlock([
            Tx.contractCall('dispute-resolver', 'register-arbiter', [
                types.principal(arbiter.address),
            ], deployer.address),
        ]);

        let block = chain.mineBlock([
            Tx.contractCall('dispute-resolver', 'deactivate-arbiter', [
                types.principal(arbiter.address),
            ], deployer.address),
        ]);

        block.receipts[0].result.expectOk().expectBool(true);

        // Verify the arbiter is no longer active
        let check = chain.callReadOnlyFn(
            'dispute-resolver', 'is-registered-arbiter',
            [types.principal(arbiter.address)], deployer.address
        );
        assertEquals(check.result, 'false');
    }
});

Clarinet.test({
    name: "Deactivated arbiter cannot vote on disputes",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const arbiter = accounts.get('wallet_1')!;
        const user = accounts.get('wallet_2')!;

        chain.mineBlock([
            Tx.contractCall('dispute-resolver', 'register-arbiter', [
                types.principal(arbiter.address),
            ], deployer.address),
            Tx.contractCall('dispute-resolver', 'deactivate-arbiter', [
                types.principal(arbiter.address),
            ], deployer.address),
        ]);

        chain.mineBlock([
            Tx.contractCall('dispute-resolver', 'create-dispute', [
                types.uint(1), types.utf8("Test dispute"),
            ], user.address),
        ]);

        let block = chain.mineBlock([
            Tx.contractCall('dispute-resolver', 'vote-on-dispute', [
                types.uint(1), types.bool(true),
            ], arbiter.address),
        ]);

        block.receipts[0].result.expectErr().expectUint(308); // err-arbiter-inactive
    }
});

// ---------------------------------------------------------------------------
// Quorum enforcement
// ---------------------------------------------------------------------------

Clarinet.test({
    name: "Cannot resolve dispute without reaching quorum",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const arbiter1 = accounts.get('wallet_1')!;
        const arbiter2 = accounts.get('wallet_2')!;
        const user = accounts.get('wallet_3')!;

        chain.mineBlock([
            Tx.contractCall('dispute-resolver', 'register-arbiter', [
                types.principal(arbiter1.address),
            ], deployer.address),
            Tx.contractCall('dispute-resolver', 'register-arbiter', [
                types.principal(arbiter2.address),
            ], deployer.address),
        ]);

        chain.mineBlock([
            Tx.contractCall('dispute-resolver', 'create-dispute', [
                types.uint(1), types.utf8("Quorum test"),
            ], user.address),
        ]);

        // Only 2 votes, quorum is 3
        chain.mineBlock([
            Tx.contractCall('dispute-resolver', 'vote-on-dispute', [
                types.uint(1), types.bool(true),
            ], arbiter1.address),
            Tx.contractCall('dispute-resolver', 'vote-on-dispute', [
                types.uint(1), types.bool(true),
            ], arbiter2.address),
        ]);

        // Wait past voting period
        chain.mineEmptyBlock(145);

        let block = chain.mineBlock([
            Tx.contractCall('dispute-resolver', 'resolve-dispute', [
                types.uint(1),
            ], user.address),
        ]);

        block.receipts[0].result.expectErr().expectUint(305); // err-quorum-not-reached
    }
});

// ---------------------------------------------------------------------------
// Duplicate vote prevention
// ---------------------------------------------------------------------------

Clarinet.test({
    name: "Arbiter cannot vote twice on the same dispute",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const arbiter = accounts.get('wallet_1')!;
        const user = accounts.get('wallet_2')!;

        chain.mineBlock([
            Tx.contractCall('dispute-resolver', 'register-arbiter', [
                types.principal(arbiter.address),
            ], deployer.address),
        ]);

        chain.mineBlock([
            Tx.contractCall('dispute-resolver', 'create-dispute', [
                types.uint(1), types.utf8("Dup vote test"),
            ], user.address),
        ]);

        chain.mineBlock([
            Tx.contractCall('dispute-resolver', 'vote-on-dispute', [
                types.uint(1), types.bool(true),
            ], arbiter.address),
        ]);

        let block = chain.mineBlock([
            Tx.contractCall('dispute-resolver', 'vote-on-dispute', [
                types.uint(1), types.bool(false),
            ], arbiter.address),
        ]);

        block.receipts[0].result.expectErr().expectUint(302); // err-already-voted
    }
});
