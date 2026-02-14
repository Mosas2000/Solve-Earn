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
