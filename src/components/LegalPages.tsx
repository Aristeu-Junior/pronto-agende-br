import React from 'react';
import { COMPANY } from '../config/legal';

const H: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 className="mt-6 text-base font-bold text-stone-100">{children}</h2>
);
const P: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="mt-2 text-sm leading-relaxed text-stone-300">{children}</p>
);
const LI: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <li className="ml-5 list-disc text-sm leading-relaxed text-stone-300">{children}</li>
);

const Contact: React.FC = () => (
  <P>
    {COMPANY.legalName ? <>{COMPANY.legalName}</> : COMPANY.productName}
    {COMPANY.document ? <> · {COMPANY.document}</> : null}
    {COMPANY.contactEmail ? <> · E-mail: {COMPANY.contactEmail}</> : null}
    {COMPANY.contactWhatsapp ? <> · WhatsApp: {COMPANY.contactWhatsapp}</> : null}
    {COMPANY.city ? <> · {COMPANY.city}</> : null}
  </P>
);

const Terms: React.FC = () => (
  <>
    <h1 className="text-2xl font-bold text-stone-100">Termos de Uso</h1>
    <p className="mt-1 text-xs text-stone-400">Atualizado em {COMPANY.lastUpdate}</p>

    <H>1. O que é o serviço</H>
    <P>
      O {COMPANY.productName} é um sistema online para barbearias e salões: agenda, agendamento pelo cliente, caixa e
      cadastro de clientes. Ao criar uma conta ou usar o sistema, você aceita estes termos.
    </P>

    <H>2. Conta e liberação</H>
    <ul className="mt-2 space-y-1">
      <LI>Qualquer pessoa pode solicitar uma conta. O acesso ao sistema só é liberado depois da aprovação do administrador.</LI>
      <LI>Você é responsável pela senha e por tudo que for feito na sua conta. Não compartilhe o acesso.</LI>
      <LI>Podemos suspender contas que violem estes termos, usem o sistema para fraude ou estejam com pagamento em atraso.</LI>
    </ul>

    <H>3. Uso adequado</H>
    <P>
      É proibido usar o sistema para enviar spam, coletar dados de terceiros sem permissão, tentar acessar dados de outras
      barbearias ou prejudicar o funcionamento do serviço.
    </P>

    <H>4. Dados dos seus clientes</H>
    <P>
      Os nomes e telefones dos seus clientes são dados que a sua barbearia coleta para atender. Você é o responsável por
      tratá-los de forma lícita e por informar seus clientes. O {COMPANY.productName} atua como operador: guarda e
      processa esses dados apenas para fornecer o serviço.
    </P>

    <H>5. Pagamentos e sinal Pix</H>
    <P>
      O sistema gera um código Pix com o valor do sinal a partir da chave que você cadastra. Ele não processa nem confirma
      pagamentos: a confirmação é feita por você, conferindo o recebimento no seu banco. Confira sempre se a chave
      cadastrada está correta.
    </P>

    <H>6. Disponibilidade</H>
    <P>
      Trabalhamos para manter o sistema no ar, mas não garantimos funcionamento sem interrupções. Faça cópias das
      informações que forem importantes para você.
    </P>

    <H>7. Responsabilidade</H>
    <P>
      O sistema é fornecido no estado em que se encontra. Não nos responsabilizamos por perdas indiretas, por horários
      perdidos por falha de internet ou por erros de dados informados pelo usuário.
    </P>

    <H>8. Cancelamento e exclusão</H>
    <P>
      Você pode excluir sua conta a qualquer momento em Conta › Excluir minha conta. A exclusão apaga os dados da
      barbearia de forma definitiva.
    </P>

    <H>9. Contato</H>
    <Contact />
  </>
);

