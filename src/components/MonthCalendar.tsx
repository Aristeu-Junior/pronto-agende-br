import React, { useEffect, useMemo, useState } from 'react';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import {
  MONTH_NAMES,
  WEEKDAY_SHORT,
  localISODate,
  parseISODate,
} from '../utils/schedule';

export interface DayMarker {
  /** quantidade de agendamentos no dia */
  count?: number;
  /** dia sem atendimento (folga, feriado ou fora da escala) */
  closed?: boolean;
}

interface MonthCalendarProps {
  value: string;
  onChange: (iso: string) => void;
  min?: string;
  max?: string;
  getMarker?: (iso: string) => DayMarker | undefined;
  className?: string;
}

export const MonthCalendar: React.FC<MonthCalendarProps> = ({
  value,
  onChange,
  min,
  max,
  getMarker,
  className = '',
}) => {
  const selected = parseISODate(value);
  const [viewYear, setViewYear] = useState(selected.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected.getMonth());
  const today = localISODate();

  // Mantém o mês visível em sincronia com o dia selecionado (setas, "hoje", pulo para o 1º dia livre).
  useEffect(() => {
    const d = parseISODate(value);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }, [value]);

  const cells = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1, 12);
    const lead = first.getDay();
    const total = new Date(viewYear, viewMonth + 1, 0).getDate();
    const out: Array<string | null> = [];
    for (let i = 0; i < lead; i++) out.push(null);
    for (let d = 1; d <= total; d++) {
      out.push(localISODate(new Date(viewYear, viewMonth, d, 12)));
    }
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [viewYear, viewMonth]);

  const shift = (delta: number) => {
    const d = new Date(viewYear, viewMonth + delta, 1, 12);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };

  return (
    <div className={`select-none ${className}`}>
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          aria-label="Mês anterior"
          onClick={() => shift(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-stone-800 text-stone-300 hover:border-amber-500 cursor-pointer"
        >
          <CaretLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold text-stone-100">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </span>
        <button
          type="button"
          aria-label="Próximo mês"
          onClick={() => shift(1)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-stone-800 text-stone-300 hover:border-amber-500 cursor-pointer"
        >
          <CaretRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAY_SHORT.map((w) => (
          <span key={w} className="py-1 text-[11px] font-semibold uppercase text-stone-500">
            {w}
          </span>
        ))}
        {cells.map((iso, i) => {
          if (!iso) return <span key={`e${i}`} />;
          const marker = getMarker?.(iso);
          const disabled = (!!min && iso < min) || (!!max && iso > max);
          const isSelected = iso === value;
          const isToday = iso === today;
          return (
            <button
              key={iso}
              type="button"
              disabled={disabled}
              onClick={() => onChange(iso)}
              aria-label={iso}
              aria-pressed={isSelected}
              className={`relative flex h-10 flex-col items-center justify-center rounded-lg border text-xs font-medium transition-colors ${
                isSelected
                  ? 'border-amber-500 bg-amber-500 text-stone-950 font-bold'
                  : disabled
                    ? 'border-transparent text-stone-700 cursor-not-allowed'
                    : marker?.closed
                      ? 'border-transparent bg-stone-800/60 text-stone-500 hover:border-stone-700 cursor-pointer'
                      : 'border-stone-800 text-stone-200 hover:border-amber-500 cursor-pointer'
              } ${isToday && !isSelected ? 'ring-1 ring-amber-500' : ''}`}
            >
              <span>{parseISODate(iso).getDate()}</span>
              {!!marker?.count && !isSelected && (
                <span className="absolute bottom-1 h-1.5 w-1.5 rounded-full bg-emerald-500" />
              )}
              {!!marker?.count && isSelected && (
                <span className="absolute bottom-1 h-1.5 w-1.5 rounded-full bg-stone-950" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
