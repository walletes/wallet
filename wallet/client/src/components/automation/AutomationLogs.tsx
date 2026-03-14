import { useState, useEffect, useRef } from 'react';

// ─── FILE: client/components/automation/AutomationLogs.tsx ───────────
// Live automation activity log with auto-scroll and type badges

interface LogEntry {
  id:    number;
  time:  string;
  type:  'recover' | 'burn' | 'sweep' | 'flag' | 'score';
  label: string;
  msg:   string;
  value?: string;
}

const INITIAL_LOGS: LogEntry[] = [
  { id: 1, time: '14:24:01', type: 'recover', label: 'RECOVERED', msg: 'ETH dust on Ethereum', value: '+$320.40' },
  { id: 2, time: '14:23:47', type: 'burn',    label: 'BURNED',    msg: '3 spam tokens on Base', value: undefined },
  { id: 3, time: '14:22:03', type: 'sweep',   label: 'SWEPT',     msg: '7 zero-value tokens', value: undefined },
  { id: 4, time: '14:21:55', type: 'recover', label: 'RECOVERED', msg: 'MATIC dust on Polygon', value: '+$189.20' },
  { id: 5, time: '14:20:11', type: 'flag',    label: 'FLAGGED',   msg: 'Airdrop: GiftDrop (Base)', value: undefined },
  { id: 6, time: '14:19:40', type: 'burn',    label: 'BURNED',    msg: 'XSPAM token removed', value: undefined },
  { id: 7, time: '14:18:22', type: 'score',   label: 'SCORE',     msg: 'Health score: 94 (+2)', value: undefined },
  { id: 8, time: '14:17:09', type: 'recover', label: 'RECOVERED', msg: 'USDC dust on Base', value: '+$210.80' },
];

interface AutomationLogsProps {
  logs?: LogEntry[];
  live?: boolean;
}

export default function AutomationLogs({ logs = INITIAL_LOGS, live = true }: AutomationLogsProps) {
  const [entries, setEntries] = useState(logs);
  const bodyRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new entries
  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries]);

  // Placeholder for live stream integration
  // useEffect(() => { if (live) subscribe(setEntries); }, [live]);

  return (
    <div className="al-card card">
      {/* Header */}
      <div className="al-header">
        <span className="label-eyebrow">Live Activity Log</span>
        <div className="al-live-indicator">
          {live && <div className="pulse-dot" />}
          <span style={{ fontSize: 12, color: live ? 'var(--green)' : 'var(--text-tertiary)' }}>
            {live ? 'Live' : 'Paused'}
          </span>
        </div>
      </div>

      {/* Terminal */}
      <div className="al-terminal">
        <div className="al-terminal-bar">
          <div className="terminal-dot red"  />
          <div className="terminal-dot amber"/>
          <div className="terminal-dot green"/>
          <span className="mono-address" style={{ marginLeft: 'auto' }}>wip-automation v1.0</span>
        </div>

        <div className="al-body" ref={bodyRef}>
          {entries.map((log, i) => (
            <div
              key={log.id}
              className={`al-line animate-slide-right stagger-${Math.min(i + 1, 8)}`}
            >
              <span className="al-time">{log.time}</span>
              <span className={`al-badge al-badge--${log.type}`}>{log.label}</span>
              <span className="al-msg">{log.msg}</span>
              {log.value && (
                <span className={`al-value mono-value ${log.type === 'burn' ? 'pnl-negative' : 'pnl-positive'}`}>
                  {log.value}
                </span>
              )}
            </div>
          ))}
          <div className="al-cursor" />
        </div>
      </div>

      <style>{`
        .al-card { display: flex; flex-direction: column; overflow: hidden; min-height: 480px; }
        .al-header { display: flex; align-items: center; justify-content: space-between; padding: var(--space-lg); }
        .al-live-indicator { display: flex; align-items: center; gap: var(--space-sm); }

        .al-terminal { flex: 1; display: flex; flex-direction: column; border-top: 1px solid var(--border); background: rgba(0, 0, 0, 0.35); }
        .al-terminal-bar { display: flex; align-items: center; gap: var(--space-sm); padding: var(--space-md) var(--space-lg); border-bottom: 1px solid rgba(255,255,255,0.04); }

        .al-body { flex: 1; padding: var(--space-md) var(--space-lg); display: flex; flex-direction: column; gap: 3px; overflow-y: auto; max-height: 420px; scroll-behavior: smooth; }

        .al-line { display: grid; grid-template-columns: 72px 100px 1fr auto; align-items: center; gap: var(--space-sm); padding: 5px 0; border-bottom: 1px solid rgba(255,255,255,0.025); font-size: 13px; }
        .al-time { font-family: var(--font-mono); font-size: 11px; color: var(--text-tertiary); flex-shrink: 0; }
        .al-badge { padding: 2px 7px; border-radius: 4px; font-size: 10px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; font-family: var(--font-mono); flex-shrink: 0; }

        .al-badge--recover { background: var(--green-dim);  color: var(--green); }
        .al-badge--burn    { background: var(--red-dim);    color: var(--red); }
        .al-badge--sweep   { background: var(--accent-dim); color: var(--accent); }
        .al-badge--flag    { background: var(--amber-dim);  color: var(--amber); }
        .al-badge--score   { background: var(--accent-dim); color: var(--accent); }

        .al-msg { color: var(--text-secondary); font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .al-value { font-size: 12px; flex-shrink: 0; }

        .al-cursor { width: 8px; height: 14px; background: var(--accent); opacity: 0.7; animation: breathe 1.2s ease-in-out infinite; margin-top: var(--space-sm); }

        @media (max-width: 600px) {
          .al-line { grid-template-columns: 60px 80px 1fr; }
          .al-value { display: none; }
        }
      `}</style>
    </div>
  );
}