const Privacy: React.FC = () => (
  <>
    <h1 className="text-2xl font-bold text-stone-100">Política de Privacidade</h1>
    <p className="mt-1 text-xs text-stone-400">Atualizado em {COMPANY.lastUpdate} · Lei Geral de Proteção de Dados (Lei 13.709/2018)</p>

    <H>1. Quem trata os dados</H>
    <P>
      Sobre os dados dos <strong>clientes de uma barbearia</strong> (nome e telefone usados no agendamento), a barbearia é a
      controladora e o {COMPANY.productName} é o operador. Sobre os dados da <strong>conta da barbearia</strong> (e-mail e
      dados do negócio), o {COMPANY.productName} é o controlador.
    </P>
    <Contact />

    <H>2. Quais dados coletamos</H>
    <ul className="mt-2 space-y-1">
      <LI>Conta da barbearia: e-mail, nome da barbearia, senha (guardada de forma criptografada, nunca em texto aberto).</LI>
      <LI>Negócio: endereço, WhatsApp, chave Pix, serviços, preços, equipe e escala de trabalho.</LI>
      <LI>Clientes e agendamentos: nome, telefone, horários, serviços, valores, observações e, se a barbearia registrar, CPF e e-mail.</LI>
      <LI>Caixa: vendas, formas de pagamento e extratos que a barbearia registrar.</LI>
    </ul>

    <H>3. Para que usamos</H>
    <P>
      Exclusivamente para fornecer o serviço: mostrar horários livres, registrar reservas, permitir que a barbearia gerencie
      agenda e caixa e liberar ou suspender contas. Não vendemos dados e não os usamos para publicidade.
    </P>

    <H>4. Base legal</H>
    <P>
      Execução de contrato (a conta da barbearia e o agendamento solicitado pelo cliente) e legítimo interesse para
      segurança e prevenção a fraudes.
    </P>

    <H>5. Com quem compartilhamos</H>
    <ul className="mt-2 space-y-1">
      <LI>Hospedagem e banco de dados: Supabase, em servidores no Brasil (São Paulo).</LI>
      <LI>Hospedagem do site: GitHub Pages.</LI>
      <LI>WhatsApp: quando o cliente toca em “Avisar no WhatsApp”, o resumo da reserva é enviado por iniciativa dele.</LI>
    </ul>

    <H>6. Por quanto tempo guardamos</H>
    <P>
      Enquanto a conta da barbearia existir. Ao excluir a conta, os dados da barbearia, dos clientes, do caixa e dos extratos
      são apagados de forma definitiva.
    </P>

    <H>7. Seus direitos</H>
    <P>
      Você pode pedir confirmação de tratamento, acesso, correção, exclusão, portabilidade e informações sobre
      compartilhamento. A barbearia pode exportar e excluir seus dados em Conta. O cliente de uma barbearia deve fazer o
      pedido à própria barbearia, que é a controladora.
    </P>

    <H>8. Segurança</H>
    <ul className="mt-2 space-y-1">
      <LI>Conexão criptografada (HTTPS) e acesso separado por barbearia no banco de dados.</LI>
      <LI>Cada barbearia só enxerga os próprios dados. A página pública de reserva não mostra dados de outros clientes.</LI>
      <LI>Verificação em duas etapas opcional na conta.</LI>
    </ul>

    <H>9. Armazenamento no seu aparelho</H>
    <P>
      Usamos o armazenamento do navegador apenas para manter você conectado e lembrar preferências de tela. Não usamos
      cookies de publicidade.
    </P>

    <H>10. Contato</H>
    <Contact />
  </>
);

export const LegalPage: React.FC<{ kind: 'termos' | 'privacidade' }> = ({ kind }) => (
  <main className="mx-auto max-w-2xl px-4 py-10">
    <a href="#/" className="text-xs font-semibold text-amber-700 hover:text-amber-800">
      ← Voltar
    </a>
    <div className="mt-4">{kind === 'termos' ? <Terms /> : <Privacy />}</div>
  </main>
);

export const LegalLinks: React.FC<{ className?: string }> = ({ className = '' }) => (
  <p className={`text-center text-[11px] text-stone-400 ${className}`}>
    <a href="#/termos" className="font-semibold underline-offset-2 hover:underline">
      Termos de Uso
    </a>
    {' · '}
    <a href="#/privacidade" className="font-semibold underline-offset-2 hover:underline">
      Política de Privacidade
    </a>
  </p>
);
