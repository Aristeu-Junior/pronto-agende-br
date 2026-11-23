import type { TourStep } from '../components/GuidedTour';
import { SUPPORT_ENABLED } from './features';

export type TourTab = 'AGENDA' | 'POS' | 'CLIENTS' | 'PUBLIC_BOOKING' | 'MANAGER' | 'SUPPORT';

const SECTION_BY_TAB: Partial<Record<TourTab, string>> = {
  AGENDA: 'Agenda',
  POS: 'Caixa',
  CLIENTS: 'Clientes',
  PUBLIC_BOOKING: 'Link de Reserva',
  MANAGER: 'Ajustes',
  SUPPORT: 'Suporte',
};

/**
 * Tutorial inicial (obrigatório na primeira entrada): só apresenta cada aba
 * e o botão Tutorial, que explica a aba aberta campo por campo.
 */
export function buildIntroSteps(go: (tab: TourTab) => void): TourStep[] {
  const on = (tab: TourTab) => () => go(tab);
  const steps: TourStep[] = [
    {
      title: 'Bem-vindo ao ProntoAgende',
      body: 'Em poucos passos você conhece cada aba do sistema. Use Próximo para avançar, Voltar para rever, ou Pular tutorial se preferir.',
      onEnter: on('AGENDA'),
    },
    {
      section: 'Abas',
      target: 'nav-AGENDA',
      title: 'Agenda',
      body: 'Onde você passa o dia: horários marcados, horários livres, calendário e novos agendamentos.',
      onEnter: on('AGENDA'),
    },
    {
      section: 'Abas',
      target: 'nav-POS',
      title: 'Caixa',
      body: 'Registre cada atendimento pago e veja quanto entrou no dia, com Pix, cartão, dinheiro e comissão dos barbeiros.',
      onEnter: on('POS'),
    },
    {
      section: 'Abas',
      target: 'nav-CLIENTS',
      title: 'Clientes',
      body: 'Sua lista de clientes, com visitas, faltas, preferências e atalho para o WhatsApp.',
      onEnter: on('CLIENTS'),
    },
    {
      section: 'Abas',
      target: 'nav-PUBLIC_BOOKING',
      title: 'Link de Reserva',
      body: 'O link que o cliente usa para marcar horário sozinho. Copie e mande no WhatsApp ou ponha no Instagram.',
      onEnter: on('PUBLIC_BOOKING'),
    },
    {
      section: 'Abas',
      target: 'nav-MANAGER',
      title: 'Ajustes',
      body: 'Configure a barbearia: dados, serviços e preços, barbeiros, comissão, escala de trabalho e sinal Pix.',
      onEnter: on('MANAGER'),
    },
    {
      section: 'Abas',
      target: 'nav-SUPPORT',
      title: 'Suporte',
      body: 'Fale com a equipe do ProntoAgende: sugestões, problemas, dúvidas e cópia dos seus dados.',
      onEnter: on('SUPPORT'),
    },
    {
      section: 'Dica final',
      target: 'help',
      title: 'Botão Tutorial',
      body: 'Em qualquer aba, toque em Tutorial no topo e o sistema explica aquela aba inteira, campo por campo. No celular aparece só o ícone de interrogação.',
      onEnter: on('AGENDA'),
    },
  ];
  return SUPPORT_ENABLED ? steps : steps.filter((st) => st.target !== 'nav-SUPPORT');
}

/** Tutorial detalhado da aba aberta (sem obrigatoriedade). Vazio se a aba não tem tutorial. */
export function buildPageSteps(tab: string, go: (tab: TourTab) => void): TourStep[] {
  const section = SECTION_BY_TAB[tab as TourTab];
  if (!section) return [];
  return allPageSteps(go).filter((st) => st.section === section);
}

