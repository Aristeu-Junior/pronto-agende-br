import {
  Appointment,
  BankStatementEntry,
  BusinessConfig,
  Client,
  InventoryProduct,
  PosTransaction,
  ReminderLog,
  ServiceItem,
  StaffMember,
} from '../types';

/**
 * Estado Inicial Zerado (Em Branco) para que cada Barbearia / Estabelecimento
 * cadastre seus próprios dados reais do zero.
 */
export const INITIAL_BUSINESS_CONFIG: BusinessConfig = {
  id: 'biz_custom_01',
  slug: 'minha-barbearia',
  name: 'Minha Barbearia (Clique em Gestão p/ Configurar)',
  neighborhood: 'Centro',
  cityState: 'Sua Cidade - UF',
  address: 'Cadastre seu endereço na aba Gestão',
  phone: '',
  pixKey: '',
  planTier: 'PRO',
  monthlyBookingsUsed: 0,
  monthlyBookingsLimit: 60,
  feeSplitRule: 'PROPORTIONAL',
  cancelNoticeHours: 2,
  noShowDepositPercent: 30,
  googleReserveEnabled: true,
  boostEnabled: false,
  boostCommissionPct: 0,
  reviewsRank: 5.0,
  reviewsCount: 0,
  bestBadge: false,
  isConfigured: false,
};

export const INITIAL_STAFF: StaffMember[] = [
  {
    id: 'st_01',
    name: 'Barbeiro Principal (Edite em Gestão)',
    role: 'PROFESSIONAL',
    specialty: 'Corte & Barba',
    chairLabel: 'Cadeira 01',
    defaultServiceCommissionPct: 50,
    defaultProductCommissionPct: 10,
    acceptsWalkIns: true,
    workingHours: '09:00 - 20:00',
    avatarInitials: 'BP',
  },
];

export const INITIAL_SERVICES: ServiceItem[] = [
  {
    id: 'srv_01',
    name: 'Corte Masculino',
    category: 'CABELO',
    durationMinutes: 40,
    bufferAfterMinutes: 5,
    price: 45.0,
    customCommissionPct: 50,
    assistantSharePct: 0,
  },
  {
    id: 'srv_02',
    name: 'Barba Completa',
    category: 'BARBA',
    durationMinutes: 30,
    bufferAfterMinutes: 5,
    price: 35.0,
    customCommissionPct: 50,
    assistantSharePct: 0,
  },
  {
    id: 'srv_03',
    name: 'Combo Corte + Barba',
    category: 'CABELO',
    durationMinutes: 60,
    bufferAfterMinutes: 5,
    price: 70.0,
    customCommissionPct: 50,
    assistantSharePct: 0,
  },
];

export const INITIAL_PRODUCTS: InventoryProduct[] = [];

export const INITIAL_CLIENTS: Client[] = [];

export const INITIAL_APPOINTMENTS: Appointment[] = [];

export const INITIAL_POS_TRANSACTIONS: PosTransaction[] = [];

export const INITIAL_REMINDERS: ReminderLog[] = [];

export const INITIAL_BANK_STATEMENTS: BankStatementEntry[] = [];
