/**
 * Pré-visualização APENAS para desenvolvimento (não entra no build de produção).
 * Abre as telas da barbearia com dados de exemplo, sem login e sem servidor:
 *   http://127.0.0.1:5173/#/preview/ajustes   (agenda, caixa, clientes, reserva, lembretes)
 */
import GuidedTour from '../components/GuidedTour';
import { SupportModule } from '../components/SupportModule';
import ThemeToggle from '../components/ThemeToggle';
import { buildTourSteps, TourTab } from '../config/tourSteps';
import React, { useState } from 'react';
import { Appointment, BusinessConfig, Client, ServiceItem, StaffMember } from '../types';
import { INITIAL_BUSINESS_CONFIG } from '../data/seedData';
import { defaultSchedule, localISODate, addDaysISO } from '../utils/schedule';
import { AgendaModule } from '../components/AgendaModule';
import { ManagerDashboardModule } from '../components/ManagerDashboardModule';
import { PosModule } from '../components/PosModule';
import { ClientsModule } from '../components/ClientsModule';
import { ShareLinkModule } from '../components/ShareLinkModule';
import { RemindersModule } from '../components/RemindersModule';
import { AccountModule } from '../components/AccountModule';

const services: ServiceItem[] = [
  { id: 's1', name: 'Corte Masculino', category: 'CABELO', durationMinutes: 40, bufferAfterMinutes: 5, price: 45, customCommissionPct: 50, assistantSharePct: 0 },
  { id: 's2', name: 'Barba Completa', category: 'BARBA', durationMinutes: 30, bufferAfterMinutes: 5, price: 35, customCommissionPct: 50, assistantSharePct: 0 },
  { id: 's3', name: 'Combo Corte + Barba', category: 'CABELO', durationMinutes: 60, bufferAfterMinutes: 5, price: 70, customCommissionPct: 50, assistantSharePct: 0 },
];

const staff: StaffMember[] = [
  {
    id: 'b1',
    name: 'Barbeiro Principal',
    role: 'PROFESSIONAL',
    specialty: 'Corte & Barba',
    chairLabel: 'Cadeira 01',
    defaultServiceCommissionPct: 50,
    defaultProductCommissionPct: 10,
    acceptsWalkIns: true,
    workingHours: '09:00 - 19:00',
    avatarInitials: 'BP',
    schedule: defaultSchedule(),
  },
];

const today = localISODate();
const apt = (id: string, name: string, date: string, start: string, end: string, status: Appointment['status'], extra: Partial<Appointment> = {}): Appointment => ({
  id,
  clientId: `cli_${id}`,
  clientName: name,
  clientPhone: '(11) 98888-7777',
  staffId: 'b1',
  serviceIds: ['s1'],
  date,
  startTime: start,
  endTime: end,
  customPrice: 45,
  status,
  isWalkIn: false,
  originChannel: 'DIRECT_LINK',
  deviceFingerprint: '',
  depositPixPaid: 0,
  ...extra,
});

const initialAppointments: Appointment[] = [
  apt('a1', 'Carlos Henrique', today, '17:00', '17:40', 'CONFIRMED'),
  apt('a2', 'Rafael Souza', addDaysISO(today, 1), '10:00', '10:40', 'PENDING', { depositRequested: 13.5 }),
  apt('a3', 'Matheus Lima', addDaysISO(today, 1), '14:30', '15:10', 'CONFIRMED'),
];

const clients: Client[] = [
  { id: 'c1', fullName: 'Carlos Henrique', phoneWhatsapp: '(11) 98888-7777', cpf: '', email: '', visitsCount: 4, noShowCount: 0, lastVisitDaysAgo: 12, totalSpent: 180, tags: ['RECORRENTE'], notes: '', passes: [] },
];

