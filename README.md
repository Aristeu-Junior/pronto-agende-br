# ProntoAgende BR — Plataforma Unificada de Agendamento, Walk-in & Gestão (MVP)

**ProntoAgende BR** é uma plataforma web responsiva (*mobile-first*) para pequenos negócios locais no Brasil (barbearias, salões de beleza, estúdios e clínicas de estética), projetada a partir da engenharia reversa (REA) e unificação arquitetural dos 3 principais players do setor:

1. **Trinks:** Integração nativa com *Reserve with Google* (0% comissão), rateio configurável de taxa de maquininha, divisão de comissão com auxiliar e conformidade contábil com a **Lei do Salão Parceiro (Lei nº 13.352/2016)** + validação algorítmica de CPF (Módulo 11).
2. **Booksy:** Operação de **Encaixe Rápido (Walk-in em 2 toques)** na recepção, atribuição de novos clientes via **Marketplace Boost** com fingerprint de dispositivo (`_bf`, teto de 15% apenas na 1ª visita) e proteção inteligente contra **No-Show** com exigência dinâmica de **Sinal Pix (30%)** apenas para clientes reincidentes (`noShowCount >= 2`).
3. **Reservio:** **Plano Gratuito Perpétuo** para pequenos negócios (até **60 agendamentos/mês**, **150 clientes** e **2 cadeiras** com *soft-cap* sem bloqueio abrupto de caixa), **PDV integrado** (serviços + produtos de estoque) e **Pacotes de Sessões (`ClientPass`)** com abatimento automático no checkout.

---

## Como Rodar o Projeto Localmente

### Pré-requisitos
- **Node.js** `>= 18.x` e **npm**

### 1. Instalar dependências
```bash
cd "C:\Users\Aristeu Junior\.gemini\antigravity-cli\scratch\pronto-agende-br"
npm install
```

### 2. Iniciar o servidor de desenvolvimento (Vite)
```bash
npm run dev
```
Acesse no navegador: `http://127.0.0.1:5173/`

### 3. Gerar build de produção e validar tipagem TypeScript
```bash
npm run build
```

---

## Arquitetura de Arquivos

```text
pronto-agende-br/
├── PRODUCT.md                         # Contexto de produto e audiência (Impeccable schema v1)
├── DESIGN.md                          # Sistema de design canônico e tokens (Impeccable v2)
├── .impeccable/
│   ├── config.json                    # Configuração do pipeline Impeccable
│   ├── design.json                    # Sidecar estruturado de tokens (schemaVersion 2)
│   └── surfaces/
│       └── src-app-tsx.md             # Surface brief pareado com seed de entropia (934aec2e)
├── src/
│   ├── types.ts                       # Entidades unificadas (Appointment, Client, StaffMember, PosOrder, ClientPass)
│   ├── index.css                      # Tokens CSS, tabular-nums e tabelas responsivas com @container
│   ├── utils/
│   │   └── validators.ts              # Validador de CPF Módulo 11 + Motor Lei do Salão Parceiro (calculatePartnerSplit)
│   ├── data/
│   │   └── seedData.ts                # Dados iniciais realistas (Barbearia & Estúdio Dom Pedro - Pinheiros, SP)
│   ├── components/
│   │   ├── LightDismissDialog.tsx     # Modal nativo <dialog closedby="any"> + fallback Safari
│   │   ├── AgendaModule.tsx           # Quadro de Cadeiras, Walk-in em 2 Toques, sincronização Google Reserve e Inspetor
│   │   ├── PosModule.tsx              # PDV integrado, abatimento de pacote ClientPass e recibo Salão Parceiro ao vivo
│   │   ├── ClientsModule.tsx          # CRM com tabela @container, validação CPF Módulo 11 e venda de pacotes
│   │   ├── RemindersModule.tsx        # Fila WhatsApp 24h/2h com mudança de status na agenda + recuperação >21 dias
│   │   ├── PublicBookingModule.tsx    # Página pública mobile-first + simulador Google Reserve/Boost + Sinal Pix anti-furo
│   │   └── ManagerDashboardModule.tsx # Painel do gestor, medidor Freemium (60/mês), regras ao vivo e folha de repasse
│   ├── App.tsx                        # Shell responsivo (100dvh, barra superior + barra inferior mobile para o polegar)
│   └── main.tsx                       # Entrypoint React 18
└── package.json
```

