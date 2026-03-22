import type { ChangeEvent, ReactElement } from "react";
import { useCallback } from "react";

interface StepSliderProps {
  readonly steps: number[];
  readonly value: number;
  readonly onChange: (step: number) => void;
}

export default function StepSlider({ steps, value, onChange }: StepSliderProps): ReactElement {
  const index = steps.indexOf(value);
  const currentIndex = index >= 0 ? index : 0;

  const onSliderChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const i = Number(e.target.value);
    if (steps[i] !== undefined) { onChange(steps[i]); }
  }, [steps, onChange]);

  const onDecrement = useCallback(() => {
    const prev = steps[currentIndex - 1];
    if (prev !== undefined) { onChange(prev); }
  }, [steps, currentIndex, onChange]);

  const onIncrement = useCallback(() => {
    const next = steps[currentIndex + 1];
    if (next !== undefined) { onChange(next); }
  }, [steps, currentIndex, onChange]);

  return (
    <div className="flex items-center gap-3">
      <span className="text-[0.75rem] font-medium text-brand-textMuted">Step</span>
      <input
        type="range"
        min={0}
        max={steps.length - 1}
        value={currentIndex}
        onChange={onSliderChange}
        className="h-1 w-24 cursor-pointer accent-brand-accent"
      />
      <div className="flex items-center gap-1">
        <button
          type="button"
          className="flex h-6 w-6 items-center justify-center rounded border border-brand-border
            text-brand-textMuted hover:bg-brand-surfaceMuted disabled:opacity-40"
          disabled={currentIndex <= 0}
          onClick={onDecrement}
        >
          <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
            <path d="M9 6H3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
        <span className="min-w-[3rem] text-center text-[0.8125rem] tabular-nums text-brand-text">{value}</span>
        <button
          type="button"
          className="flex h-6 w-6 items-center justify-center rounded border border-brand-border
            text-brand-textMuted hover:bg-brand-surfaceMuted disabled:opacity-40"
          disabled={currentIndex >= steps.length - 1}
          onClick={onIncrement}
        >
          <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
            <path d="M6 3v6M9 6H3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
