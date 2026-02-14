import {
    Clarinet,
    Tx,
    Chain,
    Account,
    types
} from 'https://deno.land/x/clarinet@v1.7.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.170.0/testing/asserts.ts';

Clarinet.test({
    name: "Researcher can register successfully",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const researcher = accounts.get('wallet_1')!;

        // Register researcher
        let block = chain.mineBlock([
            Tx.contractCall(
                'reputation',
                'register-researcher',
                [],
                researcher.address
            )
        ]);

        // Should return ok true
        block.receipts[0].result.expectOk().expectBool(true);

        // Verify researcher profile was created
        let profileResult = chain.callReadOnlyFn(
            'reputation',
            'get-researcher-profile',
            [types.principal(researcher.address)],
            researcher.address
        );

        const profile = profileResult.result.expectSome().expectTuple();
        assertEquals(profile['total-submissions'], types.uint(0));
        assertEquals(profile['accepted-submissions'], types.uint(0));
        assertEquals(profile['rejected-submissions'], types.uint(0));
        assertEquals(profile['total-earned'], types.uint(0));
        assertEquals(profile['reputation-score'], types.uint(50));
        assertEquals(profile['is-verified'], types.bool(false));
    }
});

Clarinet.test({
    name: "Prevents duplicate researcher registration",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const researcher = accounts.get('wallet_1')!;

        // First registration should succeed
        let block = chain.mineBlock([
            Tx.contractCall(
                'reputation',
                'register-researcher',
                [],
                researcher.address
            )
        ]);
        block.receipts[0].result.expectOk().expectBool(true);

        // Second registration should fail with err u100
        block = chain.mineBlock([
            Tx.contractCall(
                'reputation',
                'register-researcher',
                [],
                researcher.address
            )
        ]);
        block.receipts[0].result.expectErr().expectUint(100);
    }
});

Clarinet.test({
    name: "Calculate success rate for researcher",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const researcher = accounts.get('wallet_1')!;

        // Register researcher
        chain.mineBlock([
            Tx.contractCall(
                'reputation',
                'register-researcher',
                [],
                researcher.address
            )
        ]);

        // Initially, success rate should be 0 (no submissions yet)
        let successRateResult = chain.callReadOnlyFn(
            'reputation',
            'calculate-success-rate',
            [types.principal(researcher.address)],
            researcher.address
        );

        successRateResult.result.expectOk().expectUint(0);
    }
});

Clarinet.test({
    name: "Get reputation score for researcher",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const researcher = accounts.get('wallet_1')!;

        // Register researcher
        chain.mineBlock([
            Tx.contractCall(
                'reputation',
                'register-researcher',
                [],
                researcher.address
            )
        ]);

        // Get reputation score (should be initial 50)
        let scoreResult = chain.callReadOnlyFn(
            'reputation',
            'get-reputation-score',
            [types.principal(researcher.address)],
            researcher.address
        );

        scoreResult.result.expectOk().expectUint(50);
    }
});

Clarinet.test({
    name: "Returns error for non-existent researcher profile",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const researcher = accounts.get('wallet_1')!;

        // Try to get score without registration - should return err u101
        let scoreResult = chain.callReadOnlyFn(
            'reputation',
            'get-reputation-score',
            [types.principal(researcher.address)],
            researcher.address
        );

        scoreResult.result.expectErr().expectUint(101);
    }
});

Clarinet.test({
    name: "Get total researchers count",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const researcher1 = accounts.get('wallet_1')!;
        const researcher2 = accounts.get('wallet_2')!;

        // Initially should be 0
        let countResult = chain.callReadOnlyFn(
            'reputation',
            'get-total-researchers',
            [],
            researcher1.address
        );
        countResult.result.expectOk().expectUint(0);

        // Register two researchers
        chain.mineBlock([
            Tx.contractCall(
                'reputation',
                'register-researcher',
                [],
                researcher1.address
            ),
            Tx.contractCall(
                'reputation',
                'register-researcher',
                [],
                researcher2.address
            )
        ]);

        // Should now be 2
        countResult = chain.callReadOnlyFn(
            'reputation',
            'get-total-researchers',
            [],
            researcher1.address
        );
        countResult.result.expectOk().expectUint(2);
    }
});

