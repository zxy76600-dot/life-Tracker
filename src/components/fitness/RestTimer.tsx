import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Plus, Clock, X } from 'lucide-react';

interface RestTimerProps {
  initialSeconds?: number;
  onClose?: () => void;
}

export function RestTimer({ initialSeconds = 90, onClose }: RestTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const timerRef = useRef<number | null>(null);

  // Play subtle web audio chime when reaching 0
  const playChime = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch {
      // Audio autoplay policy or not supported - safe ignore
    }
  };

  useEffect(() => {
    if (isRunning && secondsLeft > 0) {
      timerRef.current = window.setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            playChime();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, secondsLeft]);

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleSetTime = (secs: number) => {
    setSecondsLeft(secs);
    setIsRunning(true);
  };

  if (isMinimized) {
    return (
      <button
        type="button"
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-20 right-4 z-40 flex items-center gap-2 rounded-full border border-app-border bg-app-card px-3.5 py-2 shadow-card-hover text-app-ink hover:border-accent cursor-pointer"
      >
        <Clock size={16} className={isRunning ? 'text-accent animate-pulse' : 'text-app-subtle'} />
        <span className="font-bold tabular-nums text-sm">{formatTime(secondsLeft)}</span>
      </button>
    );
  }

  return (
    <div className="rounded-card border border-app-border bg-app-card/95 p-3.5 shadow-card backdrop-blur-md space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-app-ink">
          <Clock size={15} className="text-accent" />
          <span>Rest Timer</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setIsMinimized(true)}
            aria-label="Minimize timer"
            className="text-xs px-2 py-0.5 rounded text-app-subtle hover:bg-app-muted cursor-pointer"
          >
            Minimize
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close timer"
              className="p-1 rounded text-app-subtle hover:text-app-ink hover:bg-app-muted cursor-pointer"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Main Countdown Display */}
      <div className="flex items-center justify-between gap-3">
        <span className={`text-2xl font-extrabold tabular-nums tracking-tight ${secondsLeft === 0 ? 'text-cat-green-ink animate-bounce' : 'text-app-ink'}`}>
          {formatTime(secondsLeft)}
        </span>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsRunning(!isRunning)}
            className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors cursor-pointer ${
              isRunning
                ? 'bg-cat-amber/15 text-cat-amber-ink hover:bg-cat-amber/25'
                : 'bg-accent text-white shadow-accent hover:opacity-90'
            }`}
            aria-label={isRunning ? 'Pause timer' : 'Start timer'}
          >
            {isRunning ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
          </button>

          <button
            type="button"
            onClick={() => {
              setIsRunning(false);
              setSecondsLeft(initialSeconds);
            }}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-app-border text-app-subtle hover:bg-app-muted hover:text-app-ink cursor-pointer"
            aria-label="Reset timer"
          >
            <RotateCcw size={15} />
          </button>

          <button
            type="button"
            onClick={() => setSecondsLeft((prev) => prev + 30)}
            className="flex h-9 items-center gap-1 px-2.5 rounded-xl border border-app-border text-xs font-semibold text-app-subtle hover:bg-app-muted hover:text-app-ink cursor-pointer"
            aria-label="Add 30 seconds"
          >
            <Plus size={13} />
            30s
          </button>
        </div>
      </div>

      {/* Quick Interval Presets */}
      <div className="flex gap-1.5 pt-1 border-t border-app-border/40">
        {[45, 60, 90, 120, 180].map((secs) => (
          <button
            key={secs}
            type="button"
            onClick={() => handleSetTime(secs)}
            className={`flex-1 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
              secondsLeft === secs
                ? 'bg-accent/15 text-app-ink font-bold'
                : 'bg-app-muted text-app-subtle hover:text-app-ink'
            }`}
          >
            {secs < 60 ? `${secs}s` : `${secs / 60}m`}
          </button>
        ))}
      </div>
    </div>
  );
}
