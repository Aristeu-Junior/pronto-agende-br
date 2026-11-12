/**
 * Gerador de Pix "copia e cola" estático (BR Code, EMV QRCPS-MPM) com valor.
 * Não confirma pagamento: só monta o código para o cliente pagar no app do banco.
 */

function tlv(id: string, value: string): string {
  return `${id}${String(value.length).padStart(2, '0')}${value}`;
}

export function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function validCpf(d: string): boolean {
  if (!/^\d{11}$/.test(d) || /^(\d)\1+$/.test(d)) return false;
  for (let t = 9; t < 11; t++) {
    let sum = 0;
    for (let i = 0; i < t; i++) sum += Number(d[i]) * (t + 1 - i);
    const dv = ((sum * 10) % 11) % 10;
    if (dv !== Number(d[t])) return false;
  }
  return true;
}

/** Normaliza a chave digitada. Retorna null se não reconhecer o formato. */
export function normalizePixKey(raw: string): string | null {
  const key = raw.trim();
  if (!key) return null;
  if (key.includes('@')) return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(key) ? key.toLowerCase() : null;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key)) {
    return key.toLowerCase();
  }
  const digits = key.replace(/\D/g, '');
  if (key.startsWith('+')) return digits.length >= 12 ? `+${digits}` : null;
  if (digits.length === 14) return digits; // CNPJ
  if (digits.length === 11) return validCpf(digits) ? digits : `+55${digits}`; // CPF ou celular
  if (digits.length === 10) return `+55${digits}`;
  return null;
}

function cleanText(text: string, max: number): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9 ]/g, '')
    .trim()
    .slice(0, max)
    .toUpperCase();
}

export interface PixPayloadInput {
  key: string;
  amount: number;
  merchantName: string;
  city: string;
  txid?: string;
}

export function buildPixPayload(input: PixPayloadInput): string | null {
  const key = normalizePixKey(input.key);
  if (!key || !(input.amount > 0)) return null;
  const name = cleanText(input.merchantName, 25) || 'BARBEARIA';
  const city = cleanText(input.city, 15) || 'BRASIL';
  const txid = (input.txid || '***').replace(/[^A-Za-z0-9]/g, '').slice(0, 25) || '***';
  const body =
    tlv('00', '01') +
    tlv('26', tlv('00', 'br.gov.bcb.pix') + tlv('01', key)) +
    tlv('52', '0000') +
    tlv('53', '986') +
    tlv('54', input.amount.toFixed(2)) +
    tlv('58', 'BR') +
    tlv('59', name) +
    tlv('60', city) +
    tlv('62', tlv('05', txid)) +
    '6304';
  return body + crc16(body);
}