const PreviewInner: React.FC<{ screen: string }> = ({ screen }) => {
  const [business, setBusiness] = useState<BusinessConfig>({ ...INITIAL_BUSINESS_CONFIG, name: 'Barbearia Dom Pedro', slug: 'dom-pedro', phone: '(11) 99999-0000' });
  const [appointments, setAppointments] = useState(initialAppointments);
  const [svc, setSvc] = useState(services);
  const [stf, setStf] = useState(staff);

  return (
    <div className="min-h-screen bg-stone-950 pb-24">
      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
        {screen === 'ajustes' && (
          <ManagerDashboardModule
            business={business}
            staff={stf}
            services={svc}
            appointments={appointments}
            transactions={[]}
            bankStatements={[]}
            onUpdateBusiness={(p) => setBusiness((b) => ({ ...b, ...p }))}
            onUpdateService={(id, p) => setSvc((l) => l.map((s) => (s.id === id ? { ...s, ...p } : s)))}
            onAddService={(n) => setSvc((l) => [...l, { ...n, id: `s${l.length + 1}` }])}
            onDeleteService={(id) => setSvc((l) => l.filter((s) => s.id !== id))}
            onUpdateStaff={(id, p) => setStf((l) => l.map((s) => (s.id === id ? { ...s, ...p } : s)))}
            onAddStaff={(n) => setStf((l) => [...l, { ...n, id: `b${l.length + 1}` }])}
            onDeleteStaff={(id) => setStf((l) => l.filter((s) => s.id !== id))}
            onAddBankStatement={() => {}}
            onDeleteBankStatement={() => {}}
            onResetAllData={() => {}}
          />
        )}
        {screen === 'agenda' && (
          <AgendaModule
            appointments={appointments}
            staff={stf}
            services={svc}
            clients={clients}
            business={business}
            onUpdateStatus={(id, status) => setAppointments((l) => l.map((a) => (a.id === id ? { ...a, status } : a)))}
            onUpdateAppointment={(id, p) => setAppointments((l) => l.map((a) => (a.id === id ? { ...a, ...p } : a)))}
            onDeleteAppointment={(id) => setAppointments((l) => l.filter((a) => a.id !== id))}
            onCreateAppointment={(n) => setAppointments((l) => [...l, { ...n, id: `n${l.length}` }])}
            onOpenInPos={() => {}}
            onUpdateStaff={(id, p) => setStf((l) => l.map((s) => (s.id === id ? { ...s, ...p } : s)))}
            onOpenReminders={() => {}}
          />
        )}
        {screen === 'caixa' && (
          <PosModule
            business={business}
            staff={stf}
            services={svc}
            clients={clients}
            appointments={appointments}
            transactions={[]}
            pendingCheckoutAppointmentId={null}
            onCompleteTransaction={() => {}}
            onDeleteTransaction={() => {}}
          />
        )}
        {screen === 'clientes' && (
          <ClientsModule clients={clients} businessName={business.name} onAddClient={() => {}} onUpdateClient={() => {}} onDeleteClient={() => {}} />
        )}
        {screen === 'reserva' && <ShareLinkModule business={business} staff={stf} services={svc} onGoToSettings={() => {}} />}
        {screen === 'suporte' && <SupportModule onDownloadData={() => {}} />}
        {screen === 'conta' && <AccountModule email="dono@exemplo.com" isAdmin={false} onAccountDeleted={() => {}} />}
        {screen === 'lembretes' && (
          <RemindersModule reminders={[]} appointments={appointments} business={business} staff={stf} services={svc} onDispatchAllPending={() => {}} onSimulateClientReply={() => {}} />
        )}
      </div>
    </div>
  );
};

const TAB_SCREEN: Record<string, string> = {
  AGENDA: 'agenda',
  POS: 'caixa',
  CLIENTS: 'clientes',
  PUBLIC_BOOKING: 'reserva',
  MANAGER: 'ajustes',
};

/** Casca mínima (cabeçalho + abas) só para testar o tutorial sem login. Usa os mesmos passos do app. */
const TourPreview: React.FC = () => {
  const [tab, setTab] = useState<TourTab>('AGENDA');
  const [open, setOpen] = useState(true);
  const labels: Array<[TourTab, string]> = [
    ['AGENDA', 'Agenda'],
    ['POS', 'Caixa'],
    ['CLIENTS', 'Clientes'],
    ['PUBLIC_BOOKING', 'Reserva'],
    ['MANAGER', 'Ajustes'],
  ];
  return (
    <div className="min-h-screen bg-stone-950 pb-20">
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-2 border-b border-stone-800 bg-stone-950 px-4">
        <button type="button" data-tour="business-name" className="truncate text-xs text-stone-400">
          Barbearia Dom Pedro
        </button>
        <div className="flex items-center gap-2">
          <span data-tour="theme" className="inline-flex">
            <ThemeToggle />
          </span>
          <button type="button" data-tour="account" className="rounded-xl border border-stone-800 px-2.5 py-1.5 text-xs text-stone-300">
            Conta
          </button>
        </div>
      </header>
      <PreviewInner screen={TAB_SCREEN[tab]} />
      <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-stone-800 bg-stone-950 py-1.5">
        {labels.map(([id, label]) => (
          <button key={id} type="button" data-tour={`nav-${id}`} onClick={() => setTab(id)} className="px-2 py-1.5 text-[11px] text-stone-300">
            {label}
          </button>
        ))}
      </nav>
      {open && <GuidedTour steps={buildTourSteps(setTab)} onClose={() => setOpen(false)} />}
    </div>
  );
};

export const Preview: React.FC<{ screen: string }> = ({ screen }) =>
  screen === 'tour' ? <TourPreview /> : <PreviewInner screen={screen} />;

export default Preview;
