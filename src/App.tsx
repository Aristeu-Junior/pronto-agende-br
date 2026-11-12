import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  Calendar,
  CreditCard,
  ArrowSquareOut as ExternalLink,
  SquaresFour as LayoutDashboard,
  PencilSimple as Pencil,
  Scissors,
  ShieldCheck,
  SignOut,
  Users,
} from '@phosphor-icons/react';
import {
  INITIAL_BANK_STATEMENTS,
  INITIAL_CLIENTS,
  INITIAL_POS_TRANSACTIONS,
  INITIAL_REMINDERS,
} from './data/seedData';
import {
  Appointment,
  AppointmentStatus,
  BankStatementEntry,
  BusinessConfig,
  Client,
  PosTransaction,
  ReminderLog,
  ServiceItem,
  StaffMember,
  UserPermissions,
} from './types';
import { sanitizeUserText } from './utils/security';
import { servicesSpan } from './utils/schedule';
import { friendlyError, supabase } from './lib/supabase';
import {
  Profile,
  appointmentToRow,
  businessToRow,
  fetchAppointments,
  fetchBusiness,
  fetchProfile,
  loadOwnerData,
  newId,
  serviceFromRow,
  serviceToRow,
  staffFromRow,
  staffToRow,
} from './lib/cloud';
import { AgendaModule } from './components/AgendaModule';
import { ClientsModule } from './components/ClientsModule';
import { PosModule } from './components/PosModule';
import { RemindersModule } from './components/RemindersModule';
import { ManagerDashboardModule } from './components/ManagerDashboardModule';
import { AdminUsersModule } from './components/AdminUsersModule';
import { ShareLinkModule } from './components/ShareLinkModule';
import { PublicBookingPage } from './components/PublicBookingPage';
import { AuthScreen, OnboardingScreen, WaitingScreen } from './components/AuthScreens';

type ActiveTab = 'AGENDA' | 'POS' | 'CLIENTS' | 'REMINDERS' | 'PUBLIC_BOOKING' | 'MANAGER' | 'ADMIN';

const ALL_PERMISSIONS: UserPermissions = {
  canAccessAgenda: true,
  canAccessPos: true,
  canAccessClients: true,
  canAccessReminders: true,
  canAccessPublicBooking: true,
  canAccessManager: true,
  canEditPrices: true,
  canUploadStatements: true,
  canExportOrResetData: true,
  canManageUsers: false,
};

// Só existe em desenvolvimento: o build de produção remove este trecho.
const DevPreview = import.meta.env.DEV ? lazy(() => import('./dev/Preview')) : null;

function parsePublicSlug(hash: string): string | null {
  const m = hash.match(/^#\/reserva\/([a-z0-9-]{3,40})\/?$/i);
  return m ? m[1].toLowerCase() : null;
}

/* ============================================================
 * Raiz: decide entre página pública do cliente e área da barbearia.
 * ============================================================ */
export function App() {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const onHash = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  if (import.meta.env.DEV && DevPreview && hash.startsWith('#/preview/')) {
    return (
      <Suspense fallback={null}>
        <DevPreview screen={hash.replace('#/preview/', '')} />
      </Suspense>
    );
  }

  const publicSlug = parsePublicSlug(hash);
  if (publicSlug) return <PublicBookingPage slug={publicSlug} />;
  return <OwnerGate />;
}

/* ============================================================
 * Porta de entrada da barbearia: login, aprovação e cadastro.
 * ============================================================ */
function OwnerGate() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [business, setBusiness] = useState<BusinessConfig | null | undefined>(undefined);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id;

  const refresh = useCallback(async () => {
    if (!userId) return;
    setLoadError('');
    try {
      const p = await fetchProfile(userId);
      setProfile(p);
      if (p?.status === 'ACTIVE') setBusiness(await fetchBusiness(userId));
      else setBusiness(null);
    } catch (err) {
      setLoadError(friendlyError((err as Error)?.message));
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setBusiness(undefined);
      return;
    }
    setProfile(null);
    setBusiness(undefined);
    void refresh();
  }, [userId, refresh]);

  const signOut = () => void supabase.auth.signOut();

  if (session === undefined)
    return <main className="p-10 text-center text-sm text-stone-400">Carregando…</main>;
  if (!session) return <AuthScreen />;
  if (loadError)
    return (
      <main className="mx-auto max-w-sm p-10 text-center">
        <p className="text-sm font-medium text-rose-700">{loadError}</p>
        <button type="button" onClick={() => void refresh()} className="mt-4 rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-stone-950 cursor-pointer">
          Tentar de novo
        </button>
        <button type="button" onClick={signOut} className="mt-2 block w-full text-xs font-semibold text-stone-400 cursor-pointer">
          Sair
        </button>
      </main>
    );
  if (!profile) return <main className="p-10 text-center text-sm text-stone-400">Carregando…</main>;
  if (profile.status !== 'ACTIVE')
    return (
      <WaitingScreen
        email={profile.email}
        suspended={profile.status === 'SUSPENDED'}
        onRefresh={() => void refresh()}
        onSignOut={signOut}
      />
    );
  if (business === undefined) return <main className="p-10 text-center text-sm text-stone-400">Carregando…</main>;
  if (business === null)
    return <OnboardingScreen defaultName={profile.display_name} onCreated={setBusiness} onSignOut={signOut} />;

  return <Dashboard key={userId} userId={userId as string} profile={profile} initialBusiness={business} onSignOut={signOut} />;
}

