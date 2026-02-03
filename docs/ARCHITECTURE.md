# Solve-Earn Architecture

## Smart Contract Layer

### bounty-vault.clar
Core bounty management contract handling vault creation, fund deposits, and payouts.

### reputation.clar
Tracks researcher reputation scores based on successful submissions and dispute outcomes.

### dispute-resolver.clar
Manages disputes between projects and researchers with arbiter voting mechanism.

## Frontend Layer

React application providing interfaces for:
- Project owners to create bounties
- Researchers to submit findings
- Community to view leaderboards

## Integration Points

- Stacks blockchain for contract deployment
- Bitcoin for final settlement
- IPFS for vulnerability report storage
