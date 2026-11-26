/**
 * Configuração central da Landing Page (primeira tela do ProntoAgende BR).
 * Edite aqui o WhatsApp comercial, planos, recursos e perguntas frequentes sem mexer nos componentes.
 */

// Troque pelo WhatsApp comercial oficial com DDI + DDD (apenas dígitos), ex.: '5511953023340'.
// Quando estiver vazio, o CTA direciona para o cadastro direto (#/cadastro).
export const SALES_WHATSAPP_NUMBER = '5511953023340';

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
  highlighted?: boolean;
  /** Preço mensal atual e o preço "de" riscado (null = sob medida). */
  monthly: { price: number; was: number } | null;
  /** Preço do ano inteiro e o valor "de" riscado (mensal x 12). */
  annual: { price: number; was: number } | null;
  customPriceLabel?: string;
  customPeriodLabel?: string;
  features: string[];
  ctaLabel: string;
  ctaHref: string;
  useWhatsappPrimary?: boolean;
}

export const TRIAL_CTA_LABEL = 'Quero testar sem pagar';

export const LANDING_PLANS: LandingPlanItem[] = [
  {
    id: 'solo',
    name: 'Solo / Essencial',
    monthly: { price: 27, was: 37 },
    annual: { price: 287, was: 324 },
    features: [
      '1 barbeiro com agenda própria',
      'Agendamento rápido para cortes',
      'Link para clientes agendarem online',
      'Caixa simples (Pix, cartão e dinheiro), sem papel',
      'Acesso gratuito por sete dias',
    ],
    ctaLabel: 'Garantir minha conta',
    ctaHref: '#/cadastro',
  },
  {
    id: 'barbearia',
    name: 'Barbearia',
    highlighted: true,
    monthly: { price: 57, was: 79 },
    annual: { price: 652, was: 684 },
    features: [
      'Tudo do Solo / Essencial para até 4 barbeiros',
      'Agendas, folgas e horários por barbeiro',
      'Lembretes no WhatsApp para evitar faltas e "bolos"',
      'Comissão e taxa de maquininha automáticas',
      'Sinal via Pix na reserva',
      'Acesso gratuito por sete dias',
    ],
    ctaLabel: 'Garantir minha conta',
    ctaHref: '#/cadastro',
  },
  {
    id: 'estudio',
    name: 'Estúdio & Rede',
    monthly: null,
    annual: null,
    customPriceLabel: 'Sob medida',
    customPeriodLabel: '5+ barbeiros',
    features: [
      'Tudo do plano Barbearia para 5 ou mais barbeiros',
      'Regras personalizadas de equipe e comissão',
      'Apoio no WhatsApp para configurar',
      'Acesso gratuito por sete dias',
    ],
    ctaLabel: 'Falar no WhatsApp',
    ctaHref: buildSalesWhatsAppUrl('Estúdio & Rede'),
    useWhatsappPrimary: true,
  },
];

export interface LandingFaqItem {
  question: string;
  answer: string;
}

export const LANDING_FAQS: LandingFaqItem[] = [
  {
    question: 'Meu cliente precisa baixar algum aplicativo para agendar?',
    answer:
      'Não, de jeito nenhum! O ProntoAgende funciona direto no navegador do celular do seu cliente (como um site). Ele clica no seu link exclusivo, vê os horários livres e agenda em segundos, sem precisar instalar nada na memória do celular. É muito mais prático para ele e não cria barreira para marcar o corte.',
  },
  {
    question: 'Consigo usar tudo pelo celular no dia a dia da barbearia?',
    answer:
      'Sim, 100% focado na correria da cadeira. O sistema foi pensado para usar no celular ou tablet. Você abre a agenda, faz encaixes rápidos, confere o caixa e envia lembretes no WhatsApp com a mesma facilidade de sempre, controlando o negócio na palma da mão sem depender de computador.',
  },
  {
    question: 'Posso configurar dias, intervalo de almoço e folgas por barbeiro?',
    answer:
      'Sim, cada profissional tem a sua própria agenda. Você configura os horários de atendimento, pausas para almoço, dias de folga e os serviços de cada um. O sistema respeita a rotina de cada barbeiro e evita conflitos de horário.',
  },
  {
    question: 'O ProntoAgende cobra comissão por cada corte ou cliente agendado?',
    answer:
      'Não. Você paga apenas uma mensalidade fixa e usa sem limites. Não cobramos taxas por agendamento, comissão sobre os seus cortes nem tarifa por cliente cadastrado. A receita é toda sua.',
  },
  {
    question: 'Como funciona o sinal via Pix para evitar faltas?',
    answer:
      'É uma proteção simples para o seu tempo. Ao agendar pelo link online, o cliente pode pagar um valor de sinal (ex.: R$ 10 ou R$ 20) ou o valor total do corte via Pix. Se ele não comparecer, o sinal compensa o tempo parado; se avisar com antecedência, você pode reagendar para outra data, reduzindo bastante as faltas e os "bolos".',
  },
  {
    question: 'Como funciona o teste gratuito de sete dias?',
    answer:
      'Basta clicar em "Quero testar sem pagar" e criar a sua conta. Você libera o acesso gratuito por sete dias para testar a agenda e o caixa na rotina da barbearia, sem compromisso.',
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
