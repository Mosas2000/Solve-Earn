/**
 * Transaction tracker for managing pending transactions and their status
 */

import type { TransactionInfo, PendingTransaction, TransactionStatus } from '../types';
import { checkTransactionStatus } from './stacksApi';
import { getExplorerTxUrl } from './explorerUtils';

class TransactionTracker {
    private pendingTransactions: Map<string, PendingTransaction> = new Map();
    private transactionHistory: TransactionInfo[] = [];
    private pollingInterval: NodeJS.Timeout | null = null;
    private listeners: Set<() => void> = new Set();

    /**
     * Start tracking a new transaction
     * @param txId - Transaction ID
     * @param functionName - Contract function name
     * @param onSuccess - Callback when transaction succeeds
     * @param onError - Callback when transaction fails
     */
    trackTransaction(
        txId: string,
        functionName: string,
        onSuccess?: () => void,
        onError?: (error: string) => void
    ): void {
        const pendingTx: PendingTransaction = {
            txId,
            functionName,
            startedAt: Date.now(),
            onSuccess,
            onError,
        };

        this.pendingTransactions.set(txId, pendingTx);

        // Add to history immediately as "broadcasting"
        const txInfo: TransactionInfo = {
            txId,
            status: 'broadcasting',
            functionName,
            timestamp: Date.now(),
            explorerUrl: getExplorerTxUrl(txId),
        };
        this.transactionHistory.unshift(txInfo);

        // Start polling if not already running
        if (!this.pollingInterval) {
            this.startPolling();
        }

        this.notifyListeners();
    }

    /**
     * Start polling for transaction status updates
     */
    private startPolling(): void {
        // Poll every 10 seconds
        this.pollingInterval = setInterval(() => {
            this.pollTransactions();
        }, 10000);
    }

    /**
     * Stop polling for transaction status
     */
    private stopPolling(): void {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
    }

    /**
     * Poll all pending transactions for status updates
     */
    private async pollTransactions(): Promise<void> {
        const pendingTxIds = Array.from(this.pendingTransactions.keys());

        if (pendingTxIds.length === 0) {
            this.stopPolling();
            return;
        }

        for (const txId of pendingTxIds) {
            const pendingTx = this.pendingTransactions.get(txId);
            if (!pendingTx) continue;

            try {
                const status = await checkTransactionStatus(txId);

                if (status) {
                    if (status.tx_status === 'success' && status.canonical) {
                        // Transaction succeeded
                        this.handleTransactionSuccess(txId, pendingTx);
                    } else if (status.tx_status === 'abort_by_response' || status.tx_status === 'abort_by_post_condition') {
                        // Transaction failed
                        const errorMsg = status.error || 'Transaction aborted';
                        this.handleTransactionError(txId, pendingTx, errorMsg);
                    } else {
                        // Still pending
                        this.updateTransactionStatus(txId, 'confirming');
                    }
                } else {
                    // Transaction not found yet, check if it's been too long
                    const elapsed = Date.now() - pendingTx.startedAt;
                    if (elapsed > 30 * 60 * 1000) { // 30 minutes timeout
                        this.handleTransactionError(txId, pendingTx, 'Transaction timeout - not found after 30 minutes');
                    }
                }
            } catch (error) {
                console.error(`Error polling transaction ${txId}:`, error);
            }
        }

        this.notifyListeners();
    }

    /**
     * Handle successful transaction
     */
    private handleTransactionSuccess(txId: string, pendingTx: PendingTransaction): void {
        this.updateTransactionStatus(txId, 'success');
        this.pendingTransactions.delete(txId);

        if (pendingTx.onSuccess) {
            pendingTx.onSuccess();
        }
    }

    /**
     * Handle failed transaction
     */
    private handleTransactionError(txId: string, pendingTx: PendingTransaction, errorMessage: string): void {
        this.updateTransactionStatus(txId, 'failed', errorMessage);
        this.pendingTransactions.delete(txId);

        if (pendingTx.onError) {
            pendingTx.onError(errorMessage);
        }
    }

    /**
     * Update transaction status in history
     */
    private updateTransactionStatus(txId: string, status: TransactionStatus, errorMessage?: string): void {
        const txInfo = this.transactionHistory.find(tx => tx.txId === txId);
        if (txInfo) {
            txInfo.status = status;
            if (errorMessage) {
                txInfo.errorMessage = errorMessage;
            }
        }
    }

    /**
     * Get all transactions in history
     */
    getHistory(): TransactionInfo[] {
        return [...this.transactionHistory];
    }

    /**
     * Get pending transactions
     */
    getPendingTransactions(): TransactionInfo[] {
        return this.transactionHistory.filter(tx => 
            tx.status === 'broadcasting' || tx.status === 'confirming'
        );
    }

    /**
     * Clear transaction history
     */
    clearHistory(): void {
        this.transactionHistory = [];
        this.notifyListeners();
    }

    /**
     * Subscribe to transaction updates
     */
    subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    /**
     * Notify all listeners of updates
     */
    private notifyListeners(): void {
        this.listeners.forEach(listener => listener());
    }
}

// Export singleton instance
export const transactionTracker = new TransactionTracker();
