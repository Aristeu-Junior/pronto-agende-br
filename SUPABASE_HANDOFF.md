# Supabase: o que falta para o cliente agendar pelo próprio celular

## Situação hoje
Todos os dados (escala, serviços, agendamentos) ficam no `localStorage` do navegador do barbeiro.
Quem abrir o link em outro aparelho vê o app vazio, e a reserva dele não chega ao barbeiro.
O calendário, a escala, os horários livres e o código Pix já funcionam, mas só no aparelho da barbearia.

## O que já está pronto no repositório
- `supabase/schema.sql`: tabelas, regras de acesso (RLS) e três funções públicas. **Proposta, não aplicada em nenhum projeto e não testada.**
- `src/utils/schedule.ts`: motor de horários livres (testado com casos de borda).

## Estado do banco (12/11/2026)
- Projeto Supabase `pronto-agende-br` (ref `nifyfpjpjzrjvebjfftm`, região `sa-east-1`) criado pelo Antigravity, vazio.
- Ele aplicou `schema.sql` sem mudanças. Eu revisei: 5 tabelas, RLS ligado em todas, só o dono lê e escreve, 3 funções públicas.
- Apliquei por cima `supabase/migrations/002_harden_public_booking.sql` e `003_pix_key_type.sql`.
- Testei dentro de uma transação desfeita ao final: a reserva válida entra; domingo, pausa, horário fora da grade, horário repetido, horário colado (folga) e 4ª reserva do mesmo telefone na hora são recusados; cliente anônimo não lê tabelas e não chama `schedule_slot_ok`.
- Nenhuma chave está no repositório. A URL e a chave `anon` são públicas por desenho, mas a `service_role` e o token `sbp_` nunca entram no código.

## Pontos fracos que ainda restam
- Limite por telefone ajuda, mas um atacante troca de telefone. Para proteção real, adicionar captcha (Turnstile) numa Edge Function na frente de `create_public_booking`.
- A folga entre serviços usa a maior folga dos serviços escolhidos; serviços com folgas diferentes podem gerar recusa do servidor (o app deve tratar o erro `horario_indisponivel` recarregando os horários).

## Depois que o projeto existir (trabalho do app)
1. Rota pública `#/reserva/<slug>` que pula o login e usa `get_public_shop`, `get_busy_slots` e `create_public_booking`.
2. Agenda do barbeiro lendo e gravando no Supabase (hoje lê o `localStorage`), com sincronização.
3. Trocar o `LoginGate` por Supabase Auth e remover as contas fixas de `src/utils/security.ts`.
4. Botão "Copiar link" apontando para a rota pública.
5. Comprovante do Pix em Supabase Storage (bucket privado).

## Pagamento do sinal
Não há gateway de pagamento. O app gera o Pix "copia e cola" com o valor, a partir da chave cadastrada em Ajustes.
A confirmação é manual: o barbeiro confere no banco e toca em "Confirmar sinal recebido". O app nunca marca o sinal como pago sozinho.
Confirmação automática exigiria um provedor (Mercado Pago, Asaas, Efí) e um servidor para receber o aviso de pagamento.
