import { useState } from 'react';

// ─── FILE: client/components/wallet/WalletAddress.tsx ────────────────
// Displays a wallet address with copy-to-clipboard, truncation options

interface WalletAddressProps {
  address: string;
  showFull?: boolean;
  prefixLength?: number;
  suffixLength?: number;
  className?: string;
  onClick?: () => void;
}

export default function WalletAddress({
  address,
  showFull     = false,
  prefixLength = 8,
  suffixLength = 6,
  className    = '',
  onClick,
}: WalletAddressProps) {
  const [copied, setCopied] = useState(false);

  if (!address) return null;

  const display = showFull
    ? address
    : `${address.slice(0, prefixLength)}…${address.slice(-suffixLength)}`;

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available
    }
  };

  return (
    <button
      className={`wa-chip ${copied ? 'wa-copied' : ''} ${className}`}
      onClick={onClick ?? handleCopy}
      title={copied ? 'Copied!' : `Copy: ${address}`}
    >
      <span className="mono-address wa-text">{display}</span>
      <span className="wa-copy-icon" onClick={handleCopy} title="Copy address">
        {copied ? '✓' : '⎘'}
      </span>

      <style>{`
        .wa-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          border-radius: var(--radius-pill);
          cursor: pointer;
          transition: all var(--transition-fast);
          font-family: var(--font-body);
          max-width: 100%;
        }

        .wa-chip:hover { border-color: var(--border-hover); }

        .wa-chip.wa-copied {
          border-color: rgba(0,232,122,0.3);
          background: var(--green-dim);
        }
        .wa-chip.wa-copied .wa-text  { color: var(--green); }
        .wa-chip.wa-copied .wa-copy-icon { color: var(--green); }

        .wa-text {
          font-size: 12px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: var(--text-secondary);
          transition: color var(--transition-fast);
        }

        .wa-copy-icon {
          font-size: 12px;
          color: var(--text-tertiary);
          flex-shrink: 0;
          transition: color var(--transition-fast);
          padding: 2px;
          border-radius: 3px;
        }
        .wa-copy-icon:hover { color: var(--text-secondary); }
      `}</style>
    </button>
  );
}
