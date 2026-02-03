# Solve-Earn API Documentation

## Contract Addresses

### Mainnet
- Bounty Vault: `SP000000000000000000000000000000000.bounty-vault`
- Reputation: `SP000000000000000000000000000000000.reputation`
- Dispute Resolver: `SP000000000000000000000000000000000.dispute-resolver`

## Read-Only Functions

### get-bounty
Retrieve bounty details by ID.

**Parameters:**
- `bounty-id` (uint): Bounty identifier

**Returns:** Bounty tuple or none

### get-researcher-profile
Get researcher statistics and reputation.

**Parameters:**
- `researcher` (principal): Researcher address

**Returns:** Profile tuple or none

### calculate-success-rate
Calculate researcher success percentage.

**Parameters:**
- `researcher` (principal): Researcher address

**Returns:** Success rate as percentage

## Public Functions

### create-bounty
Initialize new bounty program.

**Parameters:**
- `title` (string-utf8 100)
- `description` (string-utf8 500)
- `total-pool` (uint): Total STX allocated
- `critical-reward` (uint)
- `high-reward` (uint)
- `medium-reward` (uint)
- `low-reward` (uint)
- `duration-blocks` (uint)

**Returns:** Bounty ID

### submit-vulnerability
Submit security finding to bounty.

**Parameters:**
- `bounty-id` (uint)
- `severity` (string-ascii 10): "critical", "high", "medium", or "low"
- `report-hash` (buff 32): IPFS hash of report

**Returns:** Submission ID

### approve-submission
Accept submission and trigger payout.

**Parameters:**
- `submission-id` (uint)

**Authorization:** Bounty creator only

**Returns:** Boolean success

## Error Codes

- `u100`: Unauthorized
- `u101`: Not found
- `u200`: Bounty operation error
- `u201`: Bounty not found
- `u202`: Insufficient funds
- `u300`: Dispute error
