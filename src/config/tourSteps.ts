import type { TourStep } from '../components/GuidedTour';

export type TourTab = 'AGENDA' | 'POS' | 'CLIENTS' | 'PUBLIC_BOOKING' | 'MANAGER';

/** Passos do tutorial de novo usuário. `go` troca a aba do app. */
export function buildTourSteps(go: (tab: TourTab) => void): TourStep[] {
  return [
  {
    title: 'Bem-vindo ao ProntoAgende',
    body: 'Em poucos passos você vê para que serve cada parte do sistema. Use Próximo para avançar, ou Pular tutorial se preferir. Você pode rever tudo no botão Tutorial, no topo.',
    onEnter: () => go('AGENDA'),
  },
  {
    target: 'business-name',
    title: 'Nome da sua barbearia',
    body: 'Este é o nome que seus clientes veem. Clique nele para editar quando quiser.',
  },
  {
    target: 'nav-AGENDA',
    title: 'Agenda',
    body: 'Aqui ficam os horários do dia. Veja quem vem, confirme, remarque e chame o cliente pelo WhatsApp.',
    onEnter: () => go('AGENDA'),
  },
  {
    target: 'agenda-new',
    title: 'Novo agendamento',
    body: 'Marque um horário para um cliente: escolha o serviço, o barbeiro e o dia. O horário ocupado some da lista de livres.',
    onEnter: () => go('AGENDA'),
  },
  {
    target: 'agenda-reminders',
    title: 'Lembretes no WhatsApp',
    body: 'Mande a mensagem de lembrete para quem tem horário marcado. Isso ajuda a diminuir as faltas.',
    onEnter: () => go('AGENDA'),
  },
  {
    target: 'nav-POS',
    title: 'Caixa',
    body: 'Registre cada atendimento pago: quem atendeu, o serviço e a forma de pagamento. O sistema soma o total do dia e a comissão da equipe.',
    onEnter: () => go('POS'),
  },
  {
    target: 'nav-CLIENTS',
    title: 'Clientes',
    body: 'Sua lista de clientes, com WhatsApp, quantidade de visitas e faltas. Busque, edite a ficha e chame pelo WhatsApp.',
    onEnter: () => go('CLIENTS'),
  },
  {
    target: 'nav-PUBLIC_BOOKING',
    title: 'Link de reserva',
    body: 'Este é o link que você manda ao cliente. Ele escolhe o dia e o horário livre sozinho, e a reserva cai direto na sua Agenda.',
    onEnter: () => go('PUBLIC_BOOKING'),
  },
  {
    target: 'nav-MANAGER',
    title: 'Ajustes',
    body: 'Configure sua barbearia: serviços e preços, barbeiros e comissão, escala de trabalho, chave Pix e regras do sinal.',
    onEnter: () => go('MANAGER'),
  },
  {
    target: 'theme',
    title: 'Modo claro e escuro',
    body: 'Troque entre o visual claro e o escuro. O sistema lembra a sua escolha neste aparelho.',
  },
  {
    target: 'account',
    title: 'Minha conta',
    body: 'Troque a senha, ative a verificação em duas etapas, baixe seus dados ou exclua a conta.',
  },
  {
    title: 'Tudo pronto',
    body: 'Dica: onde aparecer uma bolinha com "?", passe o mouse (ou toque) para ver o que aquela área faz. Para rever este tutorial, use o botão Tutorial no topo.',
    onEnter: () => go('AGENDA'),
  },
  ];
}
