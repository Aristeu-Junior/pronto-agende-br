import React from 'react';

interface SlotPickerProps {
  slots: string[];
  value: string;
  onChange: (time: string) => void;
  emptyMessage?: string;
  className?: string;
}

/** Lista de horários livres, clicáveis. */
export const SlotPicker: React.FC<SlotPickerProps> = ({
  slots,
  value,
  onChange,
  emptyMessage = 'Sem horários livres neste dia.',
  className = '',
}) => {
  if (slots.length === 0) {
    return <p className={`text-xs text-stone-400 ${className}`}>{emptyMessage}</p>;
  }
  return (
    <div role="group" aria-label="Horários livres" className={`grid grid-cols-4 gap-1.5 sm:grid-cols-5 ${className}`}>
      {slots.map((t) => {
        const active = t === value;
        return (
          <button
            key={t}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(t)}
            className={`num-tabular min-h-[40px] rounded-lg border text-xs font-semibold cursor-pointer ${
              active
                ? 'border-amber-500 bg-amber-500 text-stone-950'
                : 'border-stone-800 bg-stone-900 text-stone-200 hover:border-amber-500'
            }`}
          >
            {t}
          </button>
        );
      })}
    </div>
  );
};
