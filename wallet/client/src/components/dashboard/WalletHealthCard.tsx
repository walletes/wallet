// ─── WALLET HEALTH CARD (Zerion DNA) ─────────────────────────────────
export default function WalletHealthCard({ score = 94, items = MOCK_ITEMS }) {
  const color = score >= 80 ? 'var(--green)' : score >= 60 ? 'var(--amber)' : 'var(--red)';

  return (
    <div className="whc-card card animate-slide-up stagger-2">
      <div className="whc-header">
        <span className="label-eyebrow">Wallet Health</span>
        <div className="whc-score-badge" style={{ color, background: `${color}18` }}>
          {score}
        </div>
      </div>

      {/* Ring indicator */}
      <div className="whc-ring-wrapper">
        <svg className="whc-ring" viewBox="0 0 120 120" width="120" height="120">
          {/* Background track */}
          <circle
            cx="60" cy="60" r="50"
            fill="none"
            stroke="var(--bg-elevated)"
            strokeWidth="8"
          />
          {/* Score arc */}
          <circle
            cx="60" cy="60" r="50"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${(score / 100) * 314.16} 314.16`}
            transform="rotate(-90 60 60)"
            style={{ transition: 'stroke-dasharray 1s cubic-bezier(0.34,1.1,0.64,1)' }}
          />
        </svg>
        <div className="whc-ring-label">
          <span className="whc-ring-score mono-value" style={{ color }}>{score}</span>
          <span className="whc-ring-max">/100</span>
        </div>
      </div>

      {/* Breakdown bars */}
      <div className="whc-breakdown">
        {items.map(item => (
          <div key={item.label} className="whc-item">
            <div className="whc-item-header">
              <span className="whc-item-label">{item.label}</span>
              <span className="whc-item-score mono-value" style={{ color: item.color }}>
                {item.score}
              </span>
            </div>
            <div className="health-bar-track">
              <div
                className="health-bar-fill"
                style={{ width: `${item.score}%`, background: item.color }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const MOCK_ITEMS = [
  { label: 'Token Quality',  score: 96, color: 'var(--green)' },
  { label: 'Dust Level',     score: 88, color: 'var(--accent)' },
  { label: 'Gas Efficiency', score: 92, color: 'var(--accent)' },
  { label: 'Spam Index',     score: 99, color: 'var(--green)' },
];

/* ─── STYLES ────────────────────────────────────────────────────────── */
const styles = `
.whc-card {
  padding: var(--space-lg);
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.whc-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.whc-score-badge {
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: var(--radius-pill);
}

.whc-ring-wrapper {
  position: relative;
  width: 120px;
  height: 120px;
  margin: 0 auto;
}

.whc-ring { transform-origin: center; }

.whc-ring-label {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1px;
}

.whc-ring-score {
  font-size: 28px;
  font-weight: 700;
  line-height: 1;
}

.whc-ring-max {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-tertiary);
  align-self: flex-end;
  padding-bottom: 4px;
}

.whc-breakdown {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.whc-item { display: flex; flex-direction: column; gap: 6px; }

.whc-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.whc-item-label { font-size: 13px; color: var(--text-secondary); }

.whc-item-score { font-size: 12px; font-variant-numeric: tabular-nums; }
`;

if (typeof document !== 'undefined') {
  const id = 'whc-styles';
  if (!document.getElementById(id)) {
    const el = document.createElement('style');
    el.id = id; el.textContent = styles;
    document.head.appendChild(el);
  }
}
