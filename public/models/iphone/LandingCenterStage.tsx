import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';

const STAGE_RATIO = 0.56;

export const LandingCenterStage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SandboxTab>('AGENDA');
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(1120);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const narrow = width < 640;

  const phoneScreen = (
    <div className="flex h-full w-full flex-col bg-stone-950 text-stone-100">
      <div className="flex items-center justify-between px-7 pt-3 pb-2">
        <span className="font-mono text-[13px] font-bold">9:41</span>
        <div className="flex items-center gap-1.5">
          <WifiHigh className="h-4 w-4" weight="bold" />
          <BatteryFull className="h-5 w-5" weight="fill" />
        </div>
      </div>
      <div className="mt-6 flex items-center gap-2 border-b border-stone-800 px-4 py-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-stone-950">
          <Scissors className="h-4 w-4" weight="bold" />
        </div>
        <span className="text-sm font-bold">ProntoAgende</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto bg-tint-50/40 p-3.5">
        <AppScreenBody activeTab={activeTab} compact onSelectTab={setActiveTab} />
      </div>
      <nav
        aria-label="Abas do aplicativo no celular"
        className="grid grid-cols-6 gap-0.5 border-t border-stone-800 bg-stone-950 px-1.5 pt-2 pb-5"
      >
        {SANDBOX_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            data-compact
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center rounded-lg px-0.5 py-1.5 text-[10px] font-semibold cursor-pointer ${
              tab.id === activeTab ? 'bg-amber-500/15 text-amber-800 font-bold' : 'text-stone-400'
            }`}
          >
            {tabIcon(tab.id)}
            <span className="mt-0.5 max-w-full truncate">{tab.shortLabel}</span>
          </button>
        ))}
      </nav>
    </div>
  );

  const laptopScreen = (
    <div className="flex h-full w-full flex-col bg-stone-950 text-stone-100">
      <div className="flex items-center justify-between gap-3 border-b border-stone-800 px-5 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-stone-950">
            <Scissors className="h-4 w-4" weight="bold" />
          </div>
          <span className="text-sm font-bold">ProntoAgende</span>
        </div>
        <nav
          aria-label="Abas do aplicativo no notebook"
          className="flex items-center gap-1 rounded-xl border border-stone-800 bg-stone-900 p-1"
        >
          {SANDBOX_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              data-compact
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer ${
                tab.id === activeTab
                  ? 'bg-amber-500 text-stone-950'
                  : 'text-stone-400 hover:text-stone-100'
              }`}
            >
              {tabIcon(tab.id)}
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto bg-tint-50/40 p-5">
        <AppScreenBody activeTab={activeTab} compact={false} onSelectTab={setActiveTab} />
      </div>
    </div>
  );

  return (
    <div ref={wrapRef} className="w-full">
      <div
        className="lc3d-stage relative mx-auto w-full"
        style={{ height: narrow ? 640 : Math.max(380, width * STAGE_RATIO) }}
      >
        <Suspense fallback={<div className="lc3d-loading" aria-hidden="true" />}>
          <LandingDevicesScene
            laptopScreen={laptopScreen}
            phoneScreen={phoneScreen}
            narrow={narrow}
          />
        </Suspense>
      </div>
    </div>
  );
};

export default LandingCenterStage;
