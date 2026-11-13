import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  Calendar,
  CreditCard,
  ArrowSquareOut as ExternalLink,
  SquaresFour as LayoutDashboard,
  PencilSimple as Pencil,
  Question,
  Scissors,
  ShieldCheck,
  SignOut,
  UserCircle,
  Users,
} from '@phosphor-icons/react';
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
import ThemeToggle from './components/ThemeToggle';
import GuidedTour from './components/GuidedTour';
import { buildTourSteps } from './config/tourSteps';
import { sanitizeUserText } from './utils/security';
import { servicesSpan } from './utils/schedule';
import { friendlyError, supabase } from './lib/supabase';
import {
  Profile,
  appointmentToRow,
  deleteAllDocs,
  deleteDoc,
  insertDocs,
  isUuid,
  loadDocs,
  updateDoc,
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
import { AuthScreen, MfaChallengeScreen, OnboardingScreen, ResetPasswordScreen, WaitingScreen } from './components/AuthScreens';
import { AccountModule } from './components/AccountModule';
import { LegalPage } from './components/LegalPages';

type ActiveTab = 'AGENDA' | 'POS' | 'CLIENTS' | 'REMINDERS' | 'PUBLIC_BOOKING' | 'MANAGER' | 'ADMIN' | 'ACCOUNT';

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

  if (hash === '#/termos') return <LegalPage kind="termos" />;
  if (hash === '#/privacidade') return <LegalPage kind="privacidade" />;

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
  const [recovery, setRecovery] = useState(false);
  const [mfaState, setMfaState] = useState<'checking' | 'needed' | 'ok'>('checking');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
    });
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
      setMfaState('checking');
      return;
    }
    setProfile(null);
    setBusiness(undefined);
    setMfaState('checking');
    let alive = true;
    (async () => {
      const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (!alive) return;
      if (data && data.nextLevel === 'aal2' && data.currentLevel !== 'aal2') {
        setMfaState('needed');
        return;
      }
      setMfaState('ok');
      void refresh();
    })();
    return () => {
      alive = false;
    };
  }, [userId, refresh]);

  const signOut = () => void supabase.auth.signOut();

  if (session === undefined)
    return <main className="p-10 text-center text-sm text-stone-400">Carregando…</main>;
  if (!session) return <AuthScreen />;
  if (recovery) return <ResetPasswordScreen onDone={() => setRecovery(false)} />;
  if (mfaState === 'needed')
    return (
      <MfaChallengeScreen
        onDone={() => {
          setMfaState('ok');
          void refresh();
        }}
        onSignOut={signOut}
      />
    );
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
/** Dados que antes ficavam só no navegador (versões anteriores). Importados uma única vez. */
function readOldLocal(userId: string): { clients: Client[]; transactions: PosTransaction[]; bankStatements: BankStatementEntry[] } | null {
  try {
    const saved = localStorage.getItem(`pronto_agende_br_local_${userId}`);
    if (!saved) return null;
    const p = JSON.parse(saved);
    const clients = Array.isArray(p.clients) ? p.clients : [];
    const transactions = Array.isArray(p.transactions) ? p.transactions : [];
    const bankStatements = Array.isArray(p.bankStatements) ? p.bankStatements : [];
    return clients.length + transactions.length + bankStatements.length > 0 ? { clients, transactions, bankStatements } : null;
  } catch {
    return null;
  }
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

  const [clients, setClients] = useState<Client[]>([]);
  const [transactions, setTransactions] = useState<PosTransaction[]>([]);
  const [reminders] = useState<ReminderLog[]>([]);
  const [bankStatements, setBankStatements] = useState<BankStatementEntry[]>([]);

  const perms: UserPermissions = { ...ALL_PERMISSIONS, canManageUsers: profile.is_admin };

  // ---------- Carga inicial e atualização periódica ----------
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const d = await loadOwnerData(initialBusiness.id);
        let [cl, tx, st] = await Promise.all([
          loadDocs<Client>('crm_clients', initialBusiness.id),
          loadDocs<PosTransaction>('pos_transactions', initialBusiness.id),
          loadDocs<BankStatementEntry>('bank_statements', initialBusiness.id),
        ]);

        // Importação única: dados que estavam só neste navegador sobem para o servidor.
        if (cl.length + tx.length + st.length === 0) {
          const old = readOldLocal(userId);
          if (old) {
            const idMap = new Map<string, string>();
            const fix = (id: string) => {
              if (isUuid(id)) return id;
              if (!idMap.has(id)) idMap.set(id, newId());
              return idMap.get(id) as string;
            };
            cl = old.clients.map((c) => ({ ...c, id: fix(c.id) }));
            tx = old.transactions.map((t) => ({ ...t, id: fix(t.id), clientId: idMap.get(t.clientId) ?? t.clientId }));
            st = old.bankStatements.map((e) => ({ ...e, id: fix(e.id) }));
            await insertDocs('crm_clients', initialBusiness.id, cl);
            await insertDocs('pos_transactions', initialBusiness.id, tx);
            await insertDocs('bank_statements', initialBusiness.id, st);
            localStorage.removeItem(`pronto_agende_br_local_${userId}`);
          }
        }

        if (!alive) return;
        setStaff(d.staff);
        setServices(d.services);
        setAppointments(d.appointments);
        setClients(cl);
        setTransactions(tx);
        setBankStatements(st);
        setLoaded(true);
      } catch (err) {
        if (alive) setSyncError(friendlyError((err as Error)?.message));
      }
    })();
    return () => {
      alive = false;
    };
  }, [initialBusiness.id, userId]);

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

  // Toda reserva (inclusive as do link público) vira cliente na lista, se ainda não existir.
  useEffect(() => {
    if (!loaded) return;
    const digits = (v: string) => v.replace(/\D/g, '');
    const known = (a: Appointment) =>
      clients.some(
        (c) =>
          (digits(a.clientPhone) && digits(c.phoneWhatsapp) === digits(a.clientPhone)) ||
          c.fullName.toLowerCase() === a.clientName.toLowerCase()
      );
    const added: Client[] = [];
    for (const a of appointments) {
      if (!a.clientName || ignoredApts.current.has(a.id) || known(a)) continue;
      if (added.some((c) => c.fullName.toLowerCase() === a.clientName.toLowerCase())) continue;
      added.push({
        id: newId(),
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
    if (added.length === 0) return;
    setClients((prev) => [...added, ...prev]);
    persist(insertDocs('crm_clients', business.id, added));
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Reservas cujo cliente foi apagado não recriam o cliente (só reservas novas recriam).
  const ignoredKey = `pronto_agende_br_ignored_${initialBusiness.id}`;
  const ignoredApts = useRef<Set<string>>(
    (() => {
      try {
        const raw = localStorage.getItem(ignoredKey);
        return new Set<string>(raw ? (JSON.parse(raw) as string[]) : []);
      } catch {
        return new Set<string>();
      }
    })()
  );
  const rememberIgnored = (ids: string[]) => {
    ids.forEach((id) => ignoredApts.current.add(id));
    try {
      localStorage.setItem(ignoredKey, JSON.stringify([...ignoredApts.current].slice(-5000)));
    } catch {
      // sem armazenamento local
    }
  };

  const persist = (job: Promise<unknown>) => {
    job.catch((err) => setSyncError(friendlyError((err as Error)?.message)));
  };

  const patchClients = (match: (c: Client) => boolean, fn: (c: Client) => Client) => {
    const changed = clients.filter(match).map(fn);
    if (changed.length === 0) return;
    setClients((prev) => prev.map((c) => changed.find((x) => x.id === c.id) ?? c));
    changed.forEach((c) => persist(updateDoc('crm_clients', c)));
  };

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
      patchClients(
        (c) => c.id === target.clientId || c.fullName.toLowerCase() === target.clientName.toLowerCase(),
        (c) => ({
          ...c,
          noShowCount: c.noShowCount + 1,
          tags: c.tags.includes('ALERTA_FALTA') ? c.tags : [...c.tags, 'ALERTA_FALTA'],
        })
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

  // ---------- Caixa e clientes (no servidor) ----------
  const handleCompleteTransaction = (newTx: PosTransaction, appointmentId?: string) => {
    const tx: PosTransaction = { ...newTx, id: isUuid(newTx.id) ? newTx.id : newId() };
    setTransactions((prev) => [tx, ...prev]);
    persist(insertDocs('pos_transactions', business.id, [tx]));
    if (appointmentId) handleUpdateAppointment(appointmentId, { status: 'COMPLETED' });
    patchClients(
      (c) => c.id === tx.clientId || c.fullName.toLowerCase() === tx.clientName.toLowerCase(),
      (c) => ({ ...c, visitsCount: c.visitsCount + 1, lastVisitDaysAgo: 0, totalSpent: c.totalSpent + tx.totalAmount })
    );
    setPendingCheckoutAppointmentId(null);
  };

  const handleDeleteTransaction = (txId: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== txId));
    persist(deleteDoc('pos_transactions', txId));
  };

  const handleAddClient = (newCli: Omit<Client, 'id'>) => {
    const created: Client = {
      ...newCli,
      fullName: sanitizeUserText(newCli.fullName, 80),
      notes: sanitizeUserText(newCli.notes, 250),
      id: newId(),
    };
    setClients((prev) => [created, ...prev]);
    persist(insertDocs('crm_clients', business.id, [created]));
  };
  const handleUpdateClient = (clientId: string, patch: Partial<Client>) =>
    patchClients(
      (c) => c.id === clientId,
      (c) => ({ ...c, ...patch })
    );
  const handleDeleteClient = (clientId: string) => {
    const gone = clients.find((c) => c.id === clientId);
    if (gone) {
      const digits = (v: string) => v.replace(/\D/g, '');
      rememberIgnored(
        appointments
          .filter(
            (a) =>
              (digits(a.clientPhone) && digits(a.clientPhone) === digits(gone.phoneWhatsapp)) ||
              a.clientName.toLowerCase() === gone.fullName.toLowerCase()
          )
          .map((a) => a.id)
      );
    }
    setClients((prev) => prev.filter((c) => c.id !== clientId));
    persist(deleteDoc('crm_clients', clientId));
  };

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

  const handleAddBankStatement = (entry: Omit<BankStatementEntry, 'id'>) => {
    const created: BankStatementEntry = { ...entry, id: newId() };
    setBankStatements((prev) => [created, ...prev]);
    persist(insertDocs('bank_statements', business.id, [created]));
  };
  const handleDeleteBankStatement = (entryId: string) => {
    setBankStatements((prev) => prev.filter((e) => e.id !== entryId));
    persist(deleteDoc('bank_statements', entryId));
  };

  const handleResetAllData = () => {
    setClients([]);
    setTransactions([]);
    setBankStatements([]);
    setAppointments([]);
    persist(deleteAllDocs(business.id));
    void supabase.from('appointments').delete().eq('business_id', business.id).then(({ error }) => {
      if (error) setSyncError(friendlyError(error.message));
    });
  };

  const tourKey = `pa-tour-v1:${userId}`;
  const [tourOpen, setTourOpen] = useState(false);
  const startTour = () => {
    setActiveTab('AGENDA');
    setTourOpen(true);
  };
  const closeTour = (completed: boolean) => {
    setTourOpen(false);
    setActiveTab('AGENDA');
    try {
      localStorage.setItem(tourKey, completed ? 'done' : 'skipped');
    } catch {
      /* sem armazenamento: o tutorial pode reaparecer no próximo acesso */
    }
  };
  useEffect(() => {
    if (!loaded) return;
    let seen = false;
    try {
      seen = localStorage.getItem(tourKey) !== null;
    } catch {
      seen = true;
    }
    if (seen) return;
    const t = window.setTimeout(() => setTourOpen(true), 700);
    return () => window.clearTimeout(t);
  }, [loaded, tourKey]);

  const tourSteps = buildTourSteps(setActiveTab);

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
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="hidden min-[360px]:flex w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-stone-950 shadow-lg shadow-amber-500/20 shrink-0">
              <Scissors className="w-5 h-5" weight="bold" />
            </div>
            <div className="min-w-0">
              <span className="block truncate font-bold tracking-tight text-base text-stone-100">ProntoAgende</span>
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
                  data-tour="business-name"
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
                  data-tour={`nav-${item.id}`}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    active ? 'bg-amber-500 text-stone-950 font-semibold shadow-sm' : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[11px] font-mono ${active ? 'bg-stone-950/20 text-stone-950 font-bold' : 'bg-amber-500/20 text-amber-800'}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <span data-tour="theme" className="inline-flex">
              <ThemeToggle />
            </span>
            <button
              type="button"
              data-tour="help"
              onClick={startTour}
              title="Ver o tutorial de novo"
              aria-label="Ver o tutorial de novo"
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-stone-800 bg-stone-900/80 text-stone-300 hover:border-amber-500/50 text-xs font-medium cursor-pointer"
            >
              <Question className="w-4 h-4" weight="bold" />
              <span className="hidden sm:inline">Tutorial</span>
            </button>
            {profile.is_admin && (
              <button
                type="button"
                onClick={() => setActiveTab('ADMIN')}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-stone-800 bg-stone-900/80 text-stone-300 hover:border-amber-500/50 text-xs font-medium cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Contas</span>
                {pendingAccounts > 0 && (
                  <span className="rounded-full bg-amber-500 px-1.5 text-[11px] font-bold text-stone-950">{pendingAccounts}</span>
                )}
              </button>
            )}
            <button
              type="button"
              data-tour="account"
              onClick={() => setActiveTab('ACCOUNT')}
              title="Minha conta"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-stone-800 bg-stone-900/80 text-stone-300 hover:border-amber-500/50 text-xs font-medium cursor-pointer"
            >
              <UserCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Conta</span>
            </button>
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

      {tourOpen && <GuidedTour steps={tourSteps} onClose={closeTour} />}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 pt-6">
        {syncError && (
          <div role="alert" className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-amber-500/40 bg-amber-950 px-4 py-2.5 text-xs font-medium text-stone-100">
            <span>{syncError}</span>
            <button type="button" onClick={() => setSyncError('')} className="shrink-0 font-bold text-amber-800 cursor-pointer">
              Fechar
            </button>
          </div>
        )}

        <div key={activeTab} className="tab-enter">
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

        {activeTab === 'ACCOUNT' && (
          <AccountModule email={profile.email} isAdmin={profile.is_admin} onStartTour={startTour} onAccountDeleted={() => window.location.reload()} />
        )}

        {activeTab === 'ADMIN' && profile.is_admin && (
          <>
            <button type="button" onClick={() => setActiveTab('AGENDA')} className="mb-3 text-xs font-medium text-amber-700 hover:text-amber-800 cursor-pointer">
              ← Voltar para a Agenda
            </button>
            <AdminUsersModule currentUserId={userId} onPendingCount={setPendingAccounts} />
          </>
        )}
        </div>
      </main>

      <nav aria-label="Navegação Mobile" className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-stone-950/95 backdrop-blur-lg border-t border-stone-800 px-1 py-1.5 flex items-center justify-around">
        {navItems.map((item) => {
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              data-tour={`nav-${item.id}`}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl text-[11px] font-medium transition-colors cursor-pointer ${
                active ? 'text-amber-700 bg-amber-500/10 font-semibold' : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <div className="relative">
                {item.icon}
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 px-1 rounded-full bg-amber-500 text-stone-950 text-[10px] font-mono font-bold">
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
