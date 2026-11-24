import React, { useMemo, useState } from 'react';
import {
  Calendar,
  CheckCircle,
  Copy,
  CreditCard,
  DeviceMobile,
  DownloadSimple,
  ArrowSquareOut as ExternalLink,
  Headset,
  Laptop,
  SquaresFour as LayoutDashboard,
  MagnifyingGlass,
  Plus,
  Scissors,
  Users,
  WhatsappLogo,
} from '@phosphor-icons/react';
import { PaymentMethod } from '../types';
import { calculatePartnerSplit, formatBRL } from '../utils/validators';
import { SpotlightCard } from './SpotlightCard';

type DeviceMode = 'desktop' | 'mobile';
type SandboxTab =
  | 'AGENDA'
  | 'POS'
  | 'CLIENTS'
  | 'PUBLIC_BOOKING'
  | 'MANAGER'
  | 'SUPPORT';

const SANDBOX_TABS: Array<{
  id: SandboxTab;
  label: string;
  shortLabel: string;
  badge?: string;
  title: string;
  description: string;
  highlights: string[];
}> = [
  {
    id: 'AGENDA',
    label: 'Agenda',
    shortLabel: 'Agenda',
    badge: '3',
    title: 'Agenda do Dia e Encaixes',
    description:
      'Tela principal do barbeiro: visualize horários em ordem, filtre por profissional, registre encaixes de balcão e cobre ou avise no WhatsApp em 1 toque.',
    highlights: [
      'Bloqueio automático no servidor contra horários duplicados',
      'Encaixe (walk-in) sem precisar preencher cadastro longo',
      'Atalho direto do horário para fechar o valor no Caixa',
    ],
  },
  {
    id: 'POS',
    label: 'Caixa',
    shortLabel: 'Caixa',
    title: 'Caixa / PDV em 3 Passos',
    description:
      'Registre recebimentos em Pix, débito, crédito ou dinheiro com cálculo automático da taxa da maquininha e da comissão de cada profissional.',
    highlights: [
      'Rateio configurável conforme a Lei do Salão Parceiro',
      'Valor editável na hora caso o cliente adicione outro serviço',
      'Resumo imediato do bruto, repasse da equipe e lucro da loja',
    ],
  },
  {
    id: 'CLIENTS',
    label: 'Clientes',
    shortLabel: 'Clientes',
    badge: '3',
    title: 'Carteira de Clientes',
    description:
      'Toda reserva pelo link público cria ou atualiza a ficha do cliente com histórico de visitas, faltas (no-show) e total gasto.',
    highlights: [
      'Busca rápida por nome durante o atendimento',
      'Indicador claro de faltas para decidir quando pedir sinal Pix',
      'Botão direto para chamar o cliente no WhatsApp',
    ],
  },
  {
    id: 'PUBLIC_BOOKING',
    label: 'Link de Reserva',
    shortLabel: 'Reserva',
    title: 'Link Próprio para Instagram e WhatsApp',
    description:
      'Copie o endereço público da barbearia e confira o checklist automático antes de divulgar para seus clientes.',
    highlights: [
      'Cliente escolhe serviço e horário livre sem baixar app',
      'Checklist confirma se serviços, escala e Pix estão prontos',
      'Horários reservados caem na Agenda sem expor terceiros',
    ],
  },
  {
    id: 'MANAGER',
    label: 'Ajustes',
    shortLabel: 'Ajustes',
    title: 'Preços, Equipe e Escala Semanal',
    description:
      'Edite serviços, duração, valores em R$, comissão dos profissionais e horários de atendimento com folgas e intervalo de almoço.',
    highlights: [
      'Alteração direta de preços sem sair da tela',
      'Escala individual por dia da semana e intervalo por cadeira',
      'Configuração do percentual de sinal Pix anti-falta',
    ],
  },
  {
    id: 'SUPPORT',
    label: 'Suporte',
    shortLabel: 'Suporte',
    title: 'Suporte e Cópia de Dados (LGPD)',
    description:
      'Acompanhe chamados diretamente no painel e baixe uma cópia completa dos registros da sua barbearia quando quiser.',
    highlights: [
      'Abertura e acompanhamento de chamados no próprio app',
      'Exportação em JSON de clientes, agenda e caixa em 1 clique',
      'Seus dados e carteira pertencem 100% ao seu negócio',
    ],
  },
];

