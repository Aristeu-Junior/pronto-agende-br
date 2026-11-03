import React, { useEffect, useState } from 'react';
import {
  Bell,
  Calendar,
  CreditCard,
  ArrowSquareOut as ExternalLink,
  SquaresFour as LayoutDashboard,
  Moon,
  PencilSimple as Pencil,
  Scissors,
  Sparkle as Sparkles,
  Sun,
  Users,
} from '@phosphor-icons/react';
import {
  INITIAL_APPOINTMENTS,
  INITIAL_BANK_STATEMENTS,
  INITIAL_BUSINESS_CONFIG,
  INITIAL_CLIENTS,
  INITIAL_POS_TRANSACTIONS,
  INITIAL_REMINDERS,
  INITIAL_SERVICES,
  INITIAL_STAFF,
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
} from './types';
import { AgendaModule } from './components/AgendaModule';
import { ClientsModule } from './components/ClientsModule';
import { PosModule } from './components/PosModule';
import { RemindersModule } from './components/RemindersModule';
import { PublicBookingModule } from './components/PublicBookingModule';
import { ManagerDashboardModule } from './components/ManagerDashboardModule';

type ActiveTab =
  | 'AGENDA'
  | 'POS'
  | 'CLIENTS'
  | 'REMINDERS'
  | 'PUBLIC_BOOKING'
  | 'MANAGER';

