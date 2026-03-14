import { useState } from 'react';

// ─── FILE: client/components/actions/SweepSpamButton.tsx ─────────────
// Sweeps all spam + zero-value tokens in one batch

interface SweepSpamButtonProps {
  spamCount?: number;
  onSuccess?: (sweptCount: number) => void;
}

export default function SweepSpamButton({ spamCount = 23, onSuccess }: SweepSpamButtonProps) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  const handleSweep = async () => {
    if (state !== 'idle') return;
    setState('loading');

    try {
      // Plug in real sweep logic here
      // await sweepAllSpam();
      await new Promise(r => setTimeout(r, 2000));
      setState('done');
      onSuccess?.(spamCount);
      setTimeout(() => setState('idle'), 3500);
    } catch {
      setState('error');
      setTimeout(() => setState('idle'), 2500);
    }
  };

  const isLoading = state === 'loading';
  const isDone    = state === 'done';
  const isError   = state === 'error';

  return (
    <button
      className={`ssb-btn ${state}`}
      onClick={handleSweep}
      disabled={isLoading}
    >
      {isLoading ? (
        <>
          <div className="ssb-ring" />
          Sweeping {spamCount} tokens…
        </>
      ) : isDone ? (
        <>✓ Swept Clean!</>
      ) : isError ? (
        <>✕ Failed — retry</>
      ) : (
        <>
          <span className="ssb-icon">⬡</span>
          Sweep All Spam ({spamCount})
        </>
      )}

      <style>{`
        .ssb-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-sm);
          width: 100%;
          padding: 13px 20px;
          border-radius: var(--radius-pill);
          border: 1px solid var(--border);
          background: transparent;
          color: var(--text-secondary);
          font-family: var(--font-body);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-base);
        }

        .ssb-btn:hover:not(:disabled) {
          border-color: var(--accent);
          color: var(--accent);
          background: var(--accent-dim);
        }

        .ssb-btn:disabled { opacity: 0.35; cursor: not-allowed; }
        .ssb-btn:active:not(:disabled) { transform: scale(0.98); }

        .ssb-btn.done  { color: var(--green); border-color: rgba(0,232,122,0.3); background: var(--green-dim); }
        .ssb-btn.error { color: var(--amber); border-color: rgba(255,181,71,0.3); }

        .ssb-ring {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255,255,255,0.1);
          border-top-color: var(--accent);
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          flex-shrink: 0;
        }

        .ssb-icon { font-size: 16px; }
      `}</style>
    </button>
  );
}
