import React from 'react';

/**
 * Notebook + celular em CSS 3D, só formas (sem texto).
 * As telas mostram a agenda do dia como blocos coloridos que se preenchem em ciclo.
 * Sem dados reais, sem Supabase. Movimento em CSS puro; respeita prefers-reduced-motion.
 */

type Block = { top: number; h: number; tone: 'brand' | 'ok' | 'mute'; delay: number };

const DESK_COLUMNS: Block[][] = [
  [
    { top: 6, h: 18, tone: 'brand', delay: 0 },
    { top: 30, h: 26, tone: 'mute', delay: 1 },
    { top: 62, h: 18, tone: 'ok', delay: 2 },
  ],
  [
    { top: 12, h: 30, tone: 'ok', delay: 1 },
    { top: 48, h: 16, tone: 'brand', delay: 2 },
    { top: 70, h: 20, tone: 'mute', delay: 3 },
  ],
  [
    { top: 4, h: 22, tone: 'mute', delay: 2 },
    { top: 32, h: 20, tone: 'brand', delay: 3 },
    { top: 58, h: 28, tone: 'ok', delay: 4 },
  ],
];

const PHONE_ROWS: Array<{ tone: Block['tone']; w: number }> = [
  { tone: 'brand', w: 78 },
  { tone: 'mute', w: 62 },
  { tone: 'ok', w: 70 },
  { tone: 'brand', w: 54 },
  { tone: 'mute', w: 66 },
];

const toneClass: Record<Block['tone'], string> = {
  brand: 'bg-amber-500',
  ok: 'bg-emerald-500',
  mute: 'bg-zinc-700',
};

const Laptop: React.FC = () => (
  <div className="dv-laptop" aria-hidden="true">
    {/* Tampa */}
    <div className="dv-lid">
      <div className="dv-screen">
        {/* Barra superior */}
        <div className="flex items-center gap-2 border-b border-white/5 px-3 py-2">
          <span className="h-5 w-5 rounded-md bg-amber-500" />
          <span className="h-1.5 w-16 rounded-full bg-zinc-700" />
          <span className="ml-auto h-1.5 w-8 rounded-full bg-zinc-800" />
          <span className="h-5 w-5 rounded-full bg-zinc-800" />
        </div>
        <div className="flex h-[calc(100%-37px)]">
          {/* Menu lateral */}
          <div className="flex w-9 flex-col items-center gap-3 border-r border-white/5 py-3">
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className={`h-3.5 w-3.5 rounded-[5px] ${i === 0 ? 'bg-amber-500' : 'bg-zinc-800'}`}
              />
            ))}
          </div>
          {/* Agenda em colunas */}
          <div className="grid flex-1 grid-cols-3 gap-2 p-3">
            {DESK_COLUMNS.map((col, c) => (
              <div key={c} className="relative rounded-lg bg-white/[0.03]">
                <span className="absolute left-2 top-1.5 h-1 w-6 rounded-full bg-zinc-700" />
                {col.map((b, i) => (
                  <span
                    key={i}
                    className={`dv-block absolute left-1.5 right-1.5 rounded-md ${toneClass[b.tone]}`}
                    style={{
                      top: `${b.top + 10}%`,
                      height: `${b.h}%`,
                      animationDelay: `${b.delay * 0.45}s`,
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
    {/* Base */}
    <div className="dv-base">
      <div className="dv-keys" />
      <div className="dv-trackpad" />
    </div>
  </div>
);

const Phone: React.FC = () => (
  <div className="dv-phone" aria-hidden="true">
    <div className="dv-phone-screen">
      <span className="dv-island" />
      <div className="mt-9 flex items-center gap-2 px-3">
        <span className="h-5 w-5 rounded-md bg-amber-500" />
        <span className="h-1.5 w-12 rounded-full bg-zinc-700" />
        <span className="ml-auto h-4 w-4 rounded-full bg-zinc-800" />
      </div>
      <div className="mt-4 flex gap-1.5 px-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={`h-7 flex-1 rounded-lg ${i === 1 ? 'bg-amber-500' : 'bg-zinc-800'}`}
          />
        ))}
      </div>
      <div className="mt-4 space-y-2 px-3">
        {PHONE_ROWS.map((r, i) => (
          <div
            key={i}
            className="dv-block flex items-center gap-2 rounded-xl bg-white/[0.04] p-2"
            style={{ animationDelay: `${i * 0.4 + 0.6}s` }}
          >
            <span className={`h-7 w-1.5 rounded-full ${toneClass[r.tone]}`} />
            <div className="flex-1 space-y-1.5">
              <span className="block h-1.5 rounded-full bg-zinc-600" style={{ width: `${r.w}%` }} />
              <span className="block h-1.5 w-1/3 rounded-full bg-zinc-800" />
            </div>
            <span className="h-4 w-4 rounded-full bg-zinc-800" />
          </div>
        ))}
      </div>
      <div className="absolute inset-x-3 bottom-3 flex justify-between rounded-2xl bg-white/[0.05] px-4 py-2.5">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`h-3.5 w-3.5 rounded-[5px] ${i === 0 ? 'bg-amber-500' : 'bg-zinc-700'}`}
          />
        ))}
      </div>
    </div>
  </div>
);

export const LandingDevices: React.FC = () => (
  <div className="dv-stage" role="img" aria-label="Notebook e celular exibindo a agenda do ProntoAgende">
    <div className="dv-glow" aria-hidden="true" />
    <div className="dv-rig">
      <Laptop />
      <Phone />
    </div>
    <div className="dv-floor" aria-hidden="true" />
  </div>
);

export default LandingDevices;
