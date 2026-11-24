/**
 * Configuração central da Landing Page (primeira tela do ProntoAgende BR).
 * Edite aqui o WhatsApp comercial, planos, recursos e perguntas frequentes sem mexer nos componentes.
 */

// Troque pelo WhatsApp comercial oficial com DDI + DDD (apenas dígitos), ex.: '5511999999999'.
// Quando estiver vazio, o CTA direciona para o cadastro direto (#/cadastro).
export const SALES_WHATSAPP_NUMBER = '5511999999999';

export type BillingCycle = 'monthly' | 'annual';

export function buildSalesWhatsAppUrl(
  planName?: string,
  billingCycle?: BillingCycle
): string {
  const digits = SALES_WHATSAPP_NUMBER.replace(/\D/g, '');
  if (digits.length < 10) return '#/cadastro';
  const cycleText =
    billingCycle === 'annual'
      ? ' (ciclo anual)'
      : billingCycle === 'monthly'
      ? ' (ciclo mensal)'
      : '';
  const msg = planName
    ? `Olá! Vi o site do ProntoAgende BR e quero contratar / saber mais sobre o plano ${planName}${cycleText}.`
    : 'Olá! Vi o site do ProntoAgende BR e gostaria de contratar o sistema para o meu negócio.';
  return `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`;
}

export type LandingFeatureId = 'agenda' | 'link' | 'caixa' | 'whatsapp' | 'seguranca';

export interface LandingFeatureItem {
  id: LandingFeatureId;
  tabLabel: string;
  badge: string;
  title: string;
  description: string;
  bullets: string[];
  highlightMetric: string;
  highlightLabel: string;
}

export const LANDING_FEATURES: LandingFeatureItem[] = [
  {
    id: 'agenda',
    tabLabel: 'Agenda & Encaixes',
    badge: 'Operação em tempo real',
    title: 'Agenda por profissional com encaixe em 2 toques',
    description:
      'Visualize o dia inteiro por cadeira ou barbeiro, filtre por status e registre clientes de balcão (walk-in) na hora sem travar o atendimento.',
    bullets: [
      'Bloqueio automático no servidor contra dois clientes no mesmo horário',
      'Controle de expediente, intervalo de almoço e dias de folga por profissional',
      'Edição rápida de horário, serviço, preço na hora e anotações do corte',
    ],
    highlightMetric: '0 conflitos',
    highlightLabel: 'Proteção no_overlap no banco de dados',
  },
  {
    id: 'link',
    tabLabel: 'Link 24h do Cliente',
    badge: 'Sem baixar aplicativo',
    title: 'Seu link exclusivo para o cliente agendar sozinho',
    description:
      'Coloque seu endereço personalizado na bio do Instagram e envie no WhatsApp. O cliente vê só os horários livres reais e agenda em segundos.',
    bullets: [
      'Sem login, sem senha e sem aplicativo pesado para o cliente instalar',
      'Suporte opcional a sinal antecipado via Pix com código Copia e Cola pronto',
      'Os horários caem direto na sua Agenda e o cliente entra na sua lista',
    ],
    highlightMetric: '20 seg',
    highlightLabel: 'Tempo médio para o cliente reservar',
  },
  {
    id: 'caixa',
    tabLabel: 'Caixa & Salão Parceiro',
    badge: 'Fechamento transparente',
    title: 'PDV direto ao ponto com cálculo de comissão',
    description:
      'Feche o atendimento em 3 passos simples e saiba na hora quanto entrou em Pix, cartão ou dinheiro, quanto é da barbearia e quanto vai para cada profissional.',
    bullets: [
      'Regra configurável para taxa de maquininha (proporcional, casa ou profissional)',
      'Suporte a serviços, pacotes, gorjeta, desconto e comprovante anexado',
      'Conciliação diária de caixa e registro de extratos bancários em um só lugar',
    ],
    highlightMetric: '3 passos',
    highlightLabel: 'Do corte fechado ao repasse calculado',
  },
  {
    id: 'whatsapp',
    tabLabel: 'Lembretes WhatsApp',
    badge: 'Anti-falta (No-Show)',
    title: 'Confirmação e lembretes com 1 clique no WhatsApp',
    description:
      'Reduza cadeiras vazias avisando seus clientes antes do horário com mensagens prontas e personalizadas com nome, hora, serviço e barbeiro.',
    bullets: [
      'Modelos editáveis com preenchimento automático dos dados do agendamento',
      'Controle de histórico de faltas na ficha do cliente para pedir sinal se precisar',
      'Cliente também pode avisar no WhatsApp logo após reservar pelo link público',
    ],
    highlightMetric: '-68% faltas',
    highlightLabel: 'Com confirmação + sinal Pix opcional',
  },
  {
    id: 'seguranca',
    tabLabel: 'Segurança & Suporte',
    badge: 'Proteção de dados',
    title: 'Dados blindados, isolados por negócio e conforme LGPD',
    description:
      'Cada barbearia enxerga apenas a própria operação. O link público nunca expõe nomes ou telefones de outros clientes e sua conta tem dupla proteção.',
    bullets: [
      'Autenticação em duas etapas (MFA) e verificação antibot no acesso',
      'Cópia completa dos seus dados em JSON e central de chamados integrada',
      'Infraestrutura hospedada em servidores em São Paulo (baixa latência)',
    ],
    highlightMetric: '100% seu',
    highlightLabel: 'Seus clientes e dados pertencem a você',
  },
];

