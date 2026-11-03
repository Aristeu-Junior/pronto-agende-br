# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

delegated: React 19 + TypeScript + Vite + Tailwind CSS + @phosphor-icons/react (SPA mobile-first responsiva para operação rápida em balcão e celular)

## Users

1. **Profissionais e Gestores de Pequenos Negócios Locais no Brasil** (barbeiros, cabeleireiros, manicures, recepcionistas e donos de barbearias, salões de beleza e clínicas de estética): operam o sistema majoritariamente pelo celular ou tablet no balcão entre um corte/procedimento e outro, sob iluminação interna variada e com pressa. Precisam visualizar a agenda da equipe, lançar encaixes presenciais (*walk-ins*) em 2 toques, cobrar no PDV conjugando serviços e produtos de prateleira, calcular comissões líquidas descontando taxas de maquininha/auxiliar e disparar lembretes no WhatsApp.
2. **Clientes Finais Brasileiros**: acessam a página pública de agendamento pelo link da bio (Instagram/WhatsApp), QR Code na recepção ou botão *Reservar com Google* (Busca/Maps) pelo smartphone para escolher serviço, profissional, horário e pagar eventual Sinal Pix anti-no-show sem precisar baixar aplicativo nem criar senha.

## Product Purpose

Unificar em um único sistema brasileiro o melhor de três concorrentes que hoje obrigam o pequeno empresário a escolher entre gestão fiscal/comissão (Trinks), captação e encaixes rápidos (Booksy) ou simplicidade gratuita com PDV (Reservio). O sucesso significa zerar buracos de falta (*no-show*) via confirmação no WhatsApp e Sinal Pix inteligente, registrar 100% dos encaixes de balcão e fechar o caixa diário com o rateio exato da Lei do Salão Parceiro (Lei nº 13.352/2016).

## Positioning

A única plataforma brasileira *Freemium* (até 60 reservas/mês grátis sem travar o PDV manual) que combina **integração Google Reserve + Vitrine Local (Trinks)**, **lançamento de Walk-in em 2 toques + proteção Anti-No-Show via Sinal Pix dinâmico (Booksy adaptado ao Brasil)** e **PDV conjugado com pacotes de sessões e comissionamento Salão Parceiro (Reservio + Trinks)**.

## Operating Context

- Uso diário intenso em smartphones Android/iOS (390px) no bolso do barbeiro e telas desktop/tablet (1440px) no caixa da recepção.
- Fluxos críticos: Agenda multi-profissional por cadeira, Fila de Encaixe Walk-in, Cadastro progressivo de clientes com validação de CPF módulo 11 e pacotes/passes de sessões, PDV com split de pagamento (Pix 0%, Débito 1,99%, Crédito 3,99%, Abatimento de Pacote) e cálculo instantâneo de comissão líquida (desconto proporcional ou 100% da taxa de maquininha + cota de auxiliar), Central de Lembretes WhatsApp (24h/2h antes + ciclo de retorno >21 dias), Página Pública de Agendamento e Painel Executivo do Gestor.

## Capabilities and Constraints

- **6 Módulos Integrados no MVP**: (1) Agenda + Walk-in, (2) Clientes CRM + Passes, (3) PDV + Motor de Comissões Salão Parceiro, (4) Central de Lembretes e Retenção, (5) Página Pública de Agendamento do Negócio (visão do cliente final + Google Reserve), (6) Painel do Gestor (KPIs, cota Freemium e regras de negócio).
- **Persistência e Interatividade Real**: Estado reativo completo persistido em `localStorage` com opção de restaurar dados de demonstração, estados reais de carregamento (skeletons), estados vazios instrutivos e validação inline de formulários (incluindo algoritmo oficial módulo 11 de CPF e formato de celular brasileiro DDD + 9 dígitos).
- **Restrições Visuais e Técnicas**: Proibido o uso de emojis na interface (substituídos exclusivamente por ícones vetoriais `@phosphor-icons/react` de traço consistente); tipografia técnica sem serifa para operação + monoespaçada tabular para valores monetários, horários e percentuais.

## Brand Commitments

- Nome do produto no MVP: **ProntoAgende BR** (Unidade demonstrativa: *Barbearia & Estúdio Dom Pedro — Pinheiros, SP*).
- Idioma: Português do Brasil (`pt-BR`), moeda Real (`R$`), formato de data `dd/MM/yyyy` e horário `24h`.

## Product Principles

1. **Velocidade de Balcão Acima de Burocracia**: Um encaixe presencial (*walk-in*) nunca pode exigir mais que nome e serviço; o CPF só é exigido quando há obrigação fiscal ou pacote.
2. **Transparência Financeira Salão Parceiro**: Todo fechamento de comanda mostra claramente quanto fica para o salão, quanto vai para a taxa da maquininha, quanto vai para o auxiliar e qual é a comissão líquida do profissional.
3. **Proteção Sem Atrito**: Bons clientes agendam em segundos; clientes reincidentes em faltas (`noShowCount >= 2`) ativam automaticamente a exigência de Sinal Pix Copia-e-Cola.
4. **Cota Freemium Humana**: Atingir o limite mensal do plano gratuito pausa apenas novas reservas públicas online, jamais bloqueando o lançamento de encaixes ou o fechamento de caixa do estabelecimento.

## Accessibility & Inclusion

- Contraste mínimo WCAG AA (≥ 4.5:1 para texto normal, ≥ 3:1 para títulos e elementos gráficos).
- Navegação completa por teclado (`focus-visible` nítido, modais nativos `<dialog closedby="any">` com fallback de clique no backdrop e tecla `Esc`), áreas de toque mínimas de `44x44px` no mobile e suporte a `prefers-reduced-motion`.
