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
