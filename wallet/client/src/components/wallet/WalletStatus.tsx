// ─── FILE: client/components/wallet/WalletStatus.tsx ─────────────────
// Connected/disconnected wallet status chip with health score badge

interface WalletStatusProps {
  address?: string;
  healthScore?: number;
  connected?: boolean;
  network?: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export default function WalletStatus({
  address,
  healthScore = 94,
  connected   = false,
  network     = 'Ethereum',
  onConnect,
  onDisconnect,
}: WalletStatusProps) {

  const scoreColor =
    healthScore >= 80 ? 'var(--green)' :
    healthScore >= 60 ? 'var(--amber)' :
                        'var(--red)';

  if (!connected) {
    return (
      <button className="ws-chip ws-disconnected" onClick={onConnect}>
        <span className="ws-dot-off" />
        <span className="ws-label">Connect Wallet</span>
        <style>{WS_STYLES}</style>
      </button>
    );
  }

  const shortAddr = address
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : '0x…';

  return (
    <div className="ws-chip ws-connected" onClick={onDisconnect} title="Click to disconnect">
      {/* Live pulse */}
      <div className="pulse-dot" />

      {/* Address */}
      <span className="ws-addr mono-address">{shortAddr}</span>

      {/* Network */}
      <span className="ws-network">{network}</span>

      {/* Health score */}
      <div className="ws-score" style={{ background: `${scoreColor}18`, color: scoreColor }}>
        {healthScore}
      </div>

      <style>{WS_STYLES}</style>
    </div>
  );
}

const WS_STYLES = `
  .ws-chip {
    display: inline-flex;
    align-items: center;
    gap: var(--space-sm);
    padding: 8px var(--space-md);
    border-radius: var(--radius-pill);
    border: 1px solid var(--border);
    font-family: var(--font-body);
    cursor: pointer;
    transition: all var(--transition-fast);
    user-select: none;
  }

  .ws-connected {
    background: var(--bg-card);
  }
  .ws-connected:hover { border-color: var(--border-hover); }

  .ws-disconnected {
    background: transparent;
    color: var(--text-secondary);
    font-size: 13px;
    font-weight: 500;
  }
  .ws-disconnected:hover { border-color: var(--border-hover); color: var(--text-primary); }

  .ws-dot-off {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--text-tertiary);
    flex-shrink: 0;
  }

  .ws-label { font-size: 13px; }

  .ws-addr { font-size: 12px; }

  .ws-network {
    font-size: 11px;
    color: var(--text-tertiary);
    padding: 2px 7px;
    border-radius: var(--radius-pill);
    background: var(--bg-elevated);
    border: 1px solid var(--border);
  }

  .ws-score {
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: var(--radius-pill);
    flex-shrink: 0;
  }
`;
