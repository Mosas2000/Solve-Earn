import React from 'react';
import { useWalletBalance } from '../hooks/useWalletBalance';
import { LoadingSpinner } from './LoadingSpinner';
import '../styles/WalletBalance.css';

export const WalletBalance: React.FC = () => {
  const { stx, loading, error } = useWalletBalance();

  if (loading) {
    return (
      <div className="wallet-balance-container">
        <LoadingSpinner size="small" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="wallet-balance-container error">
        <span className="balance-label">Balance:</span>
        <span className="balance-error">Error</span>
      </div>
    );
  }

  return (
    <div className="wallet-balance-container">
      <span className="balance-label">Balance:</span>
      <span className="balance-amount">{stx} STX</span>
    </div>
  );
};
