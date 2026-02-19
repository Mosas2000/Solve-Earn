import type { VulnerabilityReport, StoredReport } from '@/types';
import { encryptPayload, decryptPayload } from './reportCrypto';

/**
 * Off-chain storage for vulnerability reports using localStorage.
 *
 * Security hardening:
 *   - Reports are AES-GCM encrypted before writing to localStorage.
 *     The researcher address acts as the passphrase for key derivation.
 *   - A cap of MAX_STORED_REPORTS prevents unbounded growth; the oldest
 *     entries are evicted automatically when the limit is reached.
 *   - Each entry carries a TTL; expired entries are pruned on read.
 *   - QuotaExceededError is caught and triggers a best-effort eviction
 *     before retrying the write.
 */

const STORAGE_KEY_PREFIX = 'vulnerability_report_';
const INDEX_KEY = 'vulnerability_report_index';
const MAX_STORED_REPORTS = 50;
const REPORT_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

// ---------------------------------------------------------------------------
// Internal index helpers
//
// An ordered list of report hashes is maintained in a separate key so we
// can enforce size limits and evict the oldest entries without scanning
// every key in localStorage.
// ---------------------------------------------------------------------------

interface ReportIndexEntry {
    hash: string;
    storedAt: number;
}

function readIndex(): ReportIndexEntry[] {
    try {
        const raw = localStorage.getItem(INDEX_KEY);
        return raw ? (JSON.parse(raw) as ReportIndexEntry[]) : [];
    } catch {
        return [];
    }
}

function writeIndex(entries: ReportIndexEntry[]): void {
    localStorage.setItem(INDEX_KEY, JSON.stringify(entries));
}

function pruneExpired(): void {
    const now = Date.now();
    const index = readIndex();
    const alive: ReportIndexEntry[] = [];

    for (const entry of index) {
        if (now - entry.storedAt > REPORT_TTL_MS) {
            localStorage.removeItem(STORAGE_KEY_PREFIX + entry.hash);
        } else {
            alive.push(entry);
        }
    }

    if (alive.length !== index.length) {
        writeIndex(alive);
    }
}

function evictOldest(count: number): void {
    const index = readIndex();
    const removed = index.splice(0, count);
    for (const entry of removed) {
        localStorage.removeItem(STORAGE_KEY_PREFIX + entry.hash);
    }
    writeIndex(index);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Store a vulnerability report off-chain.
 *
 * The report is encrypted using the researcher address before writing.
 * If LocalStorage is full a best-effort eviction is attempted.
 */
export async function storeReport(
    reportHash: string,
    report: VulnerabilityReport,
    researcher: string,
    bountyId: number
): Promise<boolean> {
    try {
        pruneExpired();

        // Enforce cap — evict oldest entries to make room
        const index = readIndex();
        if (index.length >= MAX_STORED_REPORTS) {
            evictOldest(index.length - MAX_STORED_REPORTS + 1);
        }

        const storedReport: StoredReport = {
            ...report,
            reportHash,
            researcher,
            bountyId,
            submittedAt: Date.now(),
            encrypted: true,
        };

        const plaintext = JSON.stringify(storedReport);
        const ciphertext = await encryptPayload(plaintext, researcher);

        const key = STORAGE_KEY_PREFIX + reportHash;
        try {
            localStorage.setItem(key, ciphertext);
        } catch (err: unknown) {
            if (isDOMException(err) && err.name === 'QuotaExceededError') {
                // Evict a batch and retry once
                evictOldest(5);
                localStorage.setItem(key, ciphertext);
            } else {
                throw err;
            }
        }

        // Update the index with the new entry
        const updated = readIndex();
        updated.push({ hash: reportHash, storedAt: Date.now() });
        writeIndex(updated);

        return true;
    } catch (error) {
        console.error('Failed to store report:', error);
        return false;
    }
}

function isDOMException(err: unknown): err is DOMException {
    return err instanceof DOMException;
}

/**
 * Retrieve and decrypt a vulnerability report from off-chain storage.
 *
 * @param reportHash - SHA-256 hash of the report (as hex string)
 * @param researcher - Researcher address used as decryption passphrase
 * @returns The stored report or null if not found / decryption fails
 */
export async function getReport(reportHash: string, researcher: string): Promise<StoredReport | null> {
    try {
        const key = STORAGE_KEY_PREFIX + reportHash;
        const data = localStorage.getItem(key);
        
        if (!data) {
            return null;
        }

        const plaintext = await decryptPayload(data, researcher);
        const report = JSON.parse(plaintext) as StoredReport;

        // Check TTL
        if (Date.now() - report.submittedAt > REPORT_TTL_MS) {
            localStorage.removeItem(key);
            return null;
        }

        return report;
    } catch (error) {
        console.error('Failed to retrieve report:', error);
        return null;
    }
}

/**
 * Delete a vulnerability report from off-chain storage.
 */
export function deleteReport(reportHash: string): boolean {
    try {
        const key = STORAGE_KEY_PREFIX + reportHash;
        localStorage.removeItem(key);

        // Remove from the index as well
        const index = readIndex().filter((e) => e.hash !== reportHash);
        writeIndex(index);

        return true;
    } catch (error) {
        console.error('Failed to delete report:', error);
        return false;
    }
}

/**
 * List all stored reports for a specific researcher.
 *
 * Because each report is encrypted with the researcher's address, only
 * reports belonging to the supplied researcher can be decrypted.
 */
export async function listReportsByResearcher(researcher: string): Promise<StoredReport[]> {
    try {
        pruneExpired();
        const index = readIndex();
        const reports: StoredReport[] = [];

        for (const entry of index) {
            const report = await getReport(entry.hash, researcher);
            if (report && report.researcher === researcher) {
                reports.push(report);
            }
        }

        return reports;
    } catch (error) {
        console.error('Failed to list reports:', error);
        return [];
    }
}

/**
 * List all stored reports for a specific bounty.
 *
 * Requires the researcher address for decryption.
 */
export async function listReportsByBounty(bountyId: number, researcher: string): Promise<StoredReport[]> {
    try {
        pruneExpired();
        const index = readIndex();
        const reports: StoredReport[] = [];

        for (const entry of index) {
            const report = await getReport(entry.hash, researcher);
            if (report && report.bountyId === bountyId) {
                reports.push(report);
            }
        }

        return reports;
    } catch (error) {
        console.error('Failed to list reports:', error);
        return [];
    }
}
