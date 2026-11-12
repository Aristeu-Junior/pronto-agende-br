import { createClient } from '@supabase/supabase-js';

/**
 * Projeto Supabase "pronto-agende-br".
 * A URL e a chave anon são públicas por desenho: quem protege os dados são as regras RLS do banco.
 * NUNCA coloque aqui a chave service_role nem o token sbp_ de gerenciamento.
 */
export const SUPABASE_URL = 'https://nifyfpjpjzrjvebjfftm.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pZnlmcGpwanpyanZlYmpmZnRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ1MDc5MTIsImV4cCI6MjExMDA4MzkxMn0.wKWplMs_w4wliWcoC2jVvIe5NsJ69U3f-KonbOsFit4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'pronto_agende_br_auth',
  },
});

/** Traduz erros do servidor (funções do banco) para mensagens claras. */
export function friendlyError(message: string | undefined | null): string {
  const m = (message || '').toLowerCase();
  const table: Array<[string, string]> = [
    ['horario_indisponivel', 'Esse horário acabou de ser ocupado. Escolha outro.'],
    ['fora_da_escala', 'Esse horário não está disponível na escala do barbeiro.'],
    ['fora_da_antecedencia_minima', 'Esse horário está muito próximo. Escolha um mais adiante.'],
    ['alem_do_limite_de_dias', 'Essa data está além do limite para agendar.'],
    ['muitas_reservas_recentes', 'Muitas reservas seguidas com esse telefone. Tente mais tarde.'],
    ['limite_de_reservas_futuras', 'Esse telefone já tem o máximo de reservas futuras.'],
    ['telefone_invalido', 'Telefone inválido. Use DDD + número.'],
    ['nome_invalido', 'Nome inválido.'],
    ['servico_invalido', 'Serviço indisponível. Recarregue a página.'],
    ['profissional_invalido', 'Profissional indisponível. Recarregue a página.'],
    ['barbearia_nao_encontrada', 'Barbearia não encontrada ou indisponível.'],
    ['invalid login credentials', 'E-mail ou senha incorretos.'],
    ['user already registered', 'Já existe uma conta com esse e-mail. Use "Entrar".'],
    ['email not confirmed', 'E-mail ainda não confirmado. Peça ao administrador para liberar sua conta.'],
    ['password should be at least', 'A senha precisa ter pelo menos 8 caracteres.'],
    ['rate limit', 'Muitas tentativas. Aguarde alguns minutos.'],
    ['nao_autorizado', 'Você não tem permissão para isso.'],
    ['23p01', 'Já existe um agendamento nesse horário para esse profissional.'],
    ['failed to fetch', 'Sem conexão com o servidor. Verifique a internet.'],
    ['networkerror', 'Sem conexão com o servidor. Verifique a internet.'],
  ];
  for (const [key, text] of table) if (m.includes(key)) return text;
  return 'Algo deu errado. Tente de novo.';
}
