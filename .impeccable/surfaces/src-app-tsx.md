---
version: 1
slug: "src-app-tsx"
primary_target: "src/App.tsx"
related_targets: []
---

# Surface Brief — ProntoAgende BR (MVP Unificado)

- **Scope:** Aplicação completa MVP (`src/App.tsx` e módulos operacionais + página pública do negócio)
- **Mode:** Operate (com aba integrada de Visão Pública do Cliente / Google Reserve)

## Direction contract

- **THESIS:** O ProntoAgende BR transforma a rotina caótica de balcão e cadeira de barbearias, salões e clínicas brasileiras em um quadro operacional tátil de resposta imediata, recusando o padrão SaaS genérico de cartões aninhados e modais burocráticos em favor de uma grade de cadeiras viva onde encaixes walk-in, comandas de PDV com rateio da Lei do Salão Parceiro e confirmações de WhatsApp acontecem na mesma superfície.
- **OWN-WORLD:** Superfície clara de pedra quente e papel técnico (`#F7F6F2` e `#FFFFFF`) estruturada por linhas divisórias de 1px (`#E5E2DC`), tipografia geométrica técnica (`Plus Jakarta Sans` para leitura rápida sob luz de bancada + `JetBrains Mono` com `tabular-nums` para horários, valores em Reais, CPFs e percentuais de comissão), carvão profundo (`#141413`) como tinta principal e um único sotaque Esmeralda Mineral calibrado (`#0F766E`, saturação < 80%) reservado estritamente para ações primárias, seleção ativa e confirmação de presença.
- **STORY:** O barbeiro ou gestor bate o olho no celular ou tablet do caixa, enxerga imediatamente quem está na cadeira, quem confirmou pelo WhatsApp, qual cadeira está livre para encaixe walk-in em 2 toques e qual é o valor líquido exato de sua comissão após descontar a taxa da maquininha e o auxiliar.
- **FIRST VIEWPORT:** Topo compacto com barra operacional contendo seletor da unidade (*Barbearia & Estúdio Dom Pedro*), medidor vivo da cota Freemium (42/60 reservas no mês), botão primário de **+ Encaixe Walk-in (2 toques)** e alternador instantâneo para a **Página Pública / Google Reserve**; abaixo, grade assimétrica (70/30 no desktop, coluna única com navegação inferior fixa no mobile) exibindo à esquerda a Linha do Tempo e Fila por Cadeira com filtros de status e à direita o Inspetor Operacional contextual (Check-in rápido, prévia de comanda PDV e disparo de WhatsApp).
- **FORM:** Candidato fundamentado #3 (*Quadro Técnico de Cadeira & Comanda Salão Parceiro*), seed key `934aec2e`, elevado pelos desafiantes do sorteio: (1) de `vernacular-ephemera-boarding-pass-and-gate-board`, herda colunas responsivas por prioridade e cartões de horário/comanda com anatomia de bilhete de embarque (portão/cadeira, horário monoespaçado, badge de origem e status em tempo real); (2) de `crouwel-grid-specimen`, herda a grade construtiva visível de 1px separando horários e métricas sem caixas redundantes; (3) de `variable-font-specimen`, herda leituras numéricas monoespaçadas de alta precisão para cálculo ao vivo do rateio Salão Parceiro.
- **FINISH:** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
