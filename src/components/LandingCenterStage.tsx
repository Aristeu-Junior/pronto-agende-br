import React, { useMemo, useRef, useState } from 'react';
import {
  BatteryFull,
  Calendar,
  CheckCircle,
  Copy,
  CreditCard,
  Cube,
  DeviceMobile,
  DownloadSimple,
  ArrowSquareOut as ExternalLink,
  Headset,
  Laptop,
  SquaresFour as LayoutDashboard,
  MagnifyingGlass,
  Pause,
  Play,
  Plus,
  Scissors,
  Users,
  WhatsappLogo,
  WifiHigh,
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

const KEYBOARD_ROWS = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5],
  [1.4, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.1],
  [1.7, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.8],
  [2.1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.2],
  [1, 1, 1, 1.3, 5.2, 1.3, 1, 1, 1, 1],
] as const;

const MacBookKeyboardDeck: React.FC = () => (
  <div aria-hidden="true" className="macbook-deck-slot select-none">
    <div className="macbook-deck px-4 pt-3 pb-2 flex flex-col justify-between">
      <div className="flex items-stretch gap-2.5 sm:gap-3.5 px-1">
        {/* Grade de alto-falante esquerda */}
        <div className="macbook-speaker-grille w-4 sm:w-8 rounded-md opacity-75 shrink-0" />

        {/* Conjunto de teclas pretas chiclet */}
        <div className="macbook-keyboard-well flex-1 rounded-md p-1.5 sm:p-2 space-y-1">
          {KEYBOARD_ROWS.map((row, rIdx) => (
            <div key={rIdx} className="flex gap-1">
              {row.map((grow, kIdx) => (
                <div
                  key={kIdx}
                  style={{ flexGrow: grow }}
                  className="macbook-key h-2.5 sm:h-3.5 rounded-[2px]"
                />
              ))}
            </div>
          ))}
        </div>

        {/* Grade de alto-falante direita */}
        <div className="macbook-speaker-grille w-4 sm:w-8 rounded-md opacity-75 shrink-0" />
      </div>

      {/* Trackpad central em vidro alumínio */}
      <div className="macbook-trackpad mx-auto w-[44%] h-[54px] sm:h-[78px] rounded-lg" />

      {/* Borda frontal 3D com recorte de abertura */}
      <div className="macbook-front-lip flex justify-center">
        <div className="macbook-thumb-notch h-1.5 w-14 sm:w-20 rounded-b-md" />
      </div>
    </div>
  </div>
);

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
  const [angle3d, setAngle3d] = useState<boolean>(true);
  const [motionPaused, setMotionPaused] = useState<boolean>(() => {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      return false;
    }
  });

  const rigRef = useRef<HTMLDivElement | null>(null);

  const currentTabInfo =
    SANDBOX_TABS.find((t) => t.id === activeTab) ?? SANDBOX_TABS[0];

  const handleStageMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (motionPaused || !angle3d) return;
    const rig = rigRef.current;
    if (!rig) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    rig.style.setProperty('--tilt-x', `${(-ny * 6).toFixed(2)}deg`);
    rig.style.setProperty('--tilt-y', `${(nx * 9).toFixed(2)}deg`);
  };

  const handleStageMouseLeave = () => {
    const rig = rigRef.current;
    if (!rig) return;
    rig.style.setProperty('--tilt-x', '0deg');
    rig.style.setProperty('--tilt-y', '0deg');
  };

  const handleToggleDevice = (next: DeviceMode) => {
    setDevice(next);
    handleStageMouseLeave();
  };

  return (
    <div className="space-y-6">
      {/* Controles superiores do Center Stage 3D */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="group"
          aria-label="Alternar modelo 3D entre computador e celular"
          className="inline-flex rounded-2xl border border-stone-800 bg-stone-900 p-1 shadow-sm"
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
            <span>MacBook 3D</span>
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
            <span>iPhone 3D</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setAngle3d((v) => !v)}
            aria-pressed={angle3d}
            className="inline-flex items-center gap-1.5 rounded-xl border border-stone-800 bg-stone-900 px-3 py-2 text-xs font-semibold text-stone-200 hover:border-amber-500 cursor-pointer"
          >
            <Cube className="h-4 w-4 text-amber-500" weight="bold" />
            <span>{angle3d ? 'Ângulo Frontal' : 'Ângulo 3D'}</span>
          </button>

          <button
            type="button"
            onClick={() => setMotionPaused((p) => !p)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-stone-800 bg-stone-900 px-3 py-2 text-xs font-semibold text-stone-200 hover:border-amber-500 cursor-pointer"
          >
            {motionPaused ? (
              <>
                <Play className="h-4 w-4 text-amber-500" weight="fill" />
                <span>Retomar 3D</span>
              </>
            ) : (
              <>
                <Pause className="h-4 w-4 text-amber-500" weight="fill" />
                <span>Pausar 3D</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Palco Center Stage 3D */}
      <div
        onMouseMove={handleStageMouseMove}
        onMouseLeave={handleStageMouseLeave}
        className={`relative rounded-3xl border border-stone-800 px-4 py-8 sm:px-8 sm:py-12 lg:px-10 lg:py-14 shadow-xl overflow-hidden transition-colors duration-300 ${
          device === 'desktop' ? 'stage-macbook-studio' : 'stage-iphone-studio'
        }`}
      >
        <div className="stage-3d-scene">
          <div
            ref={rigRef}
            className="stage-3d-rig"
            style={{
              transform: angle3d
                ? 'rotateX(var(--tilt-x, 0deg)) rotateY(var(--tilt-y, 0deg))'
                : 'none',
            }}
          >
            {device === 'desktop' ? (
              <div
                key="desktop-3d"
                className="stage-device-enter relative max-w-[780px] mx-auto"
              >
                <div
                  className={`macbook-3d-assembly mx-auto w-[94%] sm:w-[90%] ${
                    angle3d
                      ? motionPaused
                        ? 'is-orbiting motion-paused'
                        : 'is-orbiting'
                      : 'is-flat'
                  }`}
                >
                  {/* Tampa e Tela do MacBook Pro com Notch */}
                  <div className="macbook-lid rounded-t-2xl p-[2px]">
                    <div className="macbook-bezel rounded-t-[14px] p-2 sm:p-3 pt-2.5 sm:pt-3 relative">
                      {/* Notch superior central do MacBook Pro */}
                      <div className="macbook-notch mx-auto mb-1.5 sm:mb-2 h-3.5 sm:h-4 w-20 sm:w-28 flex items-center justify-center">
                        <span className="h-1.5 w-1.5 rounded-full bg-zinc-700 ring-1 ring-zinc-600" />
                      </div>

                      {/* Tela real do ProntoAgende BR */}
                      <div className="rounded-lg bg-stone-950 overflow-hidden border border-white/10 shadow-inner">
                        {/* Barra do navegador */}
                        <div className="flex items-center justify-between gap-3 border-b border-stone-800 bg-tint-50 px-3 py-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-amber-500/80" />
                            <span className="h-2 w-2 rounded-full bg-emerald-500/80" />
                            <span className="h-2 w-2 rounded-full bg-stone-700" />
                          </div>
                          <div className="rounded-md border border-stone-800 bg-stone-900 px-2.5 py-0.5 font-mono text-[10px] text-stone-400 truncate max-w-[210px] sm:max-w-xs">
                            prontoagende.com.br/#/app
                          </div>
                          <span className="font-mono text-[10px] text-stone-400 hidden sm:inline">
                            Desktop
                          </span>
                        </div>

                        {/* Cabeçalho real do aplicativo */}
                        <div className="border-b border-stone-800 bg-stone-950 px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500 text-stone-950">
                              <Scissors className="h-3.5 w-3.5" weight="bold" />
                            </div>
                            <div>
                              <span className="block text-[11px] font-bold text-stone-100 leading-none">
                                ProntoAgende
                              </span>
                              <span className="block text-[9px] text-stone-400 mt-0.5">
                                Barbearia Modelo
                              </span>
                            </div>
                          </div>

                          <nav
                            aria-label="Abas do aplicativo no MacBook 3D"
                            className="flex flex-wrap items-center gap-1 rounded-xl border border-stone-800 bg-stone-900 p-0.5"
                          >
                            {SANDBOX_TABS.map((tab) => {
                              const active = tab.id === activeTab;
                              return (
                                <button
                                  key={tab.id}
                                  type="button"
                                  data-compact
                                  onClick={() => setActiveTab(tab.id)}
                                  className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold transition-all cursor-pointer ${
                                    active
                                      ? 'bg-amber-500 text-stone-950 shadow-sm'
                                      : 'text-stone-400 hover:text-stone-100'
                                  }`}
                                >
                                  {tabIcon(tab.id)}
                                  <span>{tab.label}</span>
                                  {tab.badge && (
                                    <span
                                      className={`rounded-full px-1 text-[9px] font-mono ${
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

                        {/* Área interativa da aba aberta */}
                        <div className="p-3 sm:p-4 bg-tint-50/40 min-h-[260px] sm:min-h-[290px]">
                          <AppScreenBody
                            activeTab={activeTab}
                            compact={false}
                            onSelectTab={setActiveTab}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Dobradiça inferior */}
                    <div className="macbook-hinge mx-auto w-[90%] rounded-b-sm" />
                  </div>

                  {/* Corpo inferior 3D: Teclado preto + Grades de Som + Trackpad prateado */}
                  <MacBookKeyboardDeck />
                </div>

                {/* Sombra difusa no piso do estúdio */}
                <div
                  aria-hidden="true"
                  className="macbook-floor-shadow mx-auto -mt-2 h-7 w-[92%] rounded-full"
                />

                {/* Botão rápido para alternar para iPhone 3D */}
                <div className="mt-4 flex justify-center lg:justify-end">
                  <button
                    type="button"
                    onClick={() => handleToggleDevice('mobile')}
                    className="inline-flex items-center gap-2 rounded-xl border border-stone-800 bg-stone-900 px-3.5 py-2 text-xs font-bold text-stone-100 shadow-md hover:border-amber-500 cursor-pointer"
                  >
                    <DeviceMobile className="h-4 w-4 text-amber-500" weight="bold" />
                    <span>Ver no iPhone 3D →</span>
                  </button>
                </div>
              </div>
            ) : (
              <div
                key="mobile-3d"
                className="stage-device-enter flex flex-col items-center gap-5"
              >
                <div
                  className={`iphone-3d-assembly ${
                    angle3d
                      ? motionPaused
                        ? 'is-orbiting motion-paused'
                        : 'is-orbiting'
                      : 'is-flat'
                  }`}
                >
                  <div className="iphone-3d-chassis w-[308px] sm:w-[336px]">
                    {/* Profundidade lateral 3D em titânio + botões físicos */}
                    <div aria-hidden="true" className="iphone-depth-left flex flex-col gap-2 pt-10 items-center">
                      <span className="h-4 w-1 rounded-full bg-zinc-400/70" />
                      <span className="h-7 w-1 rounded-full bg-zinc-400/70" />
                      <span className="h-7 w-1 rounded-full bg-zinc-400/70" />
                    </div>
                    <div aria-hidden="true" className="iphone-depth-right flex flex-col pt-16 items-center">
                      <span className="h-10 w-1 rounded-full bg-zinc-400/70" />
                    </div>

                    {/* Tela interna com cantos arredondados e Dynamic Island */}
                    <div className="iphone-screen-glass relative bg-stone-950 overflow-hidden flex flex-col">
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 z-20 bg-gradient-to-tr from-transparent via-white/[0.03] to-white/[0.08]"
                      />
                      {/* Barra de status iOS com Dynamic Island */}
                      <div className="bg-zinc-950 px-5 pt-2.5 pb-2 flex items-center justify-between text-white">
                        <span className="font-mono text-[11px] font-bold">
                          9:41
                        </span>
                        <div className="iphone-dynamic-island flex items-center justify-end pr-2">
                          <span className="h-2 w-2 rounded-full bg-zinc-800 ring-1 ring-zinc-700" />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <WifiHigh className="h-3.5 w-3.5" weight="bold" />
                          <BatteryFull className="h-4 w-4" weight="fill" />
                        </div>
                      </div>

                      {/* Header mobile do ProntoAgende */}
                      <div className="border-b border-stone-800 px-3.5 py-2 flex items-center justify-between bg-stone-950">
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

                      {/* Corpo rolável da aba ativa */}
                      <div className="p-3 bg-tint-50/40 min-h-[325px] max-h-[355px] overflow-y-auto">
                        <AppScreenBody
                          activeTab={activeTab}
                          compact
                          onSelectTab={setActiveTab}
                        />
                      </div>

                      {/* Barra inferior mobile real com as 6 abas */}
                      <nav
                        aria-label="Barra inferior do aplicativo no iPhone 3D"
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

                      {/* Home indicator iOS */}
                      <div className="bg-stone-950 pb-1.5 pt-0.5 flex justify-center">
                        <div className="h-1 w-24 rounded-full bg-stone-700" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sombra dramática de estúdio escuro */}
                <div
                  aria-hidden="true"
                  className="iphone-floor-shadow -mt-1 h-5 w-60 rounded-full"
                />

                <button
                  type="button"
                  onClick={() => handleToggleDevice('desktop')}
                  className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-xs font-bold text-white hover:border-amber-500 cursor-pointer"
                >
                  <Laptop className="h-4 w-4 text-amber-500" weight="bold" />
                  <span>Voltar para MacBook 3D</span>
                </button>
              </div>
            )}
          </div>
        </div>
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
