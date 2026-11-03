import React, { useEffect, useState } from 'react';
import {
  BellRinging,
  CalendarBlank,
  ChartBar,
  Compass,
  CurrencyDollar,
  GlobeHemisphereWest,
  Scissors,
  ShieldCheck,
  Users,
} from '@phosphor-icons/react';
import {
  Appointment,
  AppointmentStatus,
  BusinessConfig,
  Client,
  FeeSplitRule,
  InventoryProduct,
  MarketplaceVenue,
  OriginChannel,
  PosTransaction,
  ReminderLog,
  ServiceItem,
  StaffMember,
  VerifiedReview,
} from './types';
import {
  INITIAL_APPOINTMENTS,
  INITIAL_BUSINESS_CONFIG,
  INITIAL_CLIENTS,
  INITIAL_MARKETPLACE_VENUES,
  INITIAL_PRODUCTS,
  INITIAL_REMINDERS,
  INITIAL_SERVICES,
  INITIAL_STAFF,
  INITIAL_POS_TRANSACTIONS,
  INITIAL_VERIFIED_REVIEWS,
} from './data/seedData';
import { AgendaModule } from './components/AgendaModule';
import { PosModule } from './components/PosModule';
import { ClientsModule } from './components/ClientsModule';
import { RemindersModule } from './components/RemindersModule';
import { PublicBookingModule } from './components/PublicBookingModule';
import { ManagerDashboardModule } from './components/ManagerDashboardModule';
import { MarketplaceDiscoveryModule } from './components/MarketplaceDiscoveryModule';

type ActiveTab =
  | 'AGENDA'
  | 'POS'
  | 'CLIENTS'
  | 'REMINDERS'
  | 'MARKETPLACE'
  | 'PUBLIC_PAGE'
  | 'MANAGER';

