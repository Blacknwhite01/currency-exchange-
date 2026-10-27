import { PERIODS } from './chartUtils.js';

export default function PeriodTabs({ value, onChange, label = 'Time period' }) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {PERIODS.map((p) => (
        <button
          key={p.value}
          type="button"
          className={`segmented__item ${value === p.value ? 'is-active' : ''}`}
          aria-pressed={value === p.value}
          aria-label={p.name}
          onClick={() => onChange(p.value)}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
