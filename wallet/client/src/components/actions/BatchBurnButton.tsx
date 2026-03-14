import { useState } from 'react';

// ─── FILE: client/components/actions/BatchBurnButton.tsx ─────────────
// Batch burn multiple spam tokens in a single transaction

interface BatchBurnButtonProps {
  selectedIds?: string[];
  count?: number;
  disabled?: boolean;
  onSuccess?: (burnedCount: number) => void;
}

export default function BatchBurnButton({
  selectedIds = [],
  count = 0,
  disabled = false,
  onSuccess,
}: BatchBurnButtonProps) {
  const [state, setState]    = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [progress, setProgress] = useState(0);

  const total = count || selectedIds.length;

  const handleBatch = async () => {
    if (state !== 'idle' || disabled || total === 0) return;
    setState('loading');
    setProgress(0);

    try {
      // Plug in real batch burn logic here
      // await batchBurnTokens(selectedIds);
      // Simulate progress
      for (let i = 1; i <= total; i++) {
        await new Promise(r => setTimeout(r, 300));
        setProgress(Math.round((i / total) * 100));
      }
      setState('done');
      onSuccess?.(total);
      setTimeout(() => { setState('idle'); setProgress(0); }, 3500);
    } catch {
      setState('error');
      setTimeout(() => { setState('idle'); setProgress(0); }, 2500);
    }
  };

  const isLoading = state === 'loading';
  const isDone    = state === 'done';
  const isError   = state === 'error';

  return (
    <div className="bbb-wrapper">
      <button
        className={`bbb-btn ${state}`}
        onClick={handleBatch}
        disabled={disabled || isLoading || total === 0}
      >
        {/* Progress bar overlay */}
        {isLoading && (
          <div
            className="bbb-progress"
            style={{ width: `${progress}%` }}
          />
        )}

        <span className="bbb-content">
          {isLoading ? (
            <>
              <div className="bbb-ring" />
              Burning {total} tokens… {progress}%
            </>
          ) : isDone ? (
            <>✓ Batch Burned {total} tokens!</>
          ) : isError ? (
            <>✕ Failed — retry</>
          ) : (
            <>
              🔥 Batch Burn{total > 0 ? ` (${total})` : ' Spam'}
            </>
          )}
        </span>
      </button>

      <style>{`
        .bbb-wrapper { width: 100%; }

        .bbb-btn {
          position: relative;
          width: 100%;
          padding: 13px 20px;
          border-radius: var(--radius-pill);
          border: 1px solid rgba(255, 77, 106, 0.25);
          background: var(--red-dim);
          color: var(--red);
          font-family: var(--font-body);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          overflow: hidden;
          transition: all var(--transition-base);
        }

        .bbb-btn:hover:not(:disabled) {
          background: rgba(255, 77, 106, 0.2);
          box-shadow: 0 0 24px rgba(255, 77, 106, 0.2);
        }

        .bbb-btn:disabled { opacity: 0.35; cursor: not-allowed; }
        .bbb-btn:active:not(:disabled) { transform: scale(0.98); }

        .bbb-btn.done  { background: var(--green-dim); color: var(--green); border-color: rgba(0,232,122,0.25); }
        .bbb-btn.error { background: rgba(255,181,71,0.1); color: var(--amber); border-color: rgba(255,181,71,0.25); }

        .bbb-progress {
          position: absolute;
          left: 0; top: 0; bottom: 0;
          background: rgba(255, 77, 106, 0.15);
          transition: width 0.3s ease;
          pointer-events: none;
        }

        .bbb-content {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-sm);
        }

        .bbb-ring {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255,77,106,0.3);
          border-top-color: var(--red);
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          flex-shrink: 0;
        }
      `}</style>
    </div>
  );
}