const STORAGE_KEY = 'pronto_agende_br_state_v2_clean';
const THEME_STORAGE_KEY = 'pronto_agende_br_theme';

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('AGENDA');
  const [pendingCheckoutAppointmentId, setPendingCheckoutAppointmentId] =
    useState<string | null>(null);
  const [editingHeaderName, setEditingHeaderName] = useState(false);

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {
      // ignore
    }
    return 'dark';
  });

  useEffect(() => {
    const meta = document.querySelector(
      'meta[name="color-scheme"]'
    ) as HTMLMetaElement | null;
    if (meta) {
      meta.content = theme;
    }
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // ignore
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const [business, setBusiness] = useState<BusinessConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.business) return parsed.business;
      }
    } catch {
      // ignore
    }
    return INITIAL_BUSINESS_CONFIG;
  });

  const [staff, setStaff] = useState<StaffMember[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.staff) && parsed.staff.length > 0) {
          return parsed.staff;
        }
      }
    } catch {
      // ignore
    }
    return INITIAL_STAFF;
  });

  const [services, setServices] = useState<ServiceItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.services) && parsed.services.length > 0) {
          return parsed.services;
        }
      }
    } catch {
      // ignore
    }
    return INITIAL_SERVICES;
  });

  const [clients, setClients] = useState<Client[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.clients)) return parsed.clients;
      }
    } catch {
      // ignore
    }
    return INITIAL_CLIENTS;
  });

  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.appointments)) return parsed.appointments;
      }
    } catch {
      // ignore
    }
    return INITIAL_APPOINTMENTS;
  });

  const [transactions, setTransactions] = useState<PosTransaction[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.transactions)) return parsed.transactions;
      }
    } catch {
      // ignore
    }
    return INITIAL_POS_TRANSACTIONS;
  });

  const [reminders, setReminders] = useState<ReminderLog[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.reminders)) return parsed.reminders;
      }
    } catch {
      // ignore
    }
    return INITIAL_REMINDERS;
  });

  const [bankStatements, setBankStatements] = useState<BankStatementEntry[]>(
    () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed.bankStatements)) {
            return parsed.bankStatements;
          }
        }
      } catch {
        // ignore
      }
      return INITIAL_BANK_STATEMENTS;
    }
  );

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          business,
          staff,
          services,
          clients,
          appointments,
          transactions,
          reminders,
          bankStatements,
        })
      );
    } catch {
      // ignore
    }
  }, [
    business,
    staff,
    services,
    clients,
    appointments,
    transactions,
    reminders,
    bankStatements,
  ]);

  // Handlers
  const handleUpdateBusiness = (patch: Partial<BusinessConfig>) => {
    setBusiness((prev) => ({ ...prev, ...patch }));
  };

  const handleUpdateAppointmentStatus = (
    appointmentId: string,
    newStatus: AppointmentStatus
  ) => {
    const targetApt = appointments.find((a) => a.id === appointmentId);
    setAppointments((prev) =>
      prev.map((apt) =>
        apt.id === appointmentId ? { ...apt, status: newStatus } : apt
      )
    );

    if (newStatus === 'NO_SHOW' && targetApt) {
      setClients((prev) =>
        prev.map((cli) =>
          cli.id === targetApt.clientId ||
          cli.fullName.toLowerCase() === targetApt.clientName.toLowerCase()
            ? {
                ...cli,
                noShowCount: cli.noShowCount + 1,
                tags: cli.tags.includes('ALERTA_FALTA')
                  ? cli.tags
                  : [...cli.tags, 'ALERTA_FALTA'],
              }
            : cli
        )
      );
    }
  };

  const handleUpdateAppointment = (
    appointmentId: string,
    patch: Partial<Appointment>
  ) => {
    setAppointments((prev) =>
      prev.map((apt) => (apt.id === appointmentId ? { ...apt, ...patch } : apt))
    );
  };

  const handleDeleteAppointment = (appointmentId: string) => {
    setAppointments((prev) => prev.filter((apt) => apt.id !== appointmentId));
  };

  const handleCreateAppointment = (newApt: Omit<Appointment, 'id'>) => {
    const created: Appointment = {
      ...newApt,
      id: `apt_${Date.now()}`,
    };
    setAppointments((prev) => [...prev, created]);

    // Se o cliente ainda não estiver na lista de Clientes, cadastra automaticamente
    const exists = clients.some(
      (c) =>
        c.fullName.toLowerCase() === newApt.clientName.toLowerCase() ||
        (newApt.clientPhone && c.phoneWhatsapp === newApt.clientPhone)
    );
    if (!exists && newApt.clientName.trim()) {
      setClients((prev) => [
        {
          id: newApt.clientId || `cli_${Date.now()}`,
          fullName: newApt.clientName.trim(),
          phoneWhatsapp: newApt.clientPhone || '',
          cpf: '',
          email: '',
          visitsCount: 1,
          noShowCount: 0,
          lastVisitDaysAgo: 0,
          totalSpent: 0,
          tags: ['NOVO'],
          notes: newApt.notes || '',
          passes: [],
        },
        ...prev,
      ]);
    }

    setBusiness((prev) => ({
      ...prev,
      monthlyBookingsUsed: prev.monthlyBookingsUsed + 1,
    }));
  };

  const handleOpenPosForAppointment = (appointmentId: string) => {
    setPendingCheckoutAppointmentId(appointmentId);
    setActiveTab('POS');
  };

  const handleCompleteTransaction = (
    newTx: PosTransaction,
    appointmentId?: string
  ) => {
    setTransactions((prev) => [newTx, ...prev]);
    if (appointmentId) {
      setAppointments((prev) =>
        prev.map((apt) =>
          apt.id === appointmentId ? { ...apt, status: 'COMPLETED' } : apt
        )
      );
    }
    setClients((prev) =>
      prev.map((cli) =>
        cli.id === newTx.clientId ||
        cli.fullName.toLowerCase() === newTx.clientName.toLowerCase()
          ? {
              ...cli,
              visitsCount: cli.visitsCount + 1,
              lastVisitDaysAgo: 0,
              totalSpent: cli.totalSpent + newTx.totalAmount,
            }
          : cli
      )
    );
    setPendingCheckoutAppointmentId(null);
  };

  const handleDeleteTransaction = (txId: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== txId));
  };

  const handleAddClient = (newCli: Omit<Client, 'id'>) => {
    const created: Client = {
      ...newCli,
      id: `cli_${Date.now()}`,
    };
    setClients((prev) => [created, ...prev]);
  };

  const handleUpdateClient = (clientId: string, patch: Partial<Client>) => {
    setClients((prev) =>
      prev.map((cli) => (cli.id === clientId ? { ...cli, ...patch } : cli))
    );
  };

  const handleDeleteClient = (clientId: string) => {
    setClients((prev) => prev.filter((cli) => cli.id !== clientId));
  };

  const handleUpdateService = (
    serviceId: string,
    patch: Partial<ServiceItem>
  ) => {
    setServices((prev) =>
      prev.map((s) => (s.id === serviceId ? { ...s, ...patch } : s))
    );
  };

  const handleAddService = (newSrv: Omit<ServiceItem, 'id'>) => {
    setServices((prev) => [...prev, { ...newSrv, id: `srv_${Date.now()}` }]);
  };

  const handleDeleteService = (serviceId: string) => {
    setServices((prev) => prev.filter((s) => s.id !== serviceId));
  };

  const handleUpdateStaff = (staffId: string, patch: Partial<StaffMember>) => {
    setStaff((prev) =>
      prev.map((st) => (st.id === staffId ? { ...st, ...patch } : st))
    );
  };

  const handleAddStaff = (newMember: Omit<StaffMember, 'id'>) => {
    setStaff((prev) => [...prev, { ...newMember, id: `st_${Date.now()}` }]);
  };

  const handleDeleteStaff = (staffId: string) => {
    setStaff((prev) => prev.filter((st) => st.id !== staffId));
  };

  const handleAddBankStatement = (entry: Omit<BankStatementEntry, 'id'>) => {
    setBankStatements((prev) => [
      { ...entry, id: `stmt_${Date.now()}` },
      ...prev,
    ]);
  };

  const handleDeleteBankStatement = (entryId: string) => {
    setBankStatements((prev) => prev.filter((e) => e.id !== entryId));
  };

  const handleResetAllData = () => {
    setClients([]);
    setAppointments([]);
    setTransactions([]);
    setReminders([]);
    setBankStatements([]);
  };

  const navItems: Array<{
    id: ActiveTab;
    label: string;
    shortLabel: string;
    icon: React.ReactNode;
    badge?: number;
  }> = [
    {
      id: 'AGENDA',
      label: 'Agenda & Encaixes',
      shortLabel: 'Agenda',
      icon: <Calendar className="w-4 h-4" />,
      badge: appointments.filter(
        (a) => a.status !== 'COMPLETED' && a.status !== 'CANCELLED'
      ).length,
    },
    {
      id: 'POS',
      label: 'Caixa / PDV',
      shortLabel: 'Caixa',
      icon: <CreditCard className="w-4 h-4" />,
    },
    {
      id: 'CLIENTS',
      label: 'Clientes',
      shortLabel: 'Clientes',
      icon: <Users className="w-4 h-4" />,
      badge: clients.length,
    },
    {
      id: 'REMINDERS',
      label: 'Lembretes WhatsApp',
      shortLabel: 'Lembretes',
      icon: <Bell className="w-4 h-4" />,
    },
    {
      id: 'PUBLIC_BOOKING',
      label: 'Link de Reserva',
      shortLabel: 'Link',
      icon: <ExternalLink className="w-4 h-4" />,
    },
    {
      id: 'MANAGER',
      label: 'Gestão & Preços',
      shortLabel: 'Gestão',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
  ];

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col pb-20 md:pb-8">
      {/* Top App Header */}
      <header className="sticky top-0 z-40 bg-stone-950/90 backdrop-blur-md border-b border-stone-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          {/* Brand Identity + Inline Editable Barbershop Name */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-stone-950 shadow-lg shadow-amber-500/20 shrink-0">
              <Scissors className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-tight text-base text-stone-100">
                  ProntoAgende
                </span>
                <span className="text-[10px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 font-semibold">
                  BR
                </span>
              </div>

              {editingHeaderName ? (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <input
                    type="text"
                    autoFocus
                    value={business.name}
                    onChange={(e) =>
                      handleUpdateBusiness({
                        name: e.target.value,
                        isConfigured: true,
                      })
                    }
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
                  className="text-xs text-stone-400 hover:text-amber-300 flex items-center gap-1.5 truncate max-w-[230px] sm:max-w-md cursor-pointer"
                >
                  <span className="truncate">{business.name}</span>
                  <Pencil className="w-3 h-3 text-amber-400 shrink-0" />
                </button>
              )}
            </div>
          </div>

          {/* Desktop Navigation Pills */}
          <nav
            aria-label="Navegação Principal"
            className="hidden lg:flex items-center gap-1 bg-stone-900/90 p-1 rounded-xl border border-stone-800"
          >
            {navItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    active
                      ? 'bg-amber-500 text-stone-950 font-semibold shadow-sm'
                      : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                        active
                          ? 'bg-stone-950/20 text-stone-950 font-bold'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Status Pill & Theme Toggle */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={
                theme === 'dark' ? 'Ativar Modo Claro' : 'Ativar Modo Escuro'
              }
              title={
                theme === 'dark'
                  ? 'Mudar para Modo Claro'
                  : 'Mudar para Modo Escuro'
              }
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-800 bg-stone-900/80 text-stone-200 hover:border-amber-500/50 transition-all cursor-pointer text-xs font-medium"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Modo Claro</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-amber-500" />
                  <span className="hidden sm:inline">Modo Escuro</span>
                </>
              )}
            </button>

            <button
              onClick={() => setActiveTab('MANAGER')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer bg-amber-500/10 border-amber-500/30 text-amber-300"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Configurar Barbearia</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 pt-6">
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
          <RemindersModule
            reminders={reminders}
            appointments={appointments}
            business={business}
            staff={staff}
            services={services}
            onDispatchAllPending={() => {}}
            onSimulateClientReply={() => {}}
          />
        )}

        {activeTab === 'PUBLIC_BOOKING' && (
          <PublicBookingModule
            business={business}
            staff={staff}
            services={services}
            onCreatePublicBooking={handleCreateAppointment}
          />
        )}

        {activeTab === 'MANAGER' && (
          <ManagerDashboardModule
            business={business}
            staff={staff}
            services={services}
            appointments={appointments}
            transactions={transactions}
            bankStatements={bankStatements}
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
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Navegação Mobile"
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-stone-950/95 backdrop-blur-lg border-t border-stone-800 px-1 py-1.5 grid grid-cols-6 gap-0.5"
      >
        {navItems.map((item) => {
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-[10px] font-medium transition-colors cursor-pointer ${
                active
                  ? 'text-amber-400 bg-amber-500/10 font-semibold'
                  : 'text-stone-400 hover:text-stone-200'
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
