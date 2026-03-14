// ─── FILE: client/components/dashboard/CleanPointsCard.tsx ───────────
// Gamification card — clean points, level, and available earn actions

interface CleanPointsCardProps {
  points?: number;
  level?: string;
  nextLevel?: number;
  nextTier?: string;
}

export default function CleanPointsCard({
  points    = 2480,
  level     = 'Diamond',
  nextLevel = 3000,
  nextTier  = 'Master',
}: CleanPointsCardProps) {

  const pct = Math.min(100, Math.round((points / nextLevel) * 100));

  const LEVEL_COLOR =
    level === 'Master'  ? 'var(--accent)' :
    level === 'Diamond' ? 'var(--accent)' :
    level === 'Gold'    ? 'var(--amber)'  :
                         'var(--text-secondary)';

  return (
    <div className="cp-card card animate-slide-up stagger-4">
      {/* Header */}
      <div className="cp-header">
        <span className="label-eyebrow">Clean Points</span>
        <span className="cp-level-badge" style={{
          background: `${LEVEL_COLOR}18`,
          color: LEVEL_COLOR,
          border: `1px solid ${LEVEL_COLOR}30`,
        }}>
          {level}
        </span>
      </div>

      {/* Value */}
      <div className="cp-value-row">
        <span className="cp-value mono-value">{points.toLocaleString()}</span>
        <span className="cp-pts">pts</span>
      </div>

      {/* Progress to next tier */}
      <div className="cp-progress-block">
        <div className="cp-progress-labels">
          <span className="cp-progress-current">{points.toLocaleString()} / {nextLevel.toLocaleString()}</span>
          <span className="cp-progress-next">Next: {nextTier}</span>
        </div>
        <div className="health-bar-track" style={{ height: 5, marginTop: 6 }}>
          <div className="health-bar-fill" style={{ width: `${pct}%`, background: LEVEL_COLOR }} />
        </div>
      </div>

      {/* Earn actions grid */}
      <div className="cp-divider" />
      <div className="cp-earn-grid">
        {EARN_ACTIONS.map(action => (
          <div key={action.id} className="cp-earn-item">
            <span className="cp-earn-emoji">{action.icon}</span>
            <span className="cp-earn-label">{action.label}</span>
            <span className="cp-earn-pts mono-value pnl-positive">+{action.pts}</span>
          </div>
        ))}
      </div>

      <style>{`
        .cp-card {
          padding: var(--space-lg);
          display: flex;
          flex-direction: column;
          gap: var(--space-md);
        }

        .cp-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .cp-level-badge {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 3px 10px;
          border-radius: var(--radius-pill);
        }

        .cp-value-row {
          display: flex;
          align-items: baseline;
          gap: 4px;
        }

        .cp-value {
          font-size: 32px;
          line-height: 1;
        }

        .cp-pts {
          font-size: 14px;
          color: var(--text-secondary);
        }

        .cp-progress-block { display: flex; flex-direction: column; }

        .cp-progress-labels {
          display: flex;
          justify-content: space-between;
        }

        .cp-progress-current,
        .cp-progress-next {
          font-size: 11px;
          color: var(--text-tertiary);
        }

        .cp-divider {
          width: 100%;
          height: 1px;
          background: var(--border);
        }

        .cp-earn-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-sm);
        }

        .cp-earn-item {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 7px var(--space-sm);
          border-radius: var(--radius-sm);
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          transition: border-color var(--transition-fast);
        }

        .cp-earn-item:hover { border-color: var(--border-hover); }

        .cp-earn-emoji { font-size: 14px; flex-shrink: 0; }
        .cp-earn-label { font-size: 11px; color: var(--text-secondary); flex: 1; }
        .cp-earn-pts   { font-size: 11px; flex-shrink: 0; }
      `}</style>
    </div>
  );
}

const EARN_ACTIONS = [
  { id: '1', icon: '🔥', label: 'Burn spam',    pts: 50  },
  { id: '2', icon: '♻️', label: 'Recover dust', pts: 25  },
  { id: '3', icon: '⚡', label: 'Auto sweep',   pts: 10  },
  { id: '4', icon: '🎯', label: 'Daily clean',  pts: 100 },
];
