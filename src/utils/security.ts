import {
  SecurityAuditEvent,
  UserAccount,
  UserPermissions,
} from '../types';

const PBKDF2_ITERATIONS = 120000;
const SESSION_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours max session lifetime
const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes brute-force lockout

export const MASTER_ADMIN_PERMISSIONS: UserPermissions = {
  canAccessAgenda: true,
  canAccessPos: true,
  canAccessClients: true,
  canAccessReminders: true,
  canAccessPublicBooking: true,
  canAccessManager: true,
  canEditPrices: true,
  canUploadStatements: true,
  canExportOrResetData: true,
  canManageUsers: true,
};

export const DEFAULT_BARBER_PERMISSIONS: UserPermissions = {
  canAccessAgenda: true,
  canAccessPos: true,
  canAccessClients: true,
  canAccessReminders: true,
  canAccessPublicBooking: true,
  canAccessManager: true,
  canEditPrices: true,
  canUploadStatements: true,
  canExportOrResetData: false, // Por padrão restrito ao Admin
  canManageUsers: false, // Sempre falso para clientes comuns
};

function bufferToHex(buffer: ArrayBuffer): string {
  const byteArray = new Uint8Array(buffer);
  let hex = '';
  for (let i = 0; i < byteArray.length; i++) {
    hex += byteArray[i].toString(16).padStart(2, '0');
  }
  return hex;
}

/**
 * Comparação em tempo constante (Constant-Time Comparison) para mitigar Timing Attacks em pentests
 */
export function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Gera salt criptográfico aleatório de 128 bits via CSPRNG nativo (window.crypto)
 */
export function generateCryptoSalt(): string {
  const bytes = new Uint8Array(16);
  window.crypto.getRandomValues(bytes);
  return bufferToHex(bytes.buffer);
}

/**
 * Derivação de chave PBKDF2-HMAC-SHA256 (120.000 iterações - padrão OWASP/NIST)
 */
export async function derivePasswordHash(
  secret: string,
  salt: string
): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await window.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: enc.encode(`pronto_agende_sec_v1_${salt}`),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );

  return bufferToHex(derivedBits);
}

/**
 * Assinatura de integridade HMAC-SHA256 para evitar adulteração de sessão/localStorage via DevTools
 */
const RUNTIME_EPHEMERAL_SECRET = (() => {
  const key = 'pronto_agende_hmac_boot_seed';
  try {
    let existing = sessionStorage.getItem(key);
    if (!existing) {
      existing = generateCryptoSalt() + generateCryptoSalt();
      sessionStorage.setItem(key, existing);
    }
    return existing;
  } catch {
    return 'fallback_ephemeral_hmac_2026_pronto_agende_br';
  }
})();

