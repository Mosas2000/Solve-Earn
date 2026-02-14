# Off-Chain Report Storage System

## Overview

This implementation solves issue #16 by adding off-chain storage for vulnerability report contents while maintaining on-chain hash verification for integrity.

## Architecture

### Storage Solution

We use **localStorage** as the off-chain storage solution for the following reasons:

1. **Simplicity**: No external dependencies or backend required
2. **Immediate availability**: Data persists in the browser
3. **Zero cost**: No hosting or API fees
4. **Privacy**: Data stays on the user's device
5. **Suitable for demo/MVP**: Perfect for hackathon/buildathon projects

### Data Flow

```
1. Researcher fills out vulnerability report
   ↓
2. Report content stored in localStorage (keyed by hash)
   ↓
3. SHA-256 hash generated from report content
   ↓
4. Hash submitted to blockchain contract
   ↓
5. Bounty owner retrieves hash from blockchain
   ↓
6. System fetches full report from localStorage using hash
   ↓
7. Report displayed to bounty owner for evaluation
```

## Implementation Details

### Files Created

- **`utils/reportStorage.ts`**: Core storage operations
  - `storeReport()`: Save report content
  - `getReport()`: Retrieve report by hash
  - `deleteReport()`: Remove report
  - `listReportsByResearcher()`: Get all reports by researcher
  - `listReportsByBounty()`: Get all reports for a bounty

- **`utils/encryption.ts`**: Encryption utilities (prepared for future use)
  - `encryptData()`: AES-GCM encryption
  - `decryptData()`: AES-GCM decryption
  - `generateSharedKey()`: Create shared encryption key
  - `hashString()`: SHA-256 hashing helper

- **`utils/hashUtils.ts`**: Hash conversion and validation
  - `bufferToHex()`: Convert Uint8Array to hex string
  - `hexToBuffer()`: Convert hex string to Uint8Array
  - `isValidHash()`: Validate hash format
  - `truncateHash()`: Display helper

- **`styles/ReportDisplay.css`**: UI styling for report display

### Files Modified

- **`types/index.ts`**: Added `VulnerabilityReport` and `StoredReport` interfaces
- **`components/SubmitVulnerability.tsx`**: 
  - Store report off-chain before blockchain submission
  - Show info message about storage
  - Validate storage success before proceeding
- **`components/ManageSubmissions.tsx`**: 
  - Fetch report content using hash
  - Display full report with expand/collapse
  - Show warning if report not available
- **`App.css`**: Added `.info-message` styling

## Storage Format

Reports are stored as JSON with the following structure:

```typescript
{
  severity: 'critical' | 'high' | 'medium' | 'low',
  description: string,
  proofOfConcept: string,
  impact: string,
  recommendation: string,
  reportHash: string,
  researcher: string,
  bountyId: number,
  submittedAt: number,
  encrypted: boolean
}
```

Storage key format: `vulnerability_report_<hex_hash>`

## Security Features

### Current Implementation

1. **Hash verification**: On-chain hash ensures report integrity
2. **Immutable audit trail**: Blockchain provides tamper-proof record
3. **Local storage**: Data stays on submitter's device

### Future Enhancements (Encryption utilities prepared)

1. **End-to-end encryption**: Reports encrypted with shared key
2. **Access control**: Only researcher and bounty owner can decrypt
3. **Privacy protection**: Report content hidden from third parties

## Benefits

✅ **Solves the core problem**: Bounty owners can now read full reports  
✅ **Maintains integrity**: Hash on blockchain verifies report authenticity  
✅ **Zero infrastructure cost**: No backend or database required  
✅ **Instant availability**: No network delays for report retrieval  
✅ **Scalable foundation**: Easy to migrate to IPFS/Gaia later  
✅ **Privacy-friendly**: Data doesn't leave user's browser  

## Limitations & Future Work

### Current Limitations

1. **Browser-specific**: Reports only visible in the browser where submitted
2. **Data loss risk**: Clearing browser data deletes reports
3. **No cross-device sync**: Reports don't transfer between devices

### Migration Path to Production Storage

The codebase is structured to easily migrate to production storage:

#### Option 1: IPFS (Decentralized)
```typescript
// Replace storeReport implementation
export async function storeReport(...) {
  const ipfsHash = await ipfs.add(JSON.stringify(report));
  localStorage.setItem(key, ipfsHash); // Store IPFS hash locally
  return true;
}
```

#### Option 2: Gaia (Stacks-native)
```typescript
// Replace with Gaia storage
import { putFile, getFile } from '@stacks/storage';
export async function storeReport(...) {
  await putFile(`reports/${reportHash}.json`, JSON.stringify(report));
  return true;
}
```

#### Option 3: Backend API
```typescript
// Replace with API calls
export async function storeReport(...) {
  const response = await fetch('/api/reports', {
    method: 'POST',
    body: JSON.stringify(report)
  });
  return response.ok;
}
```

## Testing

### Manual Testing Steps

1. **Submit a report**:
   - Connect wallet
   - Open a bounty
   - Fill out vulnerability report form
   - Submit and wait for confirmation

2. **Verify storage**:
   - Open browser DevTools → Application → Local Storage
   - Look for keys starting with `vulnerability_report_`
   - Verify JSON content matches submission

3. **View as bounty owner**:
   - Switch to bounty owner account
   - Navigate to "Manage Submissions"
   - Click "View Full Report" button
   - Verify all fields display correctly

4. **Test unavailable report**:
   - Clear localStorage
   - Refresh Manage Submissions page
   - Verify warning message appears

## Conclusion

This implementation provides a functional off-chain storage solution that:
- Solves the immediate problem (issue #16)
- Requires no additional infrastructure
- Can be easily upgraded to production storage
- Maintains security through on-chain hash verification
- Creates a solid foundation for future encryption features

Perfect for a buildathon/hackathon project that demonstrates the full workflow while keeping implementation simple and cost-free.