---

## Funcionalidades Implementadas no MVP

1. **Agenda & Walk-in em 2 Toques (`src/components/AgendaModule.tsx`):**
   - Filtro instantâneo por cadeira/profissional, status e busca por nome/WhatsApp.
   - Botão **"+ Encaixe Walk-in (2 Toques)"** que seleciona automaticamente a cadeira com menor fila e cria o atendimento já na cadeira ou confirmado.
   - Botão **"Sincronizar Google Reserve"** que demonstra o estado de carregamento (*skeleton*) e importa um agendamento vindo da Busca/Maps do Google (0% de taxa).
   - Inspetor lateral contextual com impressão digital `_bf`, auxiliar vinculado, observações de bancada e atalho direto para fechar comanda no PDV.
2. **PDV & Motor Salão Parceiro (`src/components/PosModule.tsx`):**
   - Carrega os serviços do atendimento selecionado ou avulso, permite adicionar produtos de prateleira com baixa automática de estoque e detectar/abater **Pacotes de Sessões (`ClientPass`)** ativos do cliente.
   - Calcula em tempo real: **Subtotal de Serviços**, **Subtotal de Produtos**, **Taxa da Maquininha** (conforme método: Pix 0%, Débito 1,39%, Crédito 3,19%, Dinheiro 0% ou Pacote 0%), **Taxa Marketplace Boost (15% somente na 1ª visita)**, **Comissão do Auxiliar**, **Cota-Parte Líquida do Profissional (isenta na NF do salão — Lei 13.352/2016)** e **Retenção Tributável do Salão**.
3. **CRM de Clientes & Pacotes (`src/components/ClientsModule.tsx`):**
   - Tabela responsiva baseada em `@container (width < 600px)` com rolagem acessível por teclado.
   - Cadastro com validação algorítmica de **CPF (Módulo 11)**, histórico de faltas (*No-Show*) e emissão de pacotes pré-pagos de sessões.
4. **Lembretes WhatsApp & Retorno Inteligente (`src/components/RemindersModule.tsx`):**
   - Fila de disparo de confirmação (`24h` e `2h` antes) via link direto `wa.me` ou confirmação simulada que atualiza imediatamente o status na Agenda.
   - Radar de **Ciclo de Retorno (>21 dias sem visitar)** para recuperação ativa de receita ociosa.
5. **Página Pública & Google Reserve (`src/components/PublicBookingModule.tsx`):**
   - Fluxo público completo de autoagendamento (*mobile-first*).
   - Simulador de canal de origem (`Link Próprio`, `Reserve with Google`, `Marketplace Boost 1ª Visita`).
   - Gatilho automático de **Sinal Pix de 30% (Copia e Cola)** ao testar com um cliente que possui `2 ou mais faltas` (ex.: `(11) 99104-8372` — Breno Siqueira Tavares), mantendo zero fricção para clientes pontuais.
6. **Painel Executivo do Gestor (`src/components/ManagerDashboardModule.tsx`):**
   - Medidor da cota do **Plano Gratuito (Reservio+)** com simulador de atingimento do limite de `60 agendamentos/mês` (mostrando o comportamento de *soft-cap*: o PDV e o encaixe presencial continuam livres).
   - Chaveamento em tempo real da regra de desconto de maquininha (`Rateio Proporcional`, `Salão Absorve 100%` ou `Profissional Absorve 100%`) e do gatilho de No-Show.