function tabIcon(id: SandboxTab) {
  switch (id) {
    case 'AGENDA':
      return <Calendar className="h-3.5 w-3.5 shrink-0" weight="bold" />;
    case 'POS':
      return <CreditCard className="h-3.5 w-3.5 shrink-0" weight="bold" />;
    case 'CLIENTS':
      return <Users className="h-3.5 w-3.5 shrink-0" weight="bold" />;
    case 'PUBLIC_BOOKING':
      return <ExternalLink className="h-3.5 w-3.5 shrink-0" weight="bold" />;
    case 'MANAGER':
      return <LayoutDashboard className="h-3.5 w-3.5 shrink-0" weight="bold" />;
    case 'SUPPORT':
      return <Headset className="h-3.5 w-3.5 shrink-0" weight="bold" />;
  }
}

const SANDBOX_APPOINTMENTS = [
  {
    id: 'a1',
    time: '10:00',
    client: 'Matheus R.',
    service: 'Corte Masculino',
    staff: 'Rafael',
    price: 45,
    status: 'Concluído',
    badgeClass: 'bg-tint-100 text-stone-400',
  },
  {
    id: 'a2',
    time: '11:30',
    client: 'Gabriel S.',
    service: 'Barba Completa · Encaixe',
    staff: 'Rafael',
    price: 35,
    status: 'Na Cadeira',
    badgeClass: 'bg-emerald-950 text-emerald-700',
  },
  {
    id: 'a3',
    time: '14:30',
    client: 'Lucas M.',
    service: 'Combo Corte + Barba',
    staff: 'Rafael',
    price: 70,
    status: 'Confirmado',
    badgeClass: 'bg-amber-950 text-amber-800',
  },
] as const;

const SANDBOX_CLIENTS = [
  {
    name: 'Lucas M.',
    visits: 8,
    noShows: 0,
    spent: 520,
    tag: 'Recorrente',
  },
  {
    name: 'Gabriel S.',
    visits: 4,
    noShows: 0,
    spent: 185,
    tag: 'Preferência: Barba navalhada',
  },
  {
    name: 'Matheus R.',
    visits: 3,
    noShows: 1,
    spent: 135,
    tag: '1 falta registrada',
  },
] as const;

interface AppScreenBodyProps {
  activeTab: SandboxTab;
  compact: boolean;
  onSelectTab: (tab: SandboxTab) => void;
}

