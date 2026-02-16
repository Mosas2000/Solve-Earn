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

Clarinet.test({
    name: "Owner can add and query a trusted caller",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const trustedContract = accounts.get('wallet_1')!;

        // Add trusted caller
        let block = chain.mineBlock([
            Tx.contractCall(
                'reputation',
                'set-trusted-caller',
                [types.principal(trustedContract.address)],
                deployer.address
            )
        ]);

        block.receipts[0].result.expectOk().expectBool(true);

        // Verify the caller is now trusted
        let result = chain.callReadOnlyFn(
            'reputation',
            'is-trusted-caller',
            [types.principal(trustedContract.address)],
            deployer.address
        );

        assertEquals(result.result, types.bool(true));
    }
});

Clarinet.test({
    name: "Owner can remove a trusted caller",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const trustedContract = accounts.get('wallet_1')!;

        // Add then remove trusted caller
        chain.mineBlock([
            Tx.contractCall(
                'reputation',
                'set-trusted-caller',
                [types.principal(trustedContract.address)],
                deployer.address
            )
        ]);

        let block = chain.mineBlock([
            Tx.contractCall(
                'reputation',
                'remove-trusted-caller',
                [types.principal(trustedContract.address)],
                deployer.address
            )
        ]);

        block.receipts[0].result.expectOk().expectBool(true);

        // Verify the caller is no longer trusted
        let result = chain.callReadOnlyFn(
            'reputation',
            'is-trusted-caller',
            [types.principal(trustedContract.address)],
            deployer.address
        );

        assertEquals(result.result, types.bool(false));
    }
});

Clarinet.test({
    name: "Non-owner cannot add a trusted caller",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const unauthorized = accounts.get('wallet_1')!;
        const target = accounts.get('wallet_2')!;

        // Non-owner tries to add trusted caller - should fail with err u100
        let block = chain.mineBlock([
            Tx.contractCall(
                'reputation',
                'set-trusted-caller',
                [types.principal(target.address)],
                unauthorized.address
            )
        ]);

        block.receipts[0].result.expectErr().expectUint(100);
    }
});

Clarinet.test({
    name: "Non-owner cannot remove a trusted caller",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const unauthorized = accounts.get('wallet_1')!;
        const target = accounts.get('wallet_2')!;

        // Owner adds a trusted caller
        chain.mineBlock([
            Tx.contractCall(
                'reputation',
                'set-trusted-caller',
                [types.principal(target.address)],
                deployer.address
            )
        ]);

        // Non-owner tries to remove - should fail with err u100
        let block = chain.mineBlock([
            Tx.contractCall(
                'reputation',
                'remove-trusted-caller',
                [types.principal(target.address)],
                unauthorized.address
            )
        ]);

        block.receipts[0].result.expectErr().expectUint(100);

        // Verify caller is still trusted
        let result = chain.callReadOnlyFn(
            'reputation',
            'is-trusted-caller',
            [types.principal(target.address)],
            deployer.address
        );

        assertEquals(result.result, types.bool(true));
    }
});

Clarinet.test({
    name: "Researcher list is initially empty",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const caller = accounts.get('wallet_1')!;

        let result = chain.callReadOnlyFn(
            'reputation',
            'get-researcher-list',
            [],
            caller.address
        );

        result.result.expectOk().expectList([]);
    }
});

Clarinet.test({
    name: "Researcher list contains principal after registration",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const researcher = accounts.get('wallet_1')!;

        chain.mineBlock([
            Tx.contractCall(
                'reputation',
                'register-researcher',
                [],
                researcher.address
            )
        ]);

        let result = chain.callReadOnlyFn(
            'reputation',
            'get-researcher-list',
            [],
            researcher.address
        );

        const list = result.result.expectOk().expectList();
        assertEquals(list.length, 1);
        assertEquals(list[0], types.principal(researcher.address));
    }
});

Clarinet.test({
    name: "Researcher list grows with multiple registrations",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const r1 = accounts.get('wallet_1')!;
        const r2 = accounts.get('wallet_2')!;

        chain.mineBlock([
            Tx.contractCall('reputation', 'register-researcher', [], r1.address),
            Tx.contractCall('reputation', 'register-researcher', [], r2.address)
        ]);

        let result = chain.callReadOnlyFn(
            'reputation',
            'get-researcher-list',
            [],
            r1.address
        );

        const list = result.result.expectOk().expectList();
        assertEquals(list.length, 2);
        assertEquals(list[0], types.principal(r1.address));
        assertEquals(list[1], types.principal(r2.address));
    }
});

Clarinet.test({
    name: "Duplicate registration does not add duplicate to researcher list",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const researcher = accounts.get('wallet_1')!;

        // First registration succeeds
        chain.mineBlock([
            Tx.contractCall('reputation', 'register-researcher', [], researcher.address)
        ]);

        // Second registration fails (err u100)
        let block = chain.mineBlock([
            Tx.contractCall('reputation', 'register-researcher', [], researcher.address)
        ]);
        block.receipts[0].result.expectErr().expectUint(100);

        // List should still contain only one entry
        let result = chain.callReadOnlyFn(
            'reputation',
            'get-researcher-list',
            [],
            researcher.address
        );

        const list = result.result.expectOk().expectList();
        assertEquals(list.length, 1);
    }
});