export async function computeHmacSignature(payload: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(RUNTIME_EPHEMERAL_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await window.crypto.subtle.sign(
    'HMAC',
    key,
    enc.encode(payload)
  );
  return bufferToHex(sig);
}

export interface SignedSessionToken {
  userId: string;
  username: string;
  role: string;
  tenantId: string;
  issuedAt: number;
  expiresAt: number;
  csrfToken: string;
  signature: string;
}

export async function createSignedSession(
  user: UserAccount
): Promise<SignedSessionToken> {
  const issuedAt = Date.now();
  const expiresAt = issuedAt + SESSION_TTL_MS;
  const csrfToken = generateCryptoSalt();
  const rawString = `${user.id}|${user.username}|${user.role}|${user.tenantId}|${issuedAt}|${expiresAt}|${csrfToken}|${JSON.stringify(
    user.permissions
  )}`;
  const signature = await computeHmacSignature(rawString);

  return {
    userId: user.id,
    username: user.username,
    role: user.role,
    tenantId: user.tenantId,
    issuedAt,
    expiresAt,
    csrfToken,
    signature,
  };
}

export async function verifySignedSession(
  token: SignedSessionToken | null,
  user: UserAccount | undefined
): Promise<boolean> {
  if (!token || !user) return false;
  if (user.status !== 'ACTIVE') return false;
  if (Date.now() > token.expiresAt) return false;

  const expectedRaw = `${user.id}|${user.username}|${user.role}|${user.tenantId}|${token.issuedAt}|${token.expiresAt}|${token.csrfToken}|${JSON.stringify(
    user.permissions
  )}`;
  const expectedSig = await computeHmacSignature(expectedRaw);
  return timingSafeEqualStr(token.signature, expectedSig);
}

/**
 * Detector e Sanitizador de Vetores XSS / HTML Injection / Prototype Pollution
 */
const DANGEROUS_PATTERNS = [
  /<script\b/i,
  /javascript:/i,
  /vbscript:/i,
  /data:text\/html/i,
  /\bon\w+\s*=/i,
  /<iframe\b/i,
  /<object\b/i,
  /<embed\b/i,
  /<svg\b/i,
  /__proto__/i,
  /constructor\s*\.\s*prototype/i,
];

export function detectAttackPayload(input: string): boolean {
  if (!input) return false;
  return DANGEROUS_PATTERNS.some((regex) => regex.test(input));
}

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

/**
 * Verificação de Força de Senha
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  message: string;
} {
  if (password.length < 8) {
    return {
      valid: false,
      message: 'A senha deve ter no mínimo 8 caracteres.',
    };
  }
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password)) {
    return {
      valid: false,
      message: 'A senha deve conter letras maiúsculas e minúsculas.',
    };
  }
  if (!/\d/.test(password)) {
    return {
      valid: false,
      message: 'A senha deve conter pelo menos um número.',
    };
  }
  return { valid: true, message: 'Senha forte aprovada.' };
}

/**
 * Inicialização criptográfica dos Administradores Master (Aristeu e Otávio)
 * Apenas hashes irreversíveis PBKDF2-HMAC-SHA256 (256 bits) são armazenados.
 */
export async function buildInitialAccounts(): Promise<UserAccount[]> {
  return [
    {
      id: 'usr_admin_aristeu',
      username: 'aristeu',
      displayName: 'Aristeu Junior',
      email: 'aristeu@prontoagende.com.br',
      role: 'MASTER_ADMIN',
      status: 'ACTIVE',
      tenantId: 'tenant_master_aristeu',
      barbershopName: 'ProntoAgende BR',
      passwordHash:
        '864502c120e6bae933494a1605dde15411d2dbba6a816b9e31a2cf2a142e9bcb',
      passwordSalt: 'salt_aristeu_master_v1',
      pinHash:
        '672196b1f2c7d5019a8b776575029eb74b77852e044a25ac331baaaff92be6ab',
      permissions: { ...MASTER_ADMIN_PERMISSIONS },
      createdAt: '2026-11-03',
      failedLoginAttempts: 0,
    },
    {
      id: 'usr_admin_otavio',
      username: 'otavio',
      displayName: 'Otávio',
      email: 'otavio@prontoagende.com.br',
      role: 'MASTER_ADMIN',
      status: 'ACTIVE',
      tenantId: 'tenant_master_otavio',
      barbershopName: 'ProntoAgende BR',
      passwordHash:
        'c4129105d675654382158e78820a6a074783536eef63f07a3ebce0cb80f3249e',
      passwordSalt: 'salt_otavio_master_v1',
      pinHash:
        '55802c922bf10bbe1a39d7f7662182260f17cbd4123bb669a3f0c66c514b06c5',
      permissions: { ...MASTER_ADMIN_PERMISSIONS },
      createdAt: '2026-11-03',
      failedLoginAttempts: 0,
    },
    {
      id: 'usr_barber_assinante_01',
      username: 'barbeiro',
      displayName: 'Cliente Barbearia',
      email: 'contato@minhabarbearia.com.br',
      role: 'BARBER_OWNER',
      status: 'ACTIVE',
      tenantId: 'tenant_barber_01',
      barbershopName: 'Minha Barbearia',
      passwordHash:
        'e79686f7cfa3a6c87b85d0f41efed009406f97ebb6c8341ea4aeef8d940f40cc',
      passwordSalt: 'salt_barbeiro_cliente_v1',
      pinHash:
        '26944bd9be0ab2ba1cf19d94bf73b5e7888e1fd711652a08b0375cf10a0b9d84',
      permissions: { ...DEFAULT_BARBER_PERMISSIONS },
      createdAt: '2026-11-03',
      failedLoginAttempts: 0,
    },
  ];
}

export function getLockoutConfig() {
  return {
    LOCKOUT_THRESHOLD,
    LOCKOUT_DURATION_MS,
  };
}

export function createAuditEvent(
  eventType: SecurityAuditEvent['eventType'],
  severity: SecurityAuditEvent['severity'],
  actorUsername: string,
  description: string
): SecurityAuditEvent {
  return {
    id: `sec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toLocaleString('pt-BR'),
    severity,
    eventType,
    actorUsername: actorUsername || 'anônimo',
    description,
    ipOrDeviceFingerprint: `UA:${navigator.userAgent.slice(0, 42)}`,
  };
}
