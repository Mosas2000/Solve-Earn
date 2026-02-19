import { useState, useEffect } from 'react';
import { transactionTracker } from '@/utils/transactionTracker';
import { openTxInExplorer } from '@/utils/explorerUtils';
import type { TransactionInfo } from '@/types';
import '@/styles/TransactionStatus.css';

export function TransactionStatusNotifications() {
    const [transactions, setTransactions] = useState<TransactionInfo[]>([]);
    const [dismissed, setDismissed] = useState<Set<string>>(new Set());

    useEffect(() => {
        // Subscribe to transaction updates
        const unsubscribe = transactionTracker.subscribe(() => {
            const allTx = transactionTracker.getHistory();
            setTransactions(allTx);
        });

        // Initialize with current transactions
        setTransactions(transactionTracker.getHistory());

        return unsubscribe;
    }, []);

    const handleDismiss = (txId: string) => {
        setDismissed(prev => new Set(prev).add(txId));
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'broadcasting':
            case 'confirming':
                return '⏳';
            case 'success':
                return '✅';
            case 'failed':
                return '❌';
            case 'cancelled':
                return '🚫';
            default:
                return '⏳';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'broadcasting':
            case 'confirming':
                return 'info';
            case 'success':
                return 'success';
            case 'failed':
                return 'error';
            case 'cancelled':
                return 'warning';
            default:
                return 'info';
        }
    };

    const getStatusText = (tx: TransactionInfo) => {
        switch (tx.status) {
            case 'broadcasting':
                return `Broadcasting ${tx.functionName}...`;
            case 'confirming':
                return `Confirming ${tx.functionName}...`;
            case 'success':
                return `${tx.functionName} successful!`;
            case 'failed':
                return `${tx.functionName} failed: ${tx.errorMessage || 'Unknown error'}`;
            case 'cancelled':
                return `${tx.functionName} cancelled`;
            default:
                return `${tx.functionName} pending...`;
        }
    };

    // Only show recent transactions (last 5) that haven't been dismissed
    const recentTx = transactions
        .filter(tx => !dismissed.has(tx.txId))
        .slice(0, 5);

    if (recentTx.length === 0) {
        return null;
    }

    return (
        <div className="transaction-notifications">
            {recentTx.map((tx) => (
                <div
                    key={tx.txId}
                    className={`transaction-notification ${getStatusColor(tx.status)}`}
                >
                    <span className="tx-icon">{getStatusIcon(tx.status)}</span>
                    <div className="tx-content">
                        <div className="tx-message">{getStatusText(tx)}</div>
                        <button
                            className="tx-link"
                            onClick={() => openTxInExplorer(tx.txId)}
                        >
                            View on Explorer →
                        </button>
                    </div>
                    {(tx.status === 'success' || tx.status === 'failed' || tx.status === 'cancelled') && (
                        <button
                            className="tx-dismiss"
                            onClick={() => handleDismiss(tx.txId)}
                            aria-label="Dismiss"
                        >
                            ×
                        </button>
                    )}
                </div>
            ))}
        </div>
    );
}
