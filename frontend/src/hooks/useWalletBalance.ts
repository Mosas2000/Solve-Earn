import { useState, useEffect } from 'react';
import { useStacks } from './useStacks';

interface WalletBalance {
  stx: string;
  loading: boolean;
  error: string | null;
}

export const useWalletBalance = (): WalletBalance => {
  const { address, network } = useStacks();
  const [balance, setBalance] = useState<string>('0');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBalance = async () => {
      if (!address) {
        setBalance('0');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const apiUrl = network.isMainnet() 
          ? 'https://api.mainnet.hiro.so'
          : 'https://api.testnet.hiro.so';
        
        const response = await fetch(`${apiUrl}/extended/v1/address/${address}/balances`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch balance');
        }

        const data = await response.json();
        const stxBalance = (parseInt(data.stx.balance) / 1000000).toFixed(2);
        setBalance(stxBalance);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setBalance('0');
      } finally {
        setLoading(false);
      }
    };

    fetchBalance();
    
    // Refresh balance every 30 seconds
    const interval = setInterval(fetchBalance, 30000);
    
    return () => clearInterval(interval);
  }, [address, network]);

  return { stx: balance, loading, error };
};