export interface LandingPlanItem {
  id: string;
  name: string;
  badge?: string;
  priceMonthlyValue: number | null;
  priceAnnualMonthlyValue: number | null;
  annualSavingsLabel?: string;
  priceMonthly: string;
  periodLabel: string;
  description: string;
  highlighted?: boolean;
  features: string[];
  ctaLabel: string;
  ctaHref: string;
  useWhatsappPrimary?: boolean;
}

export const LANDING_PLANS: LandingPlanItem[] = [
  {
    id: 'essencial',
    name: 'Autônomo / Essencial',
    priceMonthlyValue: 49,
    priceAnnualMonthlyValue: 39,
    annualSavingsLabel: 'Economize R$ 120/ano',
    priceMonthly: 'R$ 49',
    periodLabel: '/mês',
    description:
      'Ideal para quem trabalha sozinho e quer sair do caderno ou WhatsApp manual.',
    features: [
      '1 profissional (cadeira) com escala própria',
      'Agenda ilimitada + encaixes rápidos',
      'Link exclusivo de agendamento online 24h',
      'Caixa / PDV simples com Pix, cartão e dinheiro',
      'Base de clientes e disparo rápido no WhatsApp',
    ],
    ctaLabel: 'Começar no Essencial',
    ctaHref: '#/cadastro',
  },
  {
    id: 'profissional',
    name: 'Barbearia Pro',
    badge: 'Mais escolhido',
    priceMonthlyValue: 89,
    priceAnnualMonthlyValue: 71,
    annualSavingsLabel: 'Economize R$ 216/ano',
    priceMonthly: 'R$ 89',
    periodLabel: '/mês',
    description:
      'Tudo liberado para barbearias, salões e clínicas com equipe e comissões.',
    highlighted: true,
    features: [
      'Até 5 profissionais com horários e folgas individuais',
      'Cálculo automático de comissão e taxa de maquininha',
      'Sinal Pix anti-falta com Copia e Cola na reserva',
      'Central de lembretes no WhatsApp + alerta de faltas',
      'Extratos bancários, relatório financeiro e suporte prioritário',
    ],
    ctaLabel: 'Contratar Barbearia Pro',
    ctaHref: '#/cadastro',
  },
  {
    id: 'equipe',
    name: 'Estúdio & Rede',
    priceMonthlyValue: null,
    priceAnnualMonthlyValue: null,
    priceMonthly: 'Sob medida',
    periodLabel: 'equipe 6+',
    description:
      'Para operações maiores que precisam de implantação assistida e múltiplos profissionais.',
    features: [
      'Profissionais e serviços ilimitados',
      'Configuração inicial assistida com sua equipe',
      'Regras personalizadas de comissão e auxiliares',
      'Acompanhamento dedicado via WhatsApp',
      'Zero comissão por agendamento de clientes seus',
    ],
    ctaLabel: 'Falar no WhatsApp',
    ctaHref: buildSalesWhatsAppUrl('Estúdio & Rede'),
    useWhatsappPrimary: true,
  },
];

export const INCLUDED_IN_ALL_PLANS: string[] = [
  '0% comissão por atendimento',
  'Sem fidelidade ou multa',
  'Ativação assistida no mesmo dia',
  'Backup e exportação LGPD em JSON',
];

export type LandingFaqCategory = 'AGENDAMENTO' | 'FINANCEIRO' | 'SEGURANCA';