/* ============================================================
 * Área da barbearia (conta ativa).
 * ============================================================ */
interface LocalState {
  clients: Client[];
  transactions: PosTransaction[];
  reminders: ReminderLog[];
  bankStatements: BankStatementEntry[];
}

function readLocal(userId: string): LocalState {
  try {
    const saved = localStorage.getItem(`pronto_agende_br_local_${userId}`);
    if (saved) {
      const p = JSON.parse(saved);
      return {
        clients: Array.isArray(p.clients) ? p.clients : INITIAL_CLIENTS,
        transactions: Array.isArray(p.transactions) ? p.transactions : INITIAL_POS_TRANSACTIONS,
        reminders: Array.isArray(p.reminders) ? p.reminders : INITIAL_REMINDERS,
        bankStatements: Array.isArray(p.bankStatements) ? p.bankStatements : INITIAL_BANK_STATEMENTS,
      };
    }
  } catch {
    // sem dados locais
  }
  return {
    clients: INITIAL_CLIENTS,
    transactions: INITIAL_POS_TRANSACTIONS,
    reminders: INITIAL_REMINDERS,
    bankStatements: INITIAL_BANK_STATEMENTS,
  };
}

function Dashboard({
  userId,
  profile,
  initialBusiness,
  onSignOut,
}: {
  userId: string;
  profile: Profile;
  initialBusiness: BusinessConfig;
  onSignOut: () => void;
}) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('AGENDA');
  const [pendingCheckoutAppointmentId, setPendingCheckoutAppointmentId] = useState<string | null>(null);
  const [editingHeaderName, setEditingHeaderName] = useState(false);
  const [pendingAccounts, setPendingAccounts] = useState(0);
  const [syncError, setSyncError] = useState('');

  const [business, setBusiness] = useState<BusinessConfig>(initialBusiness);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loaded, setLoaded] = useState(false);

  const initialLocal = useMemo(() => readLocal(userId), [userId]);
  const [clients, setClients] = useState<Client[]>(initialLocal.clients);
  const [transactions, setTransactions] = useState<PosTransaction[]>(initialLocal.transactions);
  const [reminders] = useState<ReminderLog[]>(initialLocal.reminders);
  const [bankStatements, setBankStatements] = useState<BankStatementEntry[]>(initialLocal.bankStatements);

  const perms: UserPermissions = { ...ALL_PERMISSIONS, canManageUsers: profile.is_admin };

  // ---------- Carga inicial e atualização periódica ----------
  useEffect(() => {
    let alive = true;
    loadOwnerData(initialBusiness.id)
      .then((d) => {
        if (!alive) return;
        setStaff(d.staff);
        setServices(d.services);
        setAppointments(d.appointments);
        setLoaded(true);
      })
      .catch((err) => setSyncError(friendlyError((err as Error)?.message)));
    return () => {
      alive = false;
    };
  }, [initialBusiness.id]);

  const refreshAppointments = useCallback(async () => {
    try {
      setAppointments(await fetchAppointments(initialBusiness.id));
    } catch {
      // mantém a lista atual; tenta de novo no próximo ciclo
    }
  }, [initialBusiness.id]);

  useEffect(() => {
    const timer = window.setInterval(() => void refreshAppointments(), 20000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refreshAppointments();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refreshAppointments]);

  // ---------- Dados locais (caixa, clientes, extratos) por conta ----------
  useEffect(() => {
    try {
      localStorage.setItem(
        `pronto_agende_br_local_${userId}`,
        JSON.stringify({ clients, transactions, reminders, bankStatements })
      );
    } catch {
      // ignore
    }
  }, [userId, clients, transactions, reminders, bankStatements]);

  // Toda reserva (inclusive as do link público) vira cliente na lista, se ainda não existir.
  useEffect(() => {
    if (!loaded) return;
    setClients((prev) => {
      const known = (a: Appointment) =>
        prev.some(
          (c) =>
            (a.clientPhone && c.phoneWhatsapp.replace(/\D/g, '') === a.clientPhone.replace(/\D/g, '')) ||
            c.fullName.toLowerCase() === a.clientName.toLowerCase()
        );
      const missing = appointments.filter((a) => a.clientName && !known(a));
      if (missing.length === 0) return prev;
      const added: Client[] = [];
      for (const a of missing) {
        if (added.some((c) => c.fullName.toLowerCase() === a.clientName.toLowerCase())) continue;
        added.push({
          id: a.clientId,
          fullName: a.clientName,
          phoneWhatsapp: a.clientPhone,
          cpf: '',
          email: '',
          visitsCount: 0,
          noShowCount: 0,
          lastVisitDaysAgo: 0,
          totalSpent: 0,
          tags: ['NOVO'],
          notes: '',
          passes: [],
        });
      }
      return [...added, ...prev];
    });
  }, [appointments, loaded]);

  // ---------- Gravação no servidor (com atraso para campos digitados) ----------
  const pending = useRef(new Map<string, { table: string; id: string; patch: Record<string, unknown>; timer: number }>());

  const pushUpdate = useCallback((table: 'businesses' | 'staff' | 'services', id: string, patch: Record<string, unknown>) => {
    if (Object.keys(patch).length === 0) return;
    const key = `${table}:${id}`;
    const prev = pending.current.get(key);
    if (prev) window.clearTimeout(prev.timer);
    const merged = { ...(prev?.patch ?? {}), ...patch };
    const timer = window.setTimeout(async () => {
      pending.current.delete(key);
      const { error } = await supabase.from(table).update(merged).eq('id', id);
      if (error) setSyncError(friendlyError(error.message));
    }, 600);
    pending.current.set(key, { table, id, patch: merged, timer });
  }, []);

  // grava o que ficou pendente se a pessoa fechar a aba
  useEffect(() => {
    const flush = () => {
      pending.current.forEach(({ table, id, patch, timer }) => {
        window.clearTimeout(timer);
        void supabase.from(table).update(patch).eq('id', id);
      });
      pending.current.clear();
    };
    window.addEventListener('pagehide', flush);
    return () => window.removeEventListener('pagehide', flush);
  }, []);

  const bufferFor = (serviceIds: string[]) =>
    servicesSpan(services.filter((s) => serviceIds.includes(s.id))).buffer;

  // ---------- Barbearia ----------
  const handleUpdateBusiness = (patch: Partial<BusinessConfig>) => {
    const clean = { ...patch };
    if (typeof clean.name === 'string') clean.name = sanitizeUserText(clean.name, 100);
    setBusiness((prev) => ({ ...prev, ...clean }));
    pushUpdate('businesses', business.id, businessToRow(clean));
  };

  // ---------- Agendamentos ----------
  const handleCreateAppointment = (newApt: Omit<Appointment, 'id'>) => {
    const created: Appointment = {
      ...newApt,
      clientName: sanitizeUserText(newApt.clientName, 80),
      id: newId(),
    };
    setAppointments((prev) => [...prev, created]);
    void (async () => {
      const { error } = await supabase
        .from('appointments')
        .insert({ id: created.id, business_id: business.id, ...appointmentToRow(created, bufferFor(created.serviceIds)) });
      if (error) {
        setSyncError(friendlyError(error.message));
        setAppointments((prev) => prev.filter((a) => a.id !== created.id));
      }
    })();
  };

  const handleUpdateAppointment = (appointmentId: string, patch: Partial<Appointment>) => {
    setAppointments((prev) => prev.map((a) => (a.id === appointmentId ? { ...a, ...patch } : a)));
    void (async () => {
      const row = appointmentToRow(patch, patch.serviceIds ? bufferFor(patch.serviceIds) : undefined);
      const { error } = await supabase.from('appointments').update(row).eq('id', appointmentId);
      if (error) {
        setSyncError(friendlyError(error.message));
        await refreshAppointments();
      }
    })();
  };

  const handleUpdateAppointmentStatus = (appointmentId: string, newStatus: AppointmentStatus) => {
    const target = appointments.find((a) => a.id === appointmentId);
    handleUpdateAppointment(appointmentId, { status: newStatus });
    if (newStatus === 'NO_SHOW' && target) {
      setClients((prev) =>
        prev.map((c) =>
          c.id === target.clientId || c.fullName.toLowerCase() === target.clientName.toLowerCase()
            ? {
                ...c,
                noShowCount: c.noShowCount + 1,
                tags: c.tags.includes('ALERTA_FALTA') ? c.tags : [...c.tags, 'ALERTA_FALTA'],
              }
            : c
        )
      );
    }
  };

  const handleDeleteAppointment = (appointmentId: string) => {
    setAppointments((prev) => prev.filter((a) => a.id !== appointmentId));
    void (async () => {
      const { error } = await supabase.from('appointments').delete().eq('id', appointmentId);
      if (error) {
        setSyncError(friendlyError(error.message));
        await refreshAppointments();
      }
    })();
  };

  const handleOpenPosForAppointment = (appointmentId: string) => {
    setPendingCheckoutAppointmentId(appointmentId);
    setActiveTab('POS');
  };

  // ---------- Caixa e clientes (locais) ----------
  const handleCompleteTransaction = (newTx: PosTransaction, appointmentId?: string) => {
    setTransactions((prev) => [newTx, ...prev]);
    if (appointmentId) handleUpdateAppointment(appointmentId, { status: 'COMPLETED' });
    setClients((prev) =>
      prev.map((c) =>
        c.id === newTx.clientId || c.fullName.toLowerCase() === newTx.clientName.toLowerCase()
          ? { ...c, visitsCount: c.visitsCount + 1, lastVisitDaysAgo: 0, totalSpent: c.totalSpent + newTx.totalAmount }
          : c
      )
    );
    setPendingCheckoutAppointmentId(null);
  };

  const handleDeleteTransaction = (txId: string) => setTransactions((prev) => prev.filter((t) => t.id !== txId));

  const handleAddClient = (newCli: Omit<Client, 'id'>) => {
    const created: Client = {
      ...newCli,
      fullName: sanitizeUserText(newCli.fullName, 80),
      notes: sanitizeUserText(newCli.notes, 250),
      id: `cli_${Date.now()}`,
    };
    setClients((prev) => [created, ...prev]);
  };
  const handleUpdateClient = (clientId: string, patch: Partial<Client>) =>
    setClients((prev) => prev.map((c) => (c.id === clientId ? { ...c, ...patch } : c)));
  const handleDeleteClient = (clientId: string) => setClients((prev) => prev.filter((c) => c.id !== clientId));

  // ---------- Serviços e equipe (no servidor) ----------
  const handleUpdateService = (serviceId: string, patch: Partial<ServiceItem>) => {
    setServices((prev) => prev.map((s) => (s.id === serviceId ? { ...s, ...patch } : s)));
    pushUpdate('services', serviceId, serviceToRow(patch));
  };

  const handleAddService = (newSrv: Omit<ServiceItem, 'id'>) => {
    const created: ServiceItem = { ...newSrv, id: newId() };
    setServices((prev) => [...prev, created]);
    void (async () => {
      const { error } = await supabase.from('services').insert({ id: created.id, business_id: business.id, ...serviceToRow(created) });
      if (error) {
        setSyncError(friendlyError(error.message));
        setServices((prev) => prev.filter((s) => s.id !== created.id));
      }
    })();
  };

  const handleDeleteService = (serviceId: string) => {
    setServices((prev) => prev.filter((s) => s.id !== serviceId));
    void supabase.from('services').update({ active: false }).eq('id', serviceId).then(({ error }) => {
      if (error) setSyncError(friendlyError(error.message));
    });
  };

  const handleUpdateStaff = (staffId: string, patch: Partial<StaffMember>) => {
    setStaff((prev) => prev.map((s) => (s.id === staffId ? { ...s, ...patch } : s)));
    pushUpdate('staff', staffId, staffToRow(patch));
  };

  const handleAddStaff = (newMember: Omit<StaffMember, 'id'>) => {
    const created: StaffMember = { ...newMember, id: newId() };
    setStaff((prev) => [...prev, created]);
    void (async () => {
      const { data, error } = await supabase
        .from('staff')
        .insert({ id: created.id, business_id: business.id, schedule: created.schedule ?? {}, ...staffToRow(created) })
        .select('*')
        .single();
      if (error) {
        setSyncError(friendlyError(error.message));
        setStaff((prev) => prev.filter((s) => s.id !== created.id));
      } else if (data) {
        setStaff((prev) => prev.map((s) => (s.id === created.id ? staffFromRow(data) : s)));
      }
    })();
  };

  const handleDeleteStaff = (staffId: string) => {
    setStaff((prev) => prev.filter((s) => s.id !== staffId));
    void supabase.from('staff').update({ active: false }).eq('id', staffId).then(({ error }) => {
      if (error) setSyncError(friendlyError(error.message));
    });
  };

  const handleAddBankStatement = (entry: Omit<BankStatementEntry, 'id'>) =>
    setBankStatements((prev) => [{ ...entry, id: `stmt_${Date.now()}` }, ...prev]);
  const handleDeleteBankStatement = (entryId: string) => setBankStatements((prev) => prev.filter((e) => e.id !== entryId));

  const handleResetAllData = () => {
    setClients([]);
    setTransactions([]);
    setBankStatements([]);
    setAppointments([]);
    void supabase.from('appointments').delete().eq('business_id', business.id).then(({ error }) => {
      if (error) setSyncError(friendlyError(error.message));
    });
  };

  const navItems: Array<{ id: ActiveTab; label: string; shortLabel: string; icon: React.ReactNode; badge?: number }> = [
    {
      id: 'AGENDA',
      label: 'Agenda',
      shortLabel: 'Agenda',
      icon: <Calendar className="w-4 h-4" />,
      badge: appointments.filter((a) => a.status !== 'COMPLETED' && a.status !== 'CANCELLED' && a.status !== 'NO_SHOW').length,
    },
    { id: 'POS', label: 'Caixa', shortLabel: 'Caixa', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'CLIENTS', label: 'Clientes', shortLabel: 'Clientes', icon: <Users className="w-4 h-4" />, badge: clients.length },
    { id: 'PUBLIC_BOOKING', label: 'Link de Reserva', shortLabel: 'Reserva', icon: <ExternalLink className="w-4 h-4" /> },
    { id: 'MANAGER', label: 'Ajustes', shortLabel: 'Ajustes', icon: <LayoutDashboard className="w-4 h-4" /> },
  ];

  if (!loaded && !syncError)
    return <main className="p-10 text-center text-sm text-stone-400">Carregando sua barbearia…</main>;

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col pb-20 md:pb-8">
      <header className="sticky top-0 z-40 bg-stone-950/90 backdrop-blur-md border-b border-stone-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-stone-950 shadow-lg shadow-amber-500/20 shrink-0">
              <Scissors className="w-5 h-5" weight="bold" />
            </div>
            <div className="min-w-0">
              <span className="font-bold tracking-tight text-base text-stone-100">ProntoAgende</span>
              {editingHeaderName ? (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <input
                    type="text"
                    autoFocus
                    value={business.name}
                    onChange={(e) => handleUpdateBusiness({ name: e.target.value })}
                    onBlur={() => setEditingHeaderName(false)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') setEditingHeaderName(false);
                    }}
                    placeholder="Digite o nome da sua barbearia..."
                    className="bg-stone-900 border border-amber-500 rounded-lg px-2 py-0.5 text-xs text-stone-100 focus:outline-none w-52 sm:w-64"
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingHeaderName(true)}
                  title="Clique para editar o nome da sua barbearia"
                  className="block text-xs text-stone-400 hover:text-amber-800 flex items-center gap-1.5 truncate max-w-[200px] sm:max-w-xs cursor-pointer"
                >
                  <span className="truncate">{business.name}</span>
                  <Pencil className="w-3 h-3 text-amber-700 shrink-0" />
                </button>
              )}
            </div>
          </div>

          <nav aria-label="Navegação Principal" className="hidden lg:flex items-center gap-1 bg-stone-900/90 p-1 rounded-xl border border-stone-800">
            {navItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    active ? 'bg-amber-500 text-stone-950 font-semibold shadow-sm' : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${active ? 'bg-stone-950/20 text-stone-950 font-bold' : 'bg-amber-500/20 text-amber-800'}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            {profile.is_admin && (
              <button
                type="button"
                onClick={() => setActiveTab('ADMIN')}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-stone-800 bg-stone-900/80 text-stone-300 hover:border-amber-500/50 text-xs font-medium cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Contas</span>
                {pendingAccounts > 0 && (
                  <span className="rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-stone-950">{pendingAccounts}</span>
                )}
              </button>
            )}
            <button
              type="button"
              onClick={onSignOut}
              title="Sair"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 text-xs font-semibold transition-all cursor-pointer"
            >
              <SignOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 pt-6">
        {syncError && (
          <div role="alert" className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-amber-500/40 bg-amber-950 px-4 py-2.5 text-xs font-medium text-stone-100">
            <span>{syncError}</span>
            <button type="button" onClick={() => setSyncError('')} className="shrink-0 font-bold text-amber-800 cursor-pointer">
              Fechar
            </button>
          </div>
        )}

        {activeTab === 'AGENDA' && (
          <AgendaModule
            appointments={appointments}
            staff={staff}
            services={services}
            clients={clients}
            business={business}
            onUpdateStatus={handleUpdateAppointmentStatus}
            onUpdateAppointment={handleUpdateAppointment}
            onDeleteAppointment={handleDeleteAppointment}
            onCreateAppointment={handleCreateAppointment}
            onOpenInPos={(apt) => handleOpenPosForAppointment(apt.id)}
            onUpdateStaff={handleUpdateStaff}
            onOpenReminders={() => setActiveTab('REMINDERS')}
          />
        )}

        {activeTab === 'POS' && (
          <PosModule
            business={business}
            staff={staff}
            services={services}
            clients={clients}
            appointments={appointments}
            transactions={transactions}
            pendingCheckoutAppointmentId={pendingCheckoutAppointmentId}
            onCompleteTransaction={handleCompleteTransaction}
            onDeleteTransaction={handleDeleteTransaction}
          />
        )}

        {activeTab === 'CLIENTS' && (
          <ClientsModule
            clients={clients}
            businessName={business.name}
            onAddClient={handleAddClient}
            onUpdateClient={handleUpdateClient}
            onDeleteClient={handleDeleteClient}
          />
        )}

        {activeTab === 'REMINDERS' && (
          <>
            <button type="button" onClick={() => setActiveTab('AGENDA')} className="mb-3 text-xs font-medium text-amber-700 hover:text-amber-800 cursor-pointer">
              ← Voltar para a Agenda
            </button>
            <RemindersModule
              reminders={reminders}
              appointments={appointments}
              business={business}
              staff={staff}
              services={services}
              onDispatchAllPending={() => {}}
              onSimulateClientReply={() => {}}
            />
          </>
        )}

        {activeTab === 'PUBLIC_BOOKING' && (
          <ShareLinkModule business={business} staff={staff} services={services} onGoToSettings={() => setActiveTab('MANAGER')} />
        )}

        {activeTab === 'MANAGER' && (
          <ManagerDashboardModule
            business={business}
            staff={staff}
            services={services}
            appointments={appointments}
            transactions={transactions}
            bankStatements={bankStatements}
            userPermissions={perms}
            onUpdateBusiness={handleUpdateBusiness}
            onUpdateService={handleUpdateService}
            onAddService={handleAddService}
            onDeleteService={handleDeleteService}
            onUpdateStaff={handleUpdateStaff}
            onAddStaff={handleAddStaff}
            onDeleteStaff={handleDeleteStaff}
            onAddBankStatement={handleAddBankStatement}
            onDeleteBankStatement={handleDeleteBankStatement}
            onResetAllData={handleResetAllData}
          />
        )}

        {activeTab === 'ADMIN' && profile.is_admin && (
          <>
            <button type="button" onClick={() => setActiveTab('AGENDA')} className="mb-3 text-xs font-medium text-amber-700 hover:text-amber-800 cursor-pointer">
              ← Voltar para a Agenda
            </button>
            <AdminUsersModule currentUserId={userId} onPendingCount={setPendingAccounts} />
          </>
        )}
      </main>

      <nav aria-label="Navegação Mobile" className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-stone-950/95 backdrop-blur-lg border-t border-stone-800 px-1 py-1.5 flex items-center justify-around">
        {navItems.map((item) => {
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl text-[10px] font-medium transition-colors cursor-pointer ${
                active ? 'text-amber-700 bg-amber-500/10 font-semibold' : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <div className="relative">
                {item.icon}
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 px-1 rounded-full bg-amber-500 text-stone-950 text-[9px] font-mono font-bold">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="mt-1 truncate max-w-full">{item.shortLabel}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export default App;
