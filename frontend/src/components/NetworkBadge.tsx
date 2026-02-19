import { NETWORK_MODE, getNetworkLabel } from '@/config/network';

const badgeColours: Record<string, string> = {
    mainnet: '#2ecc71',
    testnet: '#f39c12',
    devnet:  '#e74c3c',
};

export function NetworkBadge() {
    const label = getNetworkLabel();
    const colour = badgeColours[NETWORK_MODE] || '#95a5a6';

    // Only render the badge on non-mainnet networks to keep the
    // production UI clean while providing a clear visual warning
    // during development and testing.
    if (NETWORK_MODE === 'mainnet') return null;

    return (
        <span
            className="network-badge"
            style={{
                display: 'inline-block',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '0.7rem',
                fontWeight: 600,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                color: '#fff',
                backgroundColor: colour,
                marginLeft: '8px',
                verticalAlign: 'middle',
            }}
        >
            {label}
        </span>
    );
}
