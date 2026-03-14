import { useState } from 'react';

// ─── TOKEN LIST (Zerion DNA — icon · name · chain badge · balance · value) ──
export default function TokenList({ tokens = MOCK_TOKENS }) {
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('value');

  const filtered = tokens
    .filter(t => filter === 'all' ? true : filter === 'spam' ? t.isSpam : !t.isSpam)
    .sort((a, b) => {
      if (sortBy === 'value') return b.usdValue - a.usdValue;
      if (sortBy === 'name') return a.symbol.localeCompare(b.symbol);
      return 0;
    });

  return (
    <div className="tl-container card">
      {/* Header */}
      <div className="tl-header">
        <span className="label-eyebrow">Tokens · {tokens.length}</span>

        <div className="tl-controls">
          {/* Filter */}
          <div className="tl-tabs">
            {[
              { id: 'all', label: 'All' },
              { id: 'clean', label: 'Clean' },
              { id: 'spam', label: 'Spam' },
            ].map(tab => (
              <button
                key={tab.id}
                className={`tl-tab ${filter === tab.id ? 'active' : ''}`}
                onClick={() => setFilter(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Sort */}
          <select
            className="tl-sort"
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
          >
            <option value="value">By Value</option>
            <option value="name">By Name</option>
          </select>
        </div>
      </div>

      {/* Column labels */}
      <div className="tl-col-labels">
        <span>Token</span>
        <span>Balance</span>
        <span>Value</span>
        <span>24h</span>
      </div>

      <div className="divider" />

      {/* Rows */}
      <div className="tl-list">
        {filtered.map((token, i) => (
          <div
            key={token.id}
            className={`token-row tl-row ${token.isSpam ? 'spam' : ''} animate-slide-up stagger-${Math.min(i + 1, 8)}`}
          >
            {/* Icon + name + chain */}
            <div className="tl-token-info">
              <div className="token-icon">
                {token.logo ? (
                  <img src={token.logo} alt={token.symbol} width="28" height="28" style={{ borderRadius: '50%' }} />
                ) : (
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)' }}>
                    {token.symbol[0]}
                  </span>
                )}
                {token.isSpam && (
                  <div className="spam-badge-overlay" title="Spam token">!</div>
                )}
              </div>

              <div className="token-info">
                <div className="token-name">{token.name}</div>
                <div className="token-meta">
                  <span className={`chain-badge chain-${token.chain}`}>
                    <span className="chain-dot" />
                    {token.chainLabel}
                  </span>

                  {token.isSpam && (
                    <span className="spam-label">spam</span>
                  )}
                </div>
              </div>
            </div>

            {/* Balance */}
            <div className="tl-balance">
              <div className="token-usd">
                {token.balance} <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>{token.symbol}</span>
              </div>
            </div>

            {/* USD Value */}
            <div className="token-values">
              <div className="token-usd">
                ${token.usdValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            {/* 24h Change */}
            <div className={`tl-change ${token.change24h >= 0 ? 'pnl-positive' : 'pnl-negative'}`}>
              <span className={`pnl-badge ${token.change24h >= 0 ? 'positive' : 'negative'}`}>
                {token.change24h >= 0 ? '+' : ''}{token.change24h}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── MOCK DATA ────────────────────────────────────────────────────────
const MOCK_TOKENS = [
  { id: '1', symbol: 'ETH', name: 'Ethereum', chain: 'eth', chainLabel: 'Ethereum', usdValue: 32410.20, balance: '12.4', change24h: 2.1, isSpam: false },
  { id: '2', symbol: 'USDC', name: 'USD Coin', chain: 'base', chainLabel: 'Base', usdValue: 8200.00, balance: '8,200', change24h: 0.0, isSpam: false },
  { id: '3', symbol: 'ARB', name: 'Arbitrum', chain: 'arbitrum', chainLabel: 'Arbitrum', usdValue: 4102.50, balance: '4,250', change24h: -1.4, isSpam: false },
  { id: '4', symbol: 'MATIC', name: 'Polygon', chain: 'polygon', chainLabel: 'Polygon', usdValue: 2140.80, balance: '3,200', change24h: 0.8, isSpam: false },
  { id: '5', symbol: 'OP', name: 'Optimism', chain: 'optimism', chainLabel: 'Optimism', usdValue: 820.10, balance: '620', change24h: 3.2, isSpam: false },
  { id: '6', symbol: 'XSPAM', name: 'FreeTokenXYZ', chain: 'eth', chainLabel: 'Ethereum', usdValue: 0.00, balance: '100,000', change24h: 0.0, isSpam: true },
  { id: '7', symbol: 'GIFT', name: 'GiftDrop', chain: 'base', chainLabel: 'Base', usdValue: 0.00, balance: '50,000', change24h: 0.0, isSpam: true },
];

/* ─── STYLES ────────────────────────────────────────────────────────── */
const styles = `
.tl-container { overflow: hidden; }

.tl-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-lg) var(--space-lg) var(--space-md);
  flex-wrap: wrap;
  gap: var(--space-sm);
}

.tl-controls {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.tl-tabs {
  display: flex;
  background: var(--bg-elevated);
  border-radius: var(--radius-pill);
  padding: 3px;
  gap: 2px;
}

.tl-tab {
  padding: 5px 14px;
  border-radius: var(--radius-pill);
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
  font-family: var(--font-body);
}

.tl-tab.active {
  background: var(--bg-card);
  color: var(--text-primary);
  box-shadow: 0 1px 4px rgba(0,0,0,0.3);
}

.tl-sort {
  appearance: none;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-pill);
  color: var(--text-secondary);
  font-size: 12px;
  font-family: var(--font-body);
  padding: 6px 12px;
  cursor: pointer;
}

.tl-col-labels {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 80px;
  padding: 8px var(--space-lg);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}

.tl-list { display: flex; flex-direction: column; }

.tl-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 80px;
  padding: 12px var(--space-lg);
}

.tl-row.spam { opacity: 0.6; }
.tl-row.spam:hover { opacity: 1; }

.tl-token-info {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.tl-balance,
.tl-change {
  display: flex;
  align-items: center;
  font-family: var(--font-mono);
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}

.tl-change { justify-content: flex-end; }

.tl-change .pnl-badge {
  font-size: 12px;
  padding: 2px 7px;
  border-radius: var(--radius-pill);
}

.spam-badge-overlay {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--red);
  color: #fff;
  font-size: 9px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--bg-card);
}

.token-icon { position: relative; }

.spam-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 1px 5px;
  border-radius: 3px;
  background: var(--red-dim);
  color: var(--red);
}

@media (max-width: 600px) {
  .tl-col-labels { grid-template-columns: 2fr 1fr 70px; }
  .tl-col-labels span:nth-child(2) { display: none; }
  .tl-row { grid-template-columns: 2fr 1fr 70px; }
  .tl-balance { display: none; }
}
`;

if (typeof document !== 'undefined') {
  const id = 'tl-styles';
  if (!document.getElementById(id)) {
    const el = document.createElement('style');
    el.id = id;
    el.textContent = styles;
    document.head.appendChild(el);
  }
}