const AppScreenBody: React.FC<AppScreenBodyProps> = ({
  activeTab,
  compact,
  onSelectTab,
}) => {
  const [staffFilter, setStaffFilter] = useState<'ALL' | 'RAFAEL'>('ALL');
  const [walkInAdded, setWalkInAdded] = useState(false);
  const [whatsappNotice, setWhatsappNotice] = useState<string | null>(null);
  const [posServicePrice, setPosServicePrice] = useState<number>(70);
  const [posMethod, setPosMethod] =
    useState<Extract<PaymentMethod, 'PIX' | 'DEBIT_CARD' | 'CREDIT_CARD'>>('PIX');
  const [clientSearch, setClientSearch] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);

  const posSplit = useMemo(
    () =>
      calculatePartnerSplit({
        subtotalServices: posServicePrice,
        subtotalProducts: 0,
        discountAmount: 0,
        tipAmount: 0,
        serviceCommissionPct: 50,
        productCommissionPct: 0,
        assistantSharePct: 0,
        hasAssistant: false,
        paymentMethod: posMethod,
        feeSplitRule: 'PROPORTIONAL',
        isFirstVisitBoost: false,
        boostCommissionPct: 0,
      }),
    [posServicePrice, posMethod]
  );

  const filteredClients = SANDBOX_CLIENTS.filter((c) =>
    c.name.toLowerCase().includes(clientSearch.trim().toLowerCase())
  );

  if (activeTab === 'AGENDA') {
    return (
      <div className="space-y-3 tab-enter">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-bold text-stone-100">
              Agenda de Hoje · Barbearia Modelo
            </p>
            <p className="text-[11px] text-stone-400">
              Toque em um horário para cobrar ou enviar lembrete
            </p>
          </div>
          <button
            type="button"
            data-compact
            onClick={() => setWalkInAdded((prev) => !prev)}
            className="inline-flex items-center gap-1 rounded-xl bg-amber-500 hover:bg-amber-600 px-2.5 py-1.5 text-[11px] font-bold text-stone-950 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" weight="bold" />
            <span>{walkInAdded ? 'Encaixe adicionado' : 'Encaixe'}</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {[
            { id: 'ALL' as const, label: 'Todos os horários' },
            { id: 'RAFAEL' as const, label: 'Rafael · Cadeira 01' },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              data-compact
              onClick={() => setStaffFilter(f.id)}
              className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold cursor-pointer ${
                staffFilter === f.id
                  ? 'border-amber-500 bg-amber-950 text-amber-800'
                  : 'border-stone-800 bg-stone-900 text-stone-400'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {SANDBOX_APPOINTMENTS.map((apt) => (
            <div
              key={apt.id}
              className="rounded-xl border border-stone-800 bg-stone-900 p-2.5 sm:p-3 flex flex-col gap-2"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="rounded-lg bg-tint-100 px-2 py-1 font-mono num-tabular text-[11px] font-bold text-stone-100 shrink-0">
                    {apt.time}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-stone-100">
                      {apt.client}
                    </p>
                    <p className="truncate text-[11px] text-stone-400">
                      {apt.service} · {apt.staff}
                    </p>
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-bold ${apt.badgeClass}`}
                >
                  {apt.status}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 border-t border-stone-800/80 pt-2">
                <span className="font-mono num-tabular text-xs font-bold text-amber-800">
                  {formatBRL(apt.price)}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    data-compact
                    onClick={() => setWhatsappNotice(apt.client)}
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-2 py-1 text-[10px] font-bold text-ink-dark cursor-pointer"
                  >
                    <WhatsappLogo className="h-3 w-3" weight="bold" />
                    <span>WhatsApp</span>
                  </button>
                  <button
                    type="button"
                    data-compact
                    onClick={() => {
                      setPosServicePrice(apt.price);
                      onSelectTab('POS');
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-stone-800 bg-tint-50 px-2 py-1 text-[10px] font-bold text-stone-200 hover:border-amber-500 cursor-pointer"
                  >
                    <span>Cobrar</span>
                  </button>
                </div>
              </div>
            </div>
          ))}

          {walkInAdded && (
            <div className="rounded-xl border-2 border-amber-500 bg-amber-950/60 p-2.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="rounded-lg bg-amber-500 px-2 py-0.5 font-mono num-tabular text-[11px] font-bold text-stone-950">
                  16:00
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-stone-100">
                    Cliente Balcão · Encaixe
                  </p>
                  <p className="truncate text-[11px] text-stone-400">
                    Corte Masculino · Rafael
                  </p>
                </div>
              </div>
              <span className="font-mono num-tabular text-xs font-bold text-amber-800">
                R$ 45,00
              </span>
            </div>
          )}

          {whatsappNotice && (
            <div className="rounded-xl border border-emerald-700/40 bg-emerald-950 px-3 py-2 text-[11px] font-semibold text-emerald-700">
              Simulação: link oficial wa.me pronto para {whatsappNotice} com horário
              e barbearia.
            </div>
          )}
        </div>
      </div>
    );
  }

  if (activeTab === 'POS') {
    return (
      <div className="space-y-3 tab-enter">
        <div className={`grid ${compact ? 'grid-cols-2' : 'grid-cols-3'} gap-2`}>
          <div className="rounded-xl border border-stone-800 bg-stone-900 p-2.5">
            <p className="text-[10px] text-stone-400 uppercase">Valor Corte</p>
            <p className="font-mono num-tabular text-sm font-bold text-stone-100">
              {formatBRL(posSplit.totalAmount)}
            </p>
          </div>
          <div className="rounded-xl border border-stone-800 bg-stone-900 p-2.5">
            <p className="text-[10px] text-stone-400 uppercase">Barbeiro (50%)</p>
            <p className="font-mono num-tabular text-sm font-bold text-emerald-700">
              {formatBRL(posSplit.staffNetCommission)}
            </p>
          </div>
          <div
            className={`rounded-xl border border-stone-800 bg-stone-900 p-2.5 ${
              compact ? 'col-span-2' : ''
            }`}
          >
            <p className="text-[10px] text-stone-400 uppercase">Caixa Casa</p>
            <p className="font-mono num-tabular text-sm font-bold text-amber-800">
              {formatBRL(posSplit.salonNetShare)}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-stone-800 bg-stone-900 p-3 space-y-2.5">
          <p className="text-xs font-bold text-stone-100">
            Simular fechamento em 3 passos
          </p>

          <div className="grid grid-cols-3 gap-1.5">
            {[
              { label: 'Corte', price: 45 },
              { label: 'Barba', price: 35 },
              { label: 'Combo', price: 70 },
            ].map((s) => (
              <button
                key={s.label}
                type="button"
                data-compact
                onClick={() => setPosServicePrice(s.price)}
                className={`rounded-lg border px-2 py-1.5 text-center text-[11px] font-bold cursor-pointer ${
                  posServicePrice === s.price
                    ? 'border-amber-500 bg-amber-500 text-stone-950'
                    : 'border-stone-800 bg-tint-50 text-stone-300'
                }`}
              >
                {s.label} · R$ {s.price}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {(
              [
                { id: 'PIX', label: 'Pix (0%)' },
                { id: 'DEBIT_CARD', label: 'Débito' },
                { id: 'CREDIT_CARD', label: 'Crédito' },
              ] as const
            ).map((m) => (
              <button
                key={m.id}
                type="button"
                data-compact
                onClick={() => setPosMethod(m.id)}
                className={`rounded-lg border px-2 py-1.5 text-center text-[11px] font-semibold cursor-pointer ${
                  posMethod === m.id
                    ? 'border-emerald-600 bg-emerald-950 text-emerald-700'
                    : 'border-stone-800 bg-tint-50 text-stone-400'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className="rounded-lg border border-stone-800 bg-tint-50 px-3 py-2 flex items-center justify-between text-[11px]">
            <span className="text-stone-400">
              Taxa maquininha ({posSplit.acquirerFeePct}%)
            </span>
            <span className="font-mono num-tabular font-bold text-stone-200">
              - {formatBRL(posSplit.acquirerFeeAmount)}
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === 'CLIENTS') {
    return (
      <div className="space-y-3 tab-enter">
        <div className="relative">
          <MagnifyingGlass className="h-3.5 w-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={clientSearch}
            onChange={(e) => setClientSearch(e.target.value)}
            placeholder="Buscar cliente fictício..."
            aria-label="Buscar cliente demonstrativo"
            className="w-full rounded-xl border border-stone-800 bg-stone-900 pl-8 pr-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="space-y-2">
          {filteredClients.map((cli) => (
            <div
              key={cli.name}
              className="rounded-xl border border-stone-800 bg-stone-900 p-3 flex items-center justify-between gap-2"
            >
              <div className="min-w-0">
                <p className="text-xs font-bold text-stone-100">{cli.name}</p>
                <p className="text-[11px] text-stone-400 truncate">
                  {cli.visits} visitas ·{' '}
                  {cli.noShows > 0 ? `${cli.noShows} falta` : '0 faltas'} ·{' '}
                  {cli.tag}
                </p>
              </div>
              <div className="text-right shrink-0">
                <span className="block font-mono num-tabular text-xs font-bold text-amber-800">
                  {formatBRL(cli.spent)}
                </span>
                <span className="text-[10px] text-emerald-700 font-semibold">
                  Histórico ativo
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (activeTab === 'PUBLIC_BOOKING') {
    return (
      <div className="space-y-3 tab-enter">
        <div className="rounded-xl border border-stone-800 bg-stone-900 p-3 space-y-2">
          <p className="text-xs font-bold text-stone-100">
            Link de agendamento dos seus clientes
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 rounded-lg border border-stone-800 bg-tint-50 px-2.5 py-2 font-mono text-[11px] text-stone-200 truncate">
              https://prontoagende.com.br/#/reserva/sua-barbearia
            </div>
            <button
              type="button"
              data-compact
              onClick={() => {
                setLinkCopied(true);
                window.setTimeout(() => setLinkCopied(false), 2000);
              }}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-[11px] font-bold text-stone-950 cursor-pointer shrink-0"
            >
              <Copy className="h-3.5 w-3.5" weight="bold" />
              <span>{linkCopied ? 'Copiado!' : 'Copiar link'}</span>
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-stone-800 bg-stone-900 p-3 space-y-2">
          <p className="text-xs font-bold text-stone-100">Antes de divulgar</p>
          {[
            'Pelo menos um serviço cadastrado',
            'Escala de trabalho com horários livres ativa',
            'WhatsApp da barbearia configurado para avisos',
            'Chave Pix opcional configurada para sinal anti-falta',
          ].map((chk) => (
            <div
              key={chk}
              className="flex items-center gap-2 text-[11px] text-stone-300"
            >
              <CheckCircle
                className="h-3.5 w-3.5 shrink-0 text-emerald-700"
                weight="fill"
              />
              <span>{chk}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (activeTab === 'MANAGER') {
    return (
      <div className="space-y-3 tab-enter">
        <div className="rounded-xl border border-stone-800 bg-stone-900 p-3 flex items-center justify-between gap-2">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-stone-400">
              Barbearia configurada
            </p>
            <p className="text-xs font-bold text-stone-100">
              Barbearia Modelo · Centro
            </p>
          </div>
          <span className="rounded-lg bg-amber-950 px-2.5 py-1 font-mono text-[10px] font-bold text-amber-800">
            Sinal Pix 30%
          </span>
        </div>

        <div className="rounded-xl border border-stone-800 bg-stone-900 p-3 space-y-2">
          <p className="text-xs font-bold text-stone-100">
            Tabela de Cortes e Preços
          </p>
          {[
            { name: 'Corte Masculino', min: '40 min', price: 'R$ 45,00' },
            { name: 'Barba Completa', min: '30 min', price: 'R$ 35,00' },
            { name: 'Combo Corte + Barba', min: '60 min', price: 'R$ 70,00' },
          ].map((srv) => (
            <div
              key={srv.name}
              className="flex items-center justify-between rounded-lg border border-stone-800 bg-tint-50 px-2.5 py-1.5 text-[11px]"
            >
              <span className="font-semibold text-stone-200">{srv.name}</span>
              <div className="flex items-center gap-3">
                <span className="font-mono text-stone-400">{srv.min}</span>
                <span className="font-mono num-tabular font-bold text-amber-800">
                  {srv.price}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-stone-800 bg-stone-900 px-3 py-2 flex items-center justify-between text-[11px]">
          <span className="text-stone-300">
            <strong>Rafael</strong> · Ter a Sáb
          </span>
          <span className="font-mono text-stone-400">
            09:00–19:00 (Pausa 12:00–13:00)
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 tab-enter">
      <div className="rounded-xl border border-stone-800 bg-stone-900 p-3 space-y-2">
        <p className="text-xs font-bold text-stone-100">
          Central de Suporte da Barbearia
        </p>
        <p className="text-[11px] text-stone-300 leading-relaxed">
          Abra chamados direto do painel sempre que precisar de ajuda com sua
          agenda, link de reservas ou ajustes.
        </p>
        <div className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-[11px] font-bold text-stone-950">
          <Headset className="h-3.5 w-3.5" weight="bold" />
          <span>Novo chamado</span>
        </div>
      </div>

      <div className="rounded-xl border border-stone-800 bg-stone-900 p-3 flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-bold text-stone-100">
            Cópia dos seus dados (LGPD)
          </p>
          <p className="text-[11px] text-stone-400">
            Baixe clientes, horários e caixa em JSON quando quiser.
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-stone-800 bg-tint-50 px-2.5 py-1.5 text-[11px] font-bold text-stone-200">
          <DownloadSimple className="h-3.5 w-3.5 text-amber-500" weight="bold" />
          <span>Exportar</span>
        </span>
      </div>
    </div>
  );
};

export const LandingCenterStage: React.FC = () => {
  const [device, setDevice] = useState<DeviceMode>('desktop');
  const [activeTab, setActiveTab] = useState<SandboxTab>('AGENDA');

  const currentTabInfo =
    SANDBOX_TABS.find((t) => t.id === activeTab) ?? SANDBOX_TABS[0];

  const handleToggleDevice = (next: DeviceMode) => {
    setDevice(next);
  };

  return (
    <div className="space-y-6">
      {/* Controles superiores do Center Stage */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div
          role="group"
          aria-label="Alternar visualização entre computador e celular"
          className="inline-flex self-start rounded-2xl border border-stone-800 bg-stone-900 p-1 shadow-sm"
        >
          <button
            type="button"
            onClick={() => handleToggleDevice('desktop')}
            aria-pressed={device === 'desktop'}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
              device === 'desktop'
                ? 'bg-amber-500 text-stone-950 shadow-sm'
                : 'text-stone-300 hover:text-stone-100'
            }`}
          >
            <Laptop className="h-4 w-4" weight="bold" />
            <span>Computador</span>
          </button>

          <button
            type="button"
            onClick={() => handleToggleDevice('mobile')}
            aria-pressed={device === 'mobile'}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
              device === 'mobile'
                ? 'bg-amber-500 text-stone-950 shadow-sm'
                : 'text-stone-300 hover:text-stone-100'
            }`}
          >
            <DeviceMobile className="h-4 w-4" weight="bold" />
            <span>Celular</span>
          </button>
        </div>

        <span className="inline-flex items-center gap-2 rounded-full border border-stone-800 bg-stone-900 px-3.5 py-1.5 text-[11px] font-semibold text-stone-300">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span>Ambiente demonstrativo seguro · Clique nas abas internas</span>
        </span>
      </div>

      {/* Palco Center Stage com profundidade de estúdio */}
      <div className="center-stage-backdrop relative rounded-3xl border border-stone-800 p-4 sm:p-8 lg:p-10 shadow-xl overflow-hidden">
        {device === 'desktop' ? (
          <div key="desktop" className="stage-device-enter relative max-w-5xl mx-auto">
            {/* Moldura do Notebook */}
            <div className="rounded-t-3xl border-2 border-stone-700 bg-stone-950 shadow-2xl overflow-hidden">
              {/* Barra do navegador + câmera */}
              <div className="flex items-center justify-between gap-3 border-b border-stone-800 bg-tint-50 px-4 py-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-stone-700" />
                </div>
                <div className="rounded-lg border border-stone-800 bg-stone-900 px-3 py-1 font-mono text-[11px] text-stone-400 truncate max-w-[260px] sm:max-w-sm">
                  prontoagende.com.br/#/app
                </div>
                <span className="font-mono text-[10px] text-stone-400 hidden sm:inline">
                  Tela Desktop
                </span>
              </div>

              {/* Header real do sistema dentro do Notebook */}
              <div className="border-b border-stone-800 bg-stone-950 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-stone-950">
                    <Scissors className="h-4 w-4" weight="bold" />
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-stone-100 leading-none">
                      ProntoAgende
                    </span>
                    <span className="block text-[10px] text-stone-400 mt-0.5">
                      Barbearia Modelo
                    </span>
                  </div>
                </div>

                {/* Abas reais clicáveis do sistema */}
                <nav
                  aria-label="Abas do aplicativo no computador"
                  className="flex flex-wrap items-center gap-1 rounded-xl border border-stone-800 bg-stone-900 p-1"
                >
                  {SANDBOX_TABS.map((tab) => {
                    const active = tab.id === activeTab;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        data-compact
                        onClick={() => setActiveTab(tab.id)}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer ${
                          active
                            ? 'bg-amber-500 text-stone-950 shadow-sm'
                            : 'text-stone-400 hover:text-stone-100'
                        }`}
                      >
                        {tabIcon(tab.id)}
                        <span>{tab.label}</span>
                        {tab.badge && (
                          <span
                            className={`rounded-full px-1.5 text-[10px] font-mono ${
                              active
                                ? 'bg-stone-950/20 text-stone-950 font-bold'
                                : 'bg-amber-500/20 text-amber-800'
                            }`}
                          >
                            {tab.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Corpo da tela selecionada */}
              <div className="p-4 sm:p-5 bg-tint-50/40 min-h-[320px]">
                <AppScreenBody
                  activeTab={activeTab}
                  compact={false}
                  onSelectTab={setActiveTab}
                />
              </div>
            </div>

            {/* Base metálica do Notebook */}
            <div className="mx-auto h-3.5 w-[96%] rounded-b-2xl border-x border-b border-stone-700 bg-tint-100 shadow-md flex justify-center">
              <div className="h-1.5 w-20 rounded-b-md bg-stone-700/60" />
            </div>

            {/* Mini-Celular clicável estilo React Bits Center Stage */}
            <button
              type="button"
              onClick={() => handleToggleDevice('mobile')}
              aria-label="Alternar para visualização completa no celular"
              className="hidden lg:flex flex-col w-48 rounded-[1.8rem] border-2 border-stone-700 bg-stone-950 p-2.5 shadow-2xl absolute -bottom-3 -right-3 hover:border-amber-500 hover:-translate-y-1 transition-all text-left cursor-pointer"
            >
              <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-stone-700" />
              <div className="flex items-center justify-between border-b border-stone-800 pb-1.5">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-stone-100">
                  <Scissors className="h-3 w-3 text-amber-500" weight="bold" />
                  <span>ProntoAgende</span>
                </span>
                <span className="rounded bg-amber-950 px-1.5 py-0.5 text-[9px] font-bold text-amber-800">
                  Mobile
                </span>
              </div>
              <div className="my-2 space-y-1.5">
                <div className="rounded-lg border border-stone-800 bg-tint-50 px-2 py-1.5">
                  <span className="block font-mono text-[9px] font-bold text-amber-800">
                    14:30 · Confirmado
                  </span>
                  <span className="block text-[10px] font-semibold text-stone-100 truncate">
                    Lucas M. · Combo
                  </span>
                </div>
                <div className="rounded-lg bg-amber-500 px-2 py-1 text-center text-[10px] font-bold text-stone-950">
                  Ver tela do celular →
                </div>
              </div>
            </button>
          </div>
        ) : (
          <div
            key="mobile"
            className="stage-device-enter flex flex-col items-center gap-4"
          >
            {/* Moldura fiel do Smartphone */}
            <div className="w-full max-w-[360px] rounded-[2.4rem] border-4 border-stone-700 bg-stone-950 p-2.5 shadow-2xl">
              {/* Ilha superior / barra de status */}
              <div className="flex items-center justify-between px-4 pt-1 pb-2">
                <span className="font-mono text-[11px] font-bold text-stone-300">
                  14:30
                </span>
                <div className="h-3.5 w-20 rounded-full bg-stone-800" />
                <span className="font-mono text-[10px] font-bold text-emerald-700">
                  5G
                </span>
              </div>

              {/* Tela interna do aplicativo mobile */}
              <div className="rounded-[1.75rem] border border-stone-800 bg-stone-950 overflow-hidden flex flex-col">
                {/* Header mobile fixo */}
                <div className="border-b border-stone-800 px-3.5 py-2.5 flex items-center justify-between bg-stone-950">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-stone-950">
                      <Scissors className="h-3.5 w-3.5" weight="bold" />
                    </div>
                    <div className="min-w-0">
                      <span className="block text-xs font-bold text-stone-100 leading-none">
                        ProntoAgende
                      </span>
                      <span className="block text-[10px] text-stone-400 truncate mt-0.5">
                        Barbearia Modelo
                      </span>
                    </div>
                  </div>
                  <span className="rounded-lg border border-stone-800 bg-tint-50 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-800">
                    {currentTabInfo.shortLabel}
                  </span>
                </div>

                {/* Conteúdo rolável da aba mobile */}
                <div className="p-3 bg-tint-50/40 min-h-[340px] max-h-[380px] overflow-y-auto">
                  <AppScreenBody
                    activeTab={activeTab}
                    compact
                    onSelectTab={setActiveTab}
                  />
                </div>

                {/* Barra de navegação inferior mobile real */}
                <nav
                  aria-label="Barra inferior do aplicativo no celular"
                  className="border-t border-stone-800 bg-stone-950 px-1 py-1.5 grid grid-cols-6 gap-0.5"
                >
                  {SANDBOX_TABS.map((tab) => {
                    const active = tab.id === activeTab;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        data-compact
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex flex-col items-center justify-center rounded-lg py-1 px-0.5 text-[9px] font-semibold transition-colors cursor-pointer ${
                          active
                            ? 'bg-amber-500/15 text-amber-800 font-bold'
                            : 'text-stone-400 hover:text-stone-100'
                        }`}
                      >
                        {tabIcon(tab.id)}
                        <span className="mt-0.5 truncate max-w-full">
                          {tab.shortLabel}
                        </span>
                      </button>
                    );
                  })}
                </nav>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleToggleDevice('desktop')}
              className="inline-flex items-center gap-2 rounded-xl border border-stone-800 bg-stone-900 px-4 py-2 text-xs font-bold text-stone-100 hover:border-amber-500 cursor-pointer"
            >
              <Laptop className="h-4 w-4 text-amber-500" weight="bold" />
              <span>Voltar para visão do computador</span>
            </button>
          </div>
        )}
      </div>

      {/* Painel explicativo sincronizado com a aba ativa no dispositivo */}
      <SpotlightCard className="rounded-3xl border border-stone-800 bg-stone-900 p-5 sm:p-6">
        <div
          key={currentTabInfo.id}
          className="tab-enter grid grid-cols-1 lg:grid-cols-12 gap-5 items-center"
        >
          <div className="lg:col-span-6 space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-950 px-3 py-1 font-mono text-[11px] font-bold text-amber-800">
              {tabIcon(currentTabInfo.id)}
              <span>Aba aberta: {currentTabInfo.label}</span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-stone-100">
              {currentTabInfo.title}
            </h3>
            <p className="text-xs sm:text-sm leading-relaxed text-stone-300">
              {currentTabInfo.description}
            </p>
          </div>

          <ul className="lg:col-span-6 space-y-2">
            {currentTabInfo.highlights.map((item) => (
              <li
                key={item}
                className="flex items-start gap-2.5 rounded-xl border border-stone-800 bg-tint-50 px-3.5 py-2.5 text-xs text-stone-200"
              >
                <CheckCircle
                  className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700"
                  weight="fill"
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </SpotlightCard>
    </div>
  );
};
