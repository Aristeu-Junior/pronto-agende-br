# Supabase: o que falta para o cliente agendar pelo próprio celular

## Situação hoje
Todos os dados (escala, serviços, agendamentos) ficam no `localStorage` do navegador do barbeiro.
Quem abrir o link em outro aparelho vê o app vazio, e a reserva dele não chega ao barbeiro.
O calendário, a escala, os horários livres e o código Pix já funcionam, mas só no aparelho da barbearia.

## O que já está pronto no repositório
- `supabase/schema.sql`: tabelas, regras de acesso (RLS) e três funções públicas. **Proposta, não aplicada em nenhum projeto e não testada.**
- `src/utils/schedule.ts`: motor de horários livres (testado com casos de borda).

## Pedido para o Antigravity (copiar e colar)

> No repositório `pronto-agende-br`, crie um projeto Supabase novo e dedicado (não reaproveite o projeto de outro app).
> 1. Aplique `supabase/schema.sql`. Antes de aplicar, revise: a função `create_public_booking` ainda precisa revalidar a escala
>    (dia da semana, horário de abertura e fechamento, pausa e folgas em `staff.schedule`) no servidor, igual a `getFreeSlots`
>    em `src/utils/schedule.ts`. Implemente isso em plpgsql ou numa Edge Function.
> 2. Habilite Supabase Auth (e-mail e senha) para o dono. Isso substitui o login falso do navegador (`LoginGate`).
> 3. Me devolva só a URL do projeto e a chave `anon` (pública). **Não** envie a chave `service_role`, nem cole nenhuma chave em arquivo do repositório.
> 4. Teste com um cliente anônimo: ele não pode ler a tabela `appointments`, só chamar `get_public_shop`, `get_busy_slots` e `create_public_booking`.
> 5. Teste duas reservas simultâneas no mesmo horário: a segunda precisa falhar (restrição `no_overlap`).

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
