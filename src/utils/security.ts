/**
 * Utilitários de entrada segura (texto e comprovantes).
 * A autenticação agora é feita pelo Supabase Auth; este arquivo não guarda contas, hashes nem segredos.
 */

export function sanitizeUserText(input: string, maxLength = 300): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .replace(/__proto__/gi, '')
    .slice(0, maxLength);
}

/**
 * Validação estrita de upload de comprovantes (bloqueia .svg, .html, .exe, dupla extensão e arquivos > 5MB)
 */
export function validateSafeReceiptFile(file: File): {
  valid: boolean;
  reason?: string;
  safeName: string;
} {
  const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
  if (file.size > MAX_BYTES) {
    return {
      valid: false,
      reason: 'Arquivo excede o limite de segurança de 5MB.',
      safeName: '',
    };
  }

  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
  ];
  const lowerName = file.name.toLowerCase().trim();
  const validExt = /\.(jpg|jpeg|png|webp|pdf)$/.test(lowerName);
  const dangerousDoubleExt = /\.(exe|js|html|htm|svg|php|sh|bat|cmd)\b/i.test(
    lowerName
  );

  if (!allowedTypes.includes(file.type) || !validExt || dangerousDoubleExt) {
    return {
      valid: false,
      reason:
        'Formato bloqueado pela política de segurança. Use apenas JPG, PNG, WEBP ou PDF.',
      safeName: '',
    };
  }

  const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 64);
  return { valid: true, safeName: cleanName };
}