const STORAGE_KEY = 'pronto_agende_br_state_v1';

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('AGENDA');
  const [business, setBusiness] = useState<BusinessConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved).business || INITIAL_BUSINESS_CONFIG;
    } catch {}
    return INITIAL_BUSINESS_CONFIG;
  });

  const [staff] = useState<StaffMember[]>(INITIAL_STAFF);
  const [services] = useState<ServiceItem[]>(INITIAL_SERVICES);

  const [products, setProducts] = useState<InventoryProduct[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved).products || INITIAL_PRODUCTS;
    } catch {}
    return INITIAL_PRODUCTS;
  });

  const [clients, setClients] = useState<Client[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved).clients || INITIAL_CLIENTS;
    } catch {}
    return INITIAL_CLIENTS;
  });

  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved).appointments || INITIAL_APPOINTMENTS;
    } catch {}
    return INITIAL_APPOINTMENTS;
  });

  const [transactions, setTransactions] = useState<PosTransaction[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved)
        return JSON.parse(saved).transactions || INITIAL_POS_TRANSACTIONS;
    } catch {}
    return INITIAL_POS_TRANSACTIONS;
  });

  const [reminders, setReminders] = useState<ReminderLog[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved).reminders || INITIAL_REMINDERS;
    } catch {}
    return INITIAL_REMINDERS;
  });

  const [marketplaceVenues] = useState<MarketplaceVenue[]>(
    INITIAL_MARKETPLACE_VENUES
  );

  const [verifiedReviews, setVerifiedReviews] = useState<VerifiedReview[]>(
    () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved)
          return JSON.parse(saved).verifiedReviews || INITIAL_VERIFIED_REVIEWS;
      } catch {}
      return INITIAL_VERIFIED_REVIEWS;
    }
  );

  const [publicOriginChannel, setPublicOriginChannel] =
    useState<OriginChannel>('GOOGLE_RESERVE');

  const [posTargetAppointment, setPosTargetAppointment] =
    useState<Appointment | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          business,
          products,
          clients,
          appointments,
          transactions,
          reminders,
          verifiedReviews,
        })
      );
    } catch {}
  }, [
    business,
    products,
    clients,
    appointments,
    transactions,
    reminders,
    verifiedReviews,
  ]);

  const handleUpdateAppointmentStatus = (
    appointmentId: string,
    status: AppointmentStatus
  ) => {
    setAppointments((prev) =>
      prev.map((a) => (a.id === appointmentId ? { ...a, status } : a))
    );

    if (status === 'NO_SHOW') {
      const target = appointments.find((a) => a.id === appointmentId);
      if (target) {
        setClients((prev) =>
          prev.map((c) =>
            c.id === target.clientId
              ? {
                  ...c,
                  noShowCount: c.noShowCount + 1,
                  tags: c.tags.includes('ALERTA_FALTA')
                    ? c.tags
                    : [...c.tags, 'ALERTA_FALTA'],
                }
              : c
          )
        );
      }
    }
  };

  const handleCreateAppointment = (newApt: Omit<Appointment, 'id'>) => {
    const created: Appointment = {
      ...newApt,
      id: `apt_${Date.now()}`,
    };
    setAppointments((prev) => [...prev, created]);
    setBusiness((prev) => ({
      ...prev,
      monthlyBookingsUsed: prev.monthlyBookingsUsed + 1,
    }));
  };

  const handleOpenInPos = (appointment: Appointment) => {
    setPosTargetAppointment(appointment);
    setActiveTab('POS');
  };

  const handleTriggerWhatsAppReminder = (appointment: Appointment) => {
    const existing = reminders.find((r) => r.appointmentId === appointment.id);
    if (!existing) {
      const srvNames = services
        .filter((s) => appointment.serviceIds.includes(s.id))
        .map((s) => s.name)
        .join(' + ');
      const profName =
        staff.find((s) => s.id === appointment.staffId)?.name || 'Profissional';
      setReminders((prev) => [
        {
          id: `rem_${Date.now()}`,
          appointmentId: appointment.id,
          clientName: appointment.clientName,
          clientPhone: appointment.clientPhone,
          serviceSummary: srvNames,
          startTime: appointment.startTime,
          staffName: profName,
          type: 'REMINDER_2H',
          channel: 'WHATSAPP',
          status: 'SENT',
          sentAt: 'Agora mesmo',
        },
        ...prev,
      ]);
    }
    setActiveTab('REMINDERS');
  };

  const handleCompletePosSale = (
    txData: Omit<PosTransaction, 'id' | 'closedAt'>
  ) => {
    const now = new Date();
    const formattedTime = `31/10/2026 ${String(now.getHours()).padStart(
      2,
      '0'
    )}:${String(now.getMinutes()).padStart(2, '0')}`;

    const createdTx: PosTransaction = {
      ...txData,
      id: `pos_${Date.now()}`,
      closedAt: formattedTime,
    };

    setTransactions((prev) => [createdTx, ...prev]);

    // Se vinculado a um agendamento, marca como COMPLETED
    if (txData.appointmentId) {
      setAppointments((prev) =>
        prev.map((a) =>
          a.id === txData.appointmentId ? { ...a, status: 'COMPLETED' } : a
        )
      );
    }

    // Dá baixa automática no estoque dos produtos vendidos
    if (txData.productItems.length > 0) {
      setProducts((prev) =>
        prev.map((prd) => {
          const sold = txData.productItems.find((i) => i.productId === prd.id);
          if (!sold) return prd;
          return {
            ...prd,
            stockQuantity: Math.max(0, prd.stockQuantity - sold.quantity),
          };
        })
      );
    }

    // Atualiza LTV, visitas e eventual baixa de passe do cliente
    setClients((prev) =>
      prev.map((c) => {
        if (c.id !== txData.clientId) return c;
        const updatedPasses =
          txData.paymentMethod === 'CLIENT_PASS'
            ? c.passes.map((p, idx) =>
                idx === 0
                  ? {
                      ...p,
                      remainingSessions: Math.max(0, p.remainingSessions - 1),
                    }
                  : p
              )
            : c.passes;
        return {
          ...c,
          visitsCount: c.visitsCount + 1,
          lastVisitDaysAgo: 0,
          totalSpent: Number((c.totalSpent + txData.totalAmount).toFixed(2)),
          passes: updatedPasses,
        };
      })
    );

    setPosTargetAppointment(null);
  };

  const handleChangeFeeSplitRule = (feeSplitRule: FeeSplitRule) => {
    setBusiness((prev) => ({ ...prev, feeSplitRule }));
  };

  const handleAddClient = (clientData: Omit<Client, 'id'>) => {
    const created: Client = {
      ...clientData,
      id: `cli_${Date.now()}`,
    };
    setClients((prev) => [created, ...prev]);
  };

  const handleAddPassToClient = (
    clientId: string,
    serviceId: string,
    sessions: number
  ) => {
    const srv = services.find((s) => s.id === serviceId);
    setClients((prev) =>
      prev.map((c) => {
        if (c.id !== clientId) return c;
        return {
          ...c,
          tags: c.tags.includes('PACOTE_ATIVO')
            ? c.tags
            : [...c.tags, 'PACOTE_ATIVO'],
          passes: [
            ...c.passes,
            {
              id: `pass_${Date.now()}`,
              serviceId,
              name: `Pacote ${sessions}x ${srv?.name || 'Serviço'}`,
              totalSessions: sessions,
              remainingSessions: sessions,
              expiresAt: '2027-04-30',
            },
          ],
        };
      })
    );
  };

  const handleSendReminder = (reminderId: string) => {
    setReminders((prev) =>
      prev.map((r) =>
        r.id === reminderId
          ? { ...r, status: 'SENT', sentAt: 'Enviado agora' }
          : r
      )
    );
  };

  const handleSimulateClientReply = (
    reminderId: string,
    reply: 'CONFIRM' | 'CANCEL'
  ) => {
    const targetRem = reminders.find((r) => r.id === reminderId);
    setReminders((prev) =>
      prev.map((r) =>
        r.id === reminderId
          ? {
              ...r,
              status:
                reply === 'CONFIRM'
                  ? 'CONFIRMED_BY_CLIENT'
                  : 'CANCELLED_BY_CLIENT',
            }
          : r
      )
    );

    if (targetRem) {
      setAppointments((prev) =>
        prev.map((a) =>
          a.id === targetRem.appointmentId
            ? {
                ...a,
                status: reply === 'CONFIRM' ? 'CONFIRMED' : 'CANCELLED',
              }
            : a
        )
      );
    }
  };

  const handleUpdateBusiness = (patch: Partial<BusinessConfig>) => {
    setBusiness((prev) => ({ ...prev, ...patch }));
  };

  const handleAddVerifiedReview = (
    reviewData: Omit<VerifiedReview, 'id' | 'verifiedAt'>
  ) => {
    const created: VerifiedReview = {
      ...reviewData,
      id: `rev_${Date.now()}`,
      verifiedAt: 'Agora mesmo',
    };
    setVerifiedReviews((prev) => [created, ...prev]);
    setBusiness((prev) => ({
      ...prev,
      reviewsCount: prev.reviewsCount + 1,
    }));
  };

  const handleSelectVenueForBooking = (
    origin: 'GOOGLE_RESERVE' | 'MARKETPLACE_BOOST'
  ) => {
    setPublicOriginChannel(origin);
    setActiveTab('PUBLIC_PAGE');
  };

  const handleResetDemoData = () => {
    localStorage.removeItem(STORAGE_KEY);
    setBusiness(INITIAL_BUSINESS_CONFIG);
    setProducts(INITIAL_PRODUCTS);
    setClients(INITIAL_CLIENTS);
    setAppointments(INITIAL_APPOINTMENTS);
    setTransactions(INITIAL_POS_TRANSACTIONS);
    setReminders(INITIAL_REMINDERS);
    setVerifiedReviews(INITIAL_VERIFIED_REVIEWS);
  };

  const navItems: Array<{
    id: ActiveTab;
    label: string;
    shortLabel: string;
    badge?: string;
    icon: React.ReactNode;
  }> = [
    {
      id: 'AGENDA',
      label: 'Agenda & Walk-in',
      shortLabel: 'Agenda',
      badge: String(
        appointments.filter(
          (a) => a.status !== 'CANCELLED' && a.status !== 'COMPLETED'
        ).length
      ),
      icon: <CalendarBlank size={18} weight="bold" />,
    },
    {
      id: 'POS',
      label: 'PDV & Comissões',
      shortLabel: 'PDV',
      icon: <CurrencyDollar size={18} weight="bold" />,
    },
    {
      id: 'CLIENTS',
      label: 'Clientes & Passes',
      shortLabel: 'Clientes',
      badge: String(clients.length),
      icon: <Users size={18} weight="bold" />,
    },
    {
      id: 'REMINDERS',
      label: 'Lembretes WhatsApp',
      shortLabel: 'Lembretes',
      badge: String(
        reminders.filter((r) => r.status === 'PENDING').length || ''
      ),
      icon: <BellRinging size={18} weight="bold" />,
    },
    {
      id: 'MARKETPLACE',
      label: 'Vitrine Marketplace',
      shortLabel: 'Vitrine',
      badge: String(marketplaceVenues.length),
      icon: <Compass size={18} weight="bold" />,
    },
    {
      id: 'PUBLIC_PAGE',
      label: 'Página Pública / Google',
      shortLabel: 'Pág. Pública',
      icon: <GlobeHemisphereWest size={18} weight="bold" />,
    },
    {
      id: 'MANAGER',
      label: 'Painel do Gestor',
      shortLabel: 'Gestor',
      icon: <ChartBar size={18} weight="bold" />,
    },
  ];

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#F6F5F0] text-[#141413] pb-20 md:pb-8">
      {/* Barra Operacional Superior */}
      <header className="sticky top-0 z-30 border-b border-[#DEDAD0] bg-[#FFFFFF]/95 backdrop-blur-sm">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between gap-4">
            {/* Identidade da Plataforma + Unidade Ativa */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#141413] text-white">
                <Scissors size={20} weight="bold" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold tracking-tight text-[#141413]">
                    ProntoAgende BR
                  </span>
                  <span className="hidden sm:inline-flex items-center rounded border border-[#0F766E]/30 bg-[#E6F4F1] px-2 py-0.5 text-[11px] font-semibold text-[#0F766E]">
                    Trinks + Booksy + Reservio
                  </span>
                </div>
                <p className="text-xs text-[#4A4843]">
                  {business.name} · {business.neighborhood}, {business.cityState}
                </p>
              </div>
            </div>

            {/* Indicador Vivo da Cota Freemium & Status Google Reserve */}
            <div className="flex items-center gap-2.5">
              <div className="hidden lg:flex items-center gap-2 rounded-lg border border-[#DEDAD0] bg-[#F6F5F0] px-3 py-1.5 text-xs">
                <ShieldCheck size={16} weight="fill" className="text-[#0F766E]" />
                <span>
                  {business.planTier === 'FREE' ? 'Plano Grátis:' : 'Plano Pro:'}{' '}
                  <strong className="num-tabular font-semibold text-[#141413]">
                    {business.monthlyBookingsUsed}/
                    {business.planTier === 'PRO'
                      ? 'Ilimitado'
                      : business.monthlyBookingsLimit}
                  </strong>{' '}
                  reservas/mês
                </span>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('PUBLIC_PAGE')}
                className={`min-h-[38px] inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                  activeTab === 'PUBLIC_PAGE'
                    ? 'border-[#0F766E] bg-[#0F766E] text-white'
                    : 'border-[#DEDAD0] bg-white text-[#141413] hover:bg-[#F6F5F0]'
                }`}
              >
                <GlobeHemisphereWest size={16} weight="bold" />
                <span>Ver Página Pública / Google Reserve</span>
              </button>
            </div>
          </div>

          {/* Navegação Horizontal Desktop / Tablet */}
          <nav
            aria-label="Módulos principais do sistema"
            className="hidden md:flex items-center gap-1 border-t border-[#DEDAD0] py-2 overflow-x-auto"
          >
            {navItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`min-h-[38px] inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold ${
                    active
                      ? 'bg-[#141413] text-white'
                      : 'text-[#4A4843] hover:bg-[#EFECE6] hover:text-[#141413]'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {item.badge && (
                    <span
                      className={`num-tabular rounded px-1.5 py-0.5 text-[11px] ${
                        active
                          ? 'bg-white/20 text-white'
                          : 'bg-[#EFECE6] text-[#141413]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Conteúdo Principal Contido (max-w-[1400px]) */}
      <main className="mx-auto w-full max-w-[1400px] flex-1 px-0 sm:px-6 sm:pt-5">
        <div className="overflow-hidden border-y sm:border border-[#DEDAD0] sm:rounded-xl bg-white shadow-[0_12px_32px_-12px_rgba(20,20,19,0.06)]">
          {activeTab === 'AGENDA' && (
            <AgendaModule
              business={business}
              staff={staff}
              services={services}
              clients={clients}
              appointments={appointments}
              onUpdateStatus={handleUpdateAppointmentStatus}
              onCreateAppointment={handleCreateAppointment}
              onOpenInPos={handleOpenInPos}
              onTriggerWhatsAppReminder={handleTriggerWhatsAppReminder}
            />
          )}

          {activeTab === 'POS' && (
            <PosModule
              business={business}
              staff={staff}
              services={services}
              products={products}
              clients={clients}
              transactions={transactions}
              initialAppointment={posTargetAppointment}
              onCompleteSale={handleCompletePosSale}
              onChangeFeeSplitRule={handleChangeFeeSplitRule}
            />
          )}

          {activeTab === 'CLIENTS' && (
            <ClientsModule
              clients={clients}
              services={services}
              onAddClient={handleAddClient}
              onAddPassToClient={handleAddPassToClient}
            />
          )}

          {activeTab === 'REMINDERS' && (
            <RemindersModule
              reminders={reminders}
              clients={clients}
              onSendReminder={handleSendReminder}
              onSimulateClientReply={handleSimulateClientReply}
            />
          )}

          {activeTab === 'MARKETPLACE' && (
            <MarketplaceDiscoveryModule
              business={business}
              venues={marketplaceVenues}
              reviews={verifiedReviews}
              transactions={transactions}
              onAddVerifiedReview={handleAddVerifiedReview}
              onSelectVenueForBooking={handleSelectVenueForBooking}
            />
          )}

          {activeTab === 'PUBLIC_PAGE' && (
            <PublicBookingModule
              business={business}
              staff={staff}
              services={services}
              clients={clients}
              initialOrigin={publicOriginChannel}
              onCreatePublicBooking={handleCreateAppointment}
              onNavigateToAgenda={() => setActiveTab('AGENDA')}
            />
          )}

          {activeTab === 'MANAGER' && (
            <ManagerDashboardModule
              business={business}
              staff={staff}
              appointments={appointments}
              transactions={transactions}
              clients={clients}
              onUpdateBusiness={handleUpdateBusiness}
              onResetDemoData={handleResetDemoData}
            />
          )}
        </div>
      </main>

      {/* Barra de Navegação Inferior Fixa para Mobile (< 768px) — Operação com 1 Polegar */}
      <nav
        aria-label="Navegação rápida mobile"
        className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-[#DEDAD0] bg-white/95 backdrop-blur-sm px-2 py-1.5 flex items-center gap-1 overflow-x-auto"
      >
        {navItems.map((item) => {
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`min-h-[48px] min-w-[54px] flex-1 flex flex-col items-center justify-center rounded-lg px-1 py-1 text-[10px] font-semibold ${
                active ? 'bg-[#E6F4F1] text-[#0F766E]' : 'text-[#4A4843]'
              }`}
            >
              {item.icon}
              <span className="mt-0.5 truncate max-w-full">{item.shortLabel}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export default App;
