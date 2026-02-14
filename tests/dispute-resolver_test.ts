import {
    Clarinet,
    Tx,
    Chain,
    Account,
    types
} from 'https://deno.land/x/clarinet@v1.7.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.170.0/testing/asserts.ts';

Clarinet.test({
    name: "Arbiter can register successfully",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const arbiter = accounts.get('wallet_1')!;

        // Register arbiter
        let block = chain.mineBlock([
            Tx.contractCall(
                'dispute-resolver',
                'register-arbiter',
                [],
                arbiter.address
            )
        ]);

        // Should return ok true
        block.receipts[0].result.expectOk().expectBool(true);
    }
});

Clarinet.test({
    name: "User can create a dispute",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const user = accounts.get('wallet_1')!;

        // Create dispute
        let block = chain.mineBlock([
            Tx.contractCall(
                'dispute-resolver',
                'create-dispute',
                [
                    types.uint(1),
                    types.utf8("Vulnerability report is inaccurate")
                ],
                user.address
            )
        ]);

        // Should return ok with dispute-id 1
        block.receipts[0].result.expectOk().expectUint(1);

        // Verify dispute was created
        let disputeResult = chain.callReadOnlyFn(
            'dispute-resolver',
            'get-dispute',
            [types.uint(1)],
            user.address
        );

        const dispute = disputeResult.result.expectSome().expectTuple();
        assertEquals(dispute['submission-id'], types.uint(1));
        assertEquals(dispute['initiator'], types.principal(user.address));
        assertEquals(dispute['votes-for'], types.uint(0));
        assertEquals(dispute['votes-against'], types.uint(0));
        assertEquals(dispute['status'], types.ascii("open"));
    }
});

Clarinet.test({
    name: "Arbiter can vote on dispute",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const user = accounts.get('wallet_1')!;
        const arbiter = accounts.get('wallet_2')!;

        // Register arbiter
        chain.mineBlock([
            Tx.contractCall(
                'dispute-resolver',
                'register-arbiter',
                [],
                arbiter.address
            )
        ]);

        // Create dispute
        chain.mineBlock([
            Tx.contractCall(
                'dispute-resolver',
                'create-dispute',
                [
                    types.uint(1),
                    types.utf8("Testing vote functionality")
                ],
                user.address
            )
        ]);

        // Arbiter votes for the dispute
        let block = chain.mineBlock([
            Tx.contractCall(
                'dispute-resolver',
                'vote-on-dispute',
                [
                    types.uint(1),
                    types.bool(true)
                ],
                arbiter.address
            )
        ]);

        block.receipts[0].result.expectOk().expectBool(true);

        // Verify vote was recorded
        let disputeResult = chain.callReadOnlyFn(
            'dispute-resolver',
            'get-dispute',
            [types.uint(1)],
            user.address
        );

        const dispute = disputeResult.result.expectSome().expectTuple();
        assertEquals(dispute['votes-for'], types.uint(1));
        assertEquals(dispute['votes-against'], types.uint(0));
    }
});

Clarinet.test({
    name: "Prevents duplicate voting by same arbiter",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const user = accounts.get('wallet_1')!;
        const arbiter = accounts.get('wallet_2')!;

        // Register arbiter
        chain.mineBlock([
            Tx.contractCall(
                'dispute-resolver',
                'register-arbiter',
                [],
                arbiter.address
            )
        ]);

        // Create dispute
        chain.mineBlock([
            Tx.contractCall(
                'dispute-resolver',
                'create-dispute',
                [
                    types.uint(1),
                    types.utf8("Testing duplicate vote prevention")
                ],
                user.address
            )
        ]);

        // First vote should succeed
        chain.mineBlock([
            Tx.contractCall(
                'dispute-resolver',
                'vote-on-dispute',
                [
                    types.uint(1),
                    types.bool(true)
                ],
                arbiter.address
            )
        ]);

        // Second vote should fail with err u302
        let block = chain.mineBlock([
            Tx.contractCall(
                'dispute-resolver',
                'vote-on-dispute',
                [
                    types.uint(1),
                    types.bool(false)
                ],
                arbiter.address
            )
        ]);

        block.receipts[0].result.expectErr().expectUint(302);
    }
});

Clarinet.test({
    name: "Prevents non-arbiter from voting on disputes",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const user = accounts.get('wallet_1')!;
        const nonArbiter = accounts.get('wallet_2')!;

        // Create dispute
        chain.mineBlock([
            Tx.contractCall(
                'dispute-resolver',
                'create-dispute',
                [
                    types.uint(1),
                    types.utf8("Testing non-arbiter vote prevention")
                ],
                user.address
            )
        ]);

        // Non-arbiter tries to vote - should fail with err u303
        let block = chain.mineBlock([
            Tx.contractCall(
                'dispute-resolver',
                'vote-on-dispute',
                [
                    types.uint(1),
                    types.bool(true)
                ],
                nonArbiter.address
            )
        ]);

        block.receipts[0].result.expectErr().expectUint(303);
    }
});

Clarinet.test({
    name: "Returns error for non-existent dispute",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const arbiter = accounts.get('wallet_1')!;

        // Register arbiter
        chain.mineBlock([
            Tx.contractCall(
                'dispute-resolver',
                'register-arbiter',
                [],
                arbiter.address
            )
        ]);

        // Try to vote on non-existent dispute - should fail with err u301
        let block = chain.mineBlock([
            Tx.contractCall(
                'dispute-resolver',
                'vote-on-dispute',
                [
                    types.uint(999),
                    types.bool(true)
                ],
                arbiter.address
            )
        ]);

        block.receipts[0].result.expectErr().expectUint(301);
    }
});