function allPageSteps(go: (tab: TourTab) => void): TourStep[] {
  const on = (tab: TourTab) => () => go(tab);

  const steps: TourStep[] = [

    // ---------- Agenda ----------
    {
      section: 'Agenda',
      target: 'nav-AGENDA',
      title: 'Agenda',
      body: 'É aqui que você passa o dia. Mostra os horários marcados, os livres e quem está para chegar. Veja as partes principais dela nos próximos passos.',
      onEnter: on('AGENDA'),
    },
    {
      section: 'Agenda',
      target: 'agenda-new',
      title: 'Novo agendamento',
      body: 'Marque um horário para um cliente: escolha o serviço, o barbeiro, o dia e o horário. Um horário ocupado some da lista de livres.',
      onEnter: on('AGENDA'),
    },
    {
      section: 'Agenda',
      target: 'agenda-reminders',
      title: 'Lembretes no WhatsApp',
      body: 'Abre a lista de mensagens de lembrete para quem tem horário marcado. Lembrar o cliente diminui as faltas.',
      onEnter: on('AGENDA'),
    },
    {
      section: 'Agenda',
      target: 'agenda-filters',
      title: 'Filtros',
      body: 'Veja só os horários de um barbeiro, filtre por situação (confirmado, aguardando, concluído, faltou) ou busque um cliente pelo nome.',
      onEnter: on('AGENDA'),
    },
    {
      section: 'Agenda',
      target: 'agenda-calendar',
      title: 'Calendário',
      body: 'Escolha o dia que quer ver. Os pontinhos marcam os dias com agendamento. Dias de folga ficam sombreados.',
      onEnter: on('AGENDA'),
    },
    {
      section: 'Agenda',
      target: 'agenda-day',
      title: 'O dia escolhido',
      body: 'Abaixo da data aparecem os horários livres de cada barbeiro. Toque em um horário livre para agendar direto, ou marque a folga do dia.',
      onEnter: on('AGENDA'),
    },
    {
      section: 'Agenda',
      target: 'agenda-list',
      title: 'Lista de agendamentos',
      body: 'Cada cartão é um cliente do dia. Toque nele para editar, remarcar, mudar a situação, chamar no WhatsApp ou receber no Caixa.',
      onEnter: on('AGENDA'),
    },

    // ---------- Caixa ----------
    {
      section: 'Caixa',
      target: 'nav-POS',
      title: 'Caixa',
      body: 'Aqui você registra cada atendimento pago e acompanha quanto entrou no dia.',
      onEnter: on('POS'),
    },
    {
      section: 'Caixa',
      target: 'caixa-summary',
      title: 'Quanto entrou hoje',
      body: 'O número grande é o total recebido no dia. Toque em Ver detalhes para separar por Pix, cartão e dinheiro, e ver a comissão dos barbeiros e o que fica na barbearia.',
      onEnter: on('POS'),
    },
    {
      section: 'Caixa',
      target: 'caixa-step1',
      title: 'Passo 1: quem foi atendido',
      body: 'Escolha o cliente e o barbeiro que fez o serviço. Se o cliente estava agendado hoje, ele aparece para você tocar e preencher tudo de uma vez.',
      onEnter: on('POS'),
    },
    {
      section: 'Caixa',
      target: 'caixa-step2',
      title: 'Passo 2: serviço e valor',
      body: 'Marque o serviço feito. O valor sugerido vem do preço cadastrado, mas você pode mudar na hora. Desconto e comprovante ficam em "opcional".',
      onEnter: on('POS'),
    },
    {
      section: 'Caixa',
      target: 'caixa-step3',
      title: 'Passo 3: como o cliente pagou',
      body: 'Pix, débito, crédito ou dinheiro. O sistema desconta a taxa da maquininha sozinho quando for cartão.',
      onEnter: on('POS'),
    },
    {
      section: 'Caixa',
      target: 'caixa-split',
      title: 'Para onde vai o dinheiro',
      body: 'Esta linha mostra quanto fica com o barbeiro e quanto fica com a barbearia. Toque nela para ver a conta completa.',
      onEnter: on('POS'),
    },
    {
      section: 'Caixa',
      target: 'caixa-confirm',
      title: 'Confirmar recebimento',
      body: 'Depois de conferir, confirme. O valor entra no total do dia e o lançamento vai para a lista de recebimentos.',
      onEnter: on('POS'),
    },
    {
      section: 'Caixa',
      target: 'caixa-extrato',
      title: 'Recebimentos de hoje',
      body: 'Abra esta lista para ver cada lançamento do dia, com forma de pagamento e comissão. Dá para excluir um lançamento feito por engano.',
      onEnter: on('POS'),
    },

    // ---------- Clientes ----------
    {
      section: 'Clientes',
      target: 'nav-CLIENTS',
      title: 'Clientes',
      body: 'Sua lista de clientes, com o histórico de cada um.',
      onEnter: on('CLIENTS'),
    },
    {
      section: 'Clientes',
      target: 'clients-search',
      title: 'Buscar cliente',
      body: 'Procure por nome, WhatsApp ou CPF.',
      onEnter: on('CLIENTS'),
    },
    {
      section: 'Clientes',
      target: 'clients-new',
      title: 'Cadastrar cliente',
      body: 'Adicione um cliente novo com nome e WhatsApp. Quem agenda pelo seu link entra na lista sozinho.',
      onEnter: on('CLIENTS'),
    },
    {
      section: 'Clientes',
      target: 'clients-list',
      title: 'A lista',
      body: 'Mostra visitas e faltas de cada cliente. Toque em um nome para abrir a ficha, editar os dados, anotar preferências ou chamar no WhatsApp. Enquanto não houver clientes, aparece aqui o atalho para cadastrar o primeiro.',
      onEnter: on('CLIENTS'),
    },

    // ---------- Link de reserva ----------
    {
      section: 'Link de Reserva',
      target: 'nav-PUBLIC_BOOKING',
      title: 'Link de Reserva',
      body: 'É a página que seu cliente usa para marcar horário sozinho, sem precisar de login.',
      onEnter: on('PUBLIC_BOOKING'),
    },
    {
      section: 'Link de Reserva',
      target: 'share-link',
      title: 'Seu link',
      body: 'Copie o link e mande no WhatsApp ou coloque na bio do Instagram. O cliente escolhe serviço, dia e horário livre, e a reserva cai direto na sua Agenda.',
      onEnter: on('PUBLIC_BOOKING'),
    },
    {
      section: 'Link de Reserva',
      target: 'share-checklist',
      title: 'Antes de divulgar',
      body: 'Uma lista rápida do que precisa estar pronto: serviço cadastrado, escala de trabalho e WhatsApp da barbearia. Os itens que faltam levam você a Ajustes.',
      onEnter: on('PUBLIC_BOOKING'),
    },

    // ---------- Ajustes ----------
    {
      section: 'Ajustes',
      target: 'nav-MANAGER',
      title: 'Ajustes',
      body: 'Aqui você configura a barbearia. Cada bloco abre e fecha, e tudo é salvo sozinho.',
      onEnter: on('MANAGER'),
    },
    {
      section: 'Ajustes',
      target: 'manager-summary',
      title: 'Resumo',
      body: 'Um painel rápido com faturamento, lucro da barbearia, comprovantes e agendamentos.',
      onEnter: on('MANAGER'),
    },
    {
      section: 'Ajustes',
      target: 'manager-barbearia',
      title: 'Dados da barbearia',
      body: 'Nome, WhatsApp e chave Pix. O WhatsApp é usado nos lembretes e o Pix, no sinal da reserva.',
      onEnter: on('MANAGER'),
    },
    {
      section: 'Ajustes',
      target: 'manager-servicos',
      title: 'Serviços e preços',
      body: 'O que você vende e quanto custa. Esses serviços aparecem na reserva do cliente e no Caixa.',
      onEnter: on('MANAGER'),
    },
    {
      section: 'Ajustes',
      target: 'manager-equipe',
      title: 'Barbeiros e comissão',
      body: 'Sua equipe e a porcentagem de comissão de cada pessoa. O Caixa usa isso para calcular o repasse.',
      onEnter: on('MANAGER'),
    },
    {
      section: 'Ajustes',
      target: 'manager-escala',
      title: 'Escala de trabalho',
      body: 'Os dias, horários, pausas e folgas de cada barbeiro. É daqui que saem os horários livres da reserva.',
      onEnter: on('MANAGER'),
    },
    {
      section: 'Ajustes',
      target: 'manager-regras',
      title: 'Sinal Pix e regras',
      body: 'Defina a porcentagem de sinal cobrada na reserva e o prazo de cancelamento.',
      onEnter: on('MANAGER'),
    },

    // ---------- Suporte ----------
    {
      section: 'Suporte',
      target: 'nav-SUPPORT',
      title: 'Suporte',
      body: 'Aqui você fala com a equipe do ProntoAgende.',
      onEnter: on('SUPPORT'),
    },
    {
      section: 'Suporte',
      target: 'support-form',
      title: 'Fale com a gente',
      body: 'Escolha Sugestão, Problema ou Dúvida, escreva e envie. Os administradores recebem na hora e respondem aqui mesmo.',
      onEnter: on('SUPPORT'),
    },
    {
      section: 'Suporte',
      target: 'support-data',
      title: 'Cópia dos seus dados',
      body: 'Peça uma cópia de tudo que está na sua conta. O arquivo baixa na hora e o pedido fica registrado.',
      onEnter: on('SUPPORT'),
    },
    {
      section: 'Suporte',
      target: 'support-list',
      title: 'Meus chamados',
      body: 'Abra para ver tudo que você já enviou, a situação de cada chamado e a resposta da equipe.',
      onEnter: on('SUPPORT'),
    },
  ];

  return SUPPORT_ENABLED ? steps : steps.filter((st) => st.section !== 'Suporte');
}
