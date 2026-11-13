/** Estilo único dos formulários e janelas. Campos grandes, rótulo curto, uma ação principal. */
export const FIELD =
  'w-full min-h-[44px] rounded-xl border border-stone-800 bg-stone-950 px-3.5 text-sm text-stone-100 placeholder:text-stone-500 focus:border-amber-500 focus:outline-none';

export const LABEL = 'mb-1.5 block text-xs font-semibold text-stone-300';

/** Título de seção dentro de um formulário (ex.: "Cliente", "Serviço", "Quando"). */
export const SECTION = 'text-[11px] font-bold uppercase tracking-wider text-stone-400';

export const BTN_PRIMARY =
  'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50 cursor-pointer';

export const BTN_GHOST =
  'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-stone-800 bg-stone-950 px-5 text-sm font-medium text-stone-300 hover:border-stone-700 cursor-pointer';

/** Opção em forma de pílula (serviços, tipo de chamado). */
export const chip = (active: boolean) =>
  `inline-flex min-h-[40px] items-center gap-1.5 rounded-full border px-3.5 text-xs font-semibold cursor-pointer ${
    active ? 'border-amber-500 bg-amber-950 text-stone-100' : 'border-stone-800 bg-stone-950 text-stone-300 hover:border-stone-700'
  }`;
