# Solve-Earn

Decentralized bug bounty platform built on Stacks blockchain, enabling trustless vulnerability reporting and automated rewards.

## 🎉 **NOW LIVE ON MAINNET!**

**Contract Address:** `SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T`

👉 **[Quick Start Testing Guide](READY_TO_TEST.md)**

## Features

- Trustless escrow system for bounty funds
- Multi-tier severity classification
- Automated payout on approval
- Researcher reputation tracking
- Dispute resolution mechanism
- Real-time bounty dashboard

## Architecture

### Smart Contracts

**bounty-vault.clar**
Core contract managing bounty creation, submissions, and payouts.

**reputation.clar**
Tracks researcher credibility and historical performance.

**dispute-resolver.clar**
Handles conflicts with community arbiter voting.

### Frontend

React application with Stacks Connect integration for wallet management and contract interactions.

## Quick Start

### 🌐 Use Live Platform

The platform is deployed and ready to use on Stacks mainnet!

1. **Connect your wallet** at [Solve-Earn](https://solve-earn.example.com) (coming soon)
2. **Browse bounties** and start reporting vulnerabilities
3. **Earn rewards** for valid submissions

### 🧪 Test On-Chain Transactions

```bash
# Verify deployment
cd scripts
node test-readonly.js

# Setup your wallet
cp .env.example .env
# Add your STACKS_PRIVATE_KEY to .env

# Run interactive tests
node test-interactive.js
```

📚 **Full Testing Guide:** [READY_TO_TEST.md](READY_TO_TEST.md)

### 💻 Local Development

```bash
git clone https://github.com/yourusername/solve-earn.git
cd solve-earn

# Test contracts
clarinet test

# Run frontend
cd frontend
npm install
npm run dev
```

Visit: http://localhost:5173

## 📖 Documentation

- **[READY_TO_TEST.md](READY_TO_TEST.md)** - Complete testing guide
- **[MAINNET_DEPLOYMENT.md](MAINNET_DEPLOYMENT.md)** - Deployment details
- **[scripts/README.md](scripts/README.md)** - Testing scripts overview
- **[scripts/TESTING.md](scripts/TESTING.md)** - Comprehensive testing docs
- **[docs/API.md](docs/API.md)** - Contract API reference
- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** - System architecture

### Deployment

```bash
bash scripts/deploy-mainnet.sh
```

Update `CONTRACT_ADDRESS` in `frontend/src/utils/contractCalls.ts` with your deployed contract address.

```bash
bash scripts/build-frontend.sh
```

## Usage

### For Projects

1. Connect wallet
2. Create bounty with reward tiers
3. Review submissions
4. Approve/reject findings
5. Automatic payouts on approval

### For Researchers

1. Connect wallet
2. Browse active bounties
3. Submit vulnerability reports
4. Earn reputation and rewards
5. Participate in dispute resolution

## Contract Functions

### Bounty Vault

- `create-bounty`: Initialize new bounty program
- `submit-vulnerability`: Submit security finding
- `approve-submission`: Accept and pay researcher
- `reject-submission`: Decline submission
- `close-bounty`: End program and withdraw remaining funds

### Reputation

- `register-researcher`: Create profile
- `update-reputation-on-acceptance`: Boost score
- `calculate-success-rate`: Get researcher metrics

## Roadmap

- IPFS integration for report storage
- Multi-signature approval workflow
- Automated vulnerability scanning
- Cross-chain bridge support
- Mobile application

## Contributing

Contributions welcome. Please open issues or submit pull requests.

## License

MIT License - see LICENSE file

## Contact

Built with Stacks - Secured by Bitcoin