export interface LandingFaqItem {
  category: LandingFaqCategory;
  question: string;
  answer: string;
}

export const LANDING_FAQ_CATEGORIES: Array<{
  id: 'ALL' | LandingFaqCategory;
  label: string;
}> = [
  { id: 'ALL', label: 'Todas' },
  { id: 'AGENDAMENTO', label: 'Agendamento & Link' },
  { id: 'FINANCEIRO', label: 'Financeiro & Pix' },
  { id: 'SEGURANCA', label: 'Contratação & Segurança' },
];

export const LANDING_FAQS: LandingFaqItem[] = [
  {
    category: 'AGENDAMENTO',
    question: 'Meu cliente precisa baixar algum aplicativo para agendar?',
    answer:
      'Não. Você envia o link da sua barbearia no WhatsApp ou coloca na bio do Instagram. O cliente abre direto no navegador do celular, escolhe o serviço, o profissional e o horário livre em menos de 20 segundos.',
  },
  {
    category: 'AGENDAMENTO',
    question: 'Consigo usar tudo pelo celular no dia a dia da barbearia?',
    answer:
      'Sim. Toda a interface foi desenhada pensando em quem atende com o celular na mão: botões simétricos, filtros recolhíveis, modo claro ou escuro para ambientes com muita luz e barra de atalhos rápida no rodapé.',
  },
  {
    category: 'AGENDAMENTO',
    question: 'Posso configurar dias, intervalo de almoço e folgas por barbeiro?',
    answer:
      'Sim. Cada profissional tem sua própria escala semanal e datas de folga/bloqueio. O link público e o servidor revalidam esses horários automaticamente para nunca aceitar reserva fora do expediente ou no horário de almoço.',
  },
  {
    category: 'FINANCEIRO',
    question: 'O ProntoAgende cobra comissão por cada corte ou cliente agendado?',
    answer:
      'Não cobramos comissão por atendimento nem tomamos seus clientes para uma vitrine de concorrentes. O link é da sua marca e o valor pago pelo cliente vai direto para você.',
  },
  {
    category: 'FINANCEIRO',
    question: 'Como funciona o sinal via Pix para evitar faltas?',
    answer:
      'Você cadastra sua chave Pix e escolhe o percentual de sinal (por exemplo, 30%) nos Ajustes. Se ativar essa opção, o sistema gera o código Pix Copia e Cola no momento da reserva e você confirma o recebimento direto na agenda após conferir no seu banco.',
  },
  {
    category: 'FINANCEIRO',
    question: 'Como funciona o cálculo de comissão (Lei do Salão Parceiro)?',
    answer:
      'No Caixa / PDV você escolhe se a taxa da maquininha (débito ou crédito) é dividida proporcionalmente, descontada do profissional ou absorvida pelo estabelecimento. O sistema mostra na hora quanto fica líquido para o barbeiro e quanto vai para o caixa da casa.',
  },
  {
    category: 'SEGURANCA',
    question: 'Como funciona a contratação e tem multa se eu quiser cancelar?',
    answer:
      'Não há multa nem fidelidade. Você cria sua conta pelo botão "Contratar" ou chama nossa equipe no WhatsApp; após a ativação, você já configura sua tabela de serviços no mesmo dia e pode encerrar ou exportar seus dados quando quiser.',
  },
  {
    category: 'SEGURANCA',
    question: 'Os dados da minha barbearia e dos meus clientes ficam protegidos?',
    answer:
      'Sim. Cada barbearia tem acesso isolado no banco de dados (Row Level Security), a página pública de reserva não expõe nome nem telefone de outros clientes e sua conta conta com verificação antibot e autenticação em duas etapas (MFA) opcional, conforme a LGPD.',
  },
];

export const LANDING_STEPS = [
  {
    number: '01',
    title: 'Crie sua conta e cadastre serviços',
    description:
      'Informe o nome da sua barbearia, defina os preços dos cortes, duração e os dias e horários que cada profissional atende.',
  },
  {
    number: '02',
    title: 'Divulgue seu link próprio 24h',
    description:
      'Copie seu endereço exclusivo (#/reserva/sua-barbearia) com um toque e coloque no Instagram e nas respostas automáticas do WhatsApp.',
  },
  {
    number: '03',
    title: 'Atenda sem conflito e feche o caixa',
    description:
      'Receba as reservas direto na Agenda, envie lembretes no WhatsApp antes do horário e feche os atendimentos já calculando as comissões.',
  },
];
