import type { VulnerabilityReport, StoredReport } from '../types';

/**
 * Off-chain storage for vulnerability reports using localStorage.
 * Reports are keyed by their SHA-256 hash for integrity verification.
 */

const STORAGE_KEY_PREFIX = 'vulnerability_report_';

/**
 * Store a vulnerability report off-chain
 * @param reportHash - SHA-256 hash of the report (as hex string)
 * @param report - The full vulnerability report
 * @param researcher - Address of the researcher who submitted the report
 * @param bountyId - ID of the bounty this report is for
 * @returns true if storage succeeded, false otherwise
 */
export function storeReport(
    reportHash: string,
    report: VulnerabilityReport,
    researcher: string,
    bountyId: number
): boolean {
    try {
        const storedReport: StoredReport = {
            ...report,
            reportHash,
            researcher,
            bountyId,
            submittedAt: Date.now(),
            encrypted: false,
        };

        const key = STORAGE_KEY_PREFIX + reportHash;
        localStorage.setItem(key, JSON.stringify(storedReport));
        
        console.log(`Stored report with hash ${reportHash}`);
        return true;
    } catch (error) {
        console.error('Failed to store report:', error);
        return false;
    }
}

/**
 * Retrieve a vulnerability report from off-chain storage
 * @param reportHash - SHA-256 hash of the report (as hex string)
 * @returns The stored report or null if not found
 */
export function getReport(reportHash: string): StoredReport | null {
    try {
        const key = STORAGE_KEY_PREFIX + reportHash;
        const data = localStorage.getItem(key);
        
        if (!data) {
            console.warn(`No report found for hash ${reportHash}`);
            return null;
        }

        const report = JSON.parse(data) as StoredReport;
        return report;
    } catch (error) {
        console.error('Failed to retrieve report:', error);
        return null;
    }
}

/**
 * Delete a vulnerability report from off-chain storage
 * @param reportHash - SHA-256 hash of the report (as hex string)
 * @returns true if deletion succeeded, false otherwise
 */
export function deleteReport(reportHash: string): boolean {
    try {
        const key = STORAGE_KEY_PREFIX + reportHash;
        localStorage.removeItem(key);
        console.log(`Deleted report with hash ${reportHash}`);
        return true;
    } catch (error) {
        console.error('Failed to delete report:', error);
        return false;
    }
}

/**
 * List all stored reports for a specific researcher
 * @param researcher - Address of the researcher
 * @returns Array of stored reports
 */
export function listReportsByResearcher(researcher: string): StoredReport[] {
    try {
        const reports: StoredReport[] = [];
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(STORAGE_KEY_PREFIX)) {
                const data = localStorage.getItem(key);
                if (data) {
                    const report = JSON.parse(data) as StoredReport;
                    if (report.researcher === researcher) {
                        reports.push(report);
                    }
                }
            }
        }
        
        return reports;
    } catch (error) {
        console.error('Failed to list reports:', error);
        return [];
    }
}

/**
 * List all stored reports for a specific bounty
 * @param bountyId - ID of the bounty
 * @returns Array of stored reports
 */
export function listReportsByBounty(bountyId: number): StoredReport[] {
    try {
        const reports: StoredReport[] = [];
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(STORAGE_KEY_PREFIX)) {
                const data = localStorage.getItem(key);
                if (data) {
                    const report = JSON.parse(data) as StoredReport;
                    if (report.bountyId === bountyId) {
                        reports.push(report);
                    }
                }
            }
        }
        
        return reports;
    } catch (error) {
        console.error('Failed to list reports:', error);
        return [];
    }
}
