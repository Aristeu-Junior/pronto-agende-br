export type PlanTier = 'FREE' | 'PRO';

export type FeeSplitRule = 'PROPORTIONAL' | 'STAFF_100' | 'SALON_100';

export type AppointmentStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'IN_SERVICE'
  | 'COMPLETED'
  | 'NO_SHOW'
  | 'CANCELLED';

export type OriginChannel =
  | 'DIRECT_LINK'
  | 'GOOGLE_RESERVE'
  | 'MARKETPLACE_BOOST'
  | 'WALK_IN';

export type PaymentMethod =
  | 'PIX'
  | 'DEBIT_CARD'
  | 'CREDIT_CARD'
  | 'CASH'
  | 'CLIENT_PASS';

export type UserRole = 'MASTER_ADMIN' | 'BARBER_OWNER' | 'BARBER_STAFF';

export type AccountStatus = 'ACTIVE' | 'SUSPENDED' | 'PENDING_APPROVAL';

export interface UserPermissions {
  canAccessAgenda: boolean;
  canAccessPos: boolean;
  canAccessClients: boolean;
  canAccessReminders: boolean;
  canAccessPublicBooking: boolean;
  canAccessManager: boolean;
  canEditPrices: boolean;
  canUploadStatements: boolean;
  canExportOrResetData: boolean;
  canManageUsers: boolean; // Exclusivo para MASTER_ADMIN (Aristeu e Otávio)
}

export interface UserAccount {
  id: string;
  username: string;
  displayName: string;
  email: string;
  role: UserRole;
  status: AccountStatus;
  tenantId: string;
  barbershopName: string;
  passwordHash: string;
  passwordSalt: string;
  pinHash: string;
  permissions: UserPermissions;
  createdAt: string;
  lastLoginAt?: string;
  failedLoginAttempts: number;
  lockedUntil?: number;
}

export interface SecurityAuditEvent {
  id: string;
  timestamp: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  eventType:
    | 'LOGIN_SUCCESS'
    | 'LOGIN_FAILED'
    | 'BRUTE_FORCE_LOCKOUT'
    | 'PERMISSION_UPDATED'
    | 'USER_CREATED'
    | 'USER_STATUS_CHANGED'
    | 'XSS_PAYLOAD_BLOCKED'
    | 'SESSION_TERMINATED';
  actorUsername: string;
  description: string;
  ipOrDeviceFingerprint: string;
}

export interface BankStatementEntry {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'PIX_SINAL' | 'FECHAMENTO_DIA' | 'EXTRATO_BANCARIO';
  attachmentName?: string;
}

export interface BusinessConfig {
  id: string;
  slug: string;
  name: string;
  neighborhood: string;
  cityState: string;
  address: string;
  phone: string;
  pixKey: string;
  planTier: PlanTier;
  monthlyBookingsUsed: number;
  monthlyBookingsLimit: number;
  feeSplitRule: FeeSplitRule;
  cancelNoticeHours: number;
  noShowDepositPercent: number;
  googleReserveEnabled: boolean;
  boostEnabled: boolean;
  boostCommissionPct: number;
  reviewsRank: number;
  reviewsCount: number;
  bestBadge: boolean;
  isConfigured: boolean;
  pixKeyType?: 'CPF' | 'CNPJ' | 'PHONE' | 'EMAIL' | 'RANDOM';
  /** antecedencia minima para agendar online, em minutos */
  minNoticeMinutes?: number;
  /** ate quantos dias a frente o cliente pode agendar */
  maxAdvanceDays?: number;
}

export interface DaySchedule {
  enabled: boolean;
  start: string;
  end: string;
  breakStart?: string;
  breakEnd?: string;
}

export interface WorkSchedule {
  /** indice 0 = domingo ... 6 = sabado */
  days: DaySchedule[];
  slotIntervalMinutes: number;
  /** datas YYYY-MM-DD em que o profissional nao atende (folgas, feriados) */
  blockedDates: string[];
}

export interface StaffMember {
  id: string;
  name: string;
  role: 'PROFESSIONAL' | 'ASSISTANT' | 'MANAGER';
  specialty: string;
  chairLabel: string;
  defaultServiceCommissionPct: number;
  defaultProductCommissionPct: number;
  acceptsWalkIns: boolean;
  workingHours: string;
  schedule?: WorkSchedule;
  avatarInitials: string;
}

export interface ServiceItem {
  id: string;
  name: string;
  category: 'CABELO' | 'BARBA' | 'QUIMICA' | 'ESTETICA';
  durationMinutes: number;
  bufferAfterMinutes: number;
  price: number;
  customCommissionPct: number;
  assistantSharePct: number;
}

export interface InventoryProduct {
  id: string;
  name: string;
  sku: string;
  price: number;
  stockQuantity: number;
  minStockAlert: number;
  commissionPct: number;
}

export interface ClientPass {
  id: string;
  serviceId: string;
  name: string;
  totalSessions: number;
  remainingSessions: number;
  expiresAt: string;
}

export interface Client {
  id: string;
  fullName: string;
  phoneWhatsapp: string;
  cpf: string;
  email: string;
  visitsCount: number;
  noShowCount: number;
  lastVisitDaysAgo: number;
  totalSpent: number;
  tags: Array<'VIP' | 'RECORRENTE' | 'ALERTA_FALTA' | 'PACOTE_ATIVO' | 'NOVO'>;
  notes: string;
  passes: ClientPass[];
}

export interface Appointment {
  id: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  staffId: string;
  assistantStaffId?: string;
  serviceIds: string[];
  date: string;
  startTime: string;
  endTime: string;
  customPrice?: number;
  status: AppointmentStatus;
  isWalkIn: boolean;
  isFirstVisitBoost?: boolean;
  originChannel: OriginChannel;
  deviceFingerprint: string;
  depositPixPaid: number;
  /** sinal pedido ao cliente e ainda nao confirmado pelo barbeiro */
  depositRequested?: number;
  paymentProofName?: string;
  notes?: string;
}

export interface PosTransaction {
  id: string;
  appointmentId?: string;
  clientId: string;
  clientName: string;
  staffId: string;
  staffName: string;
  assistantStaffId?: string;
  assistantName?: string;
  closedAt: string;
  serviceIds: string[];
  productItems: Array<{ productId: string; quantity: number }>;
  paymentMethod: PaymentMethod;
  subtotalServices: number;
  subtotalProducts: number;
  discountAmount: number;
  tipAmount: number;
  totalAmount: number;
  acquirerFeePct: number;
  acquirerFeeAmount: number;
  boostFeeAmount: number;
  staffGrossCommission: number;
  staffDeductedFee: number;
  assistantCommission: number;
  staffNetCommission: number;
  salonNetShare: number;
  originChannel: OriginChannel;
  receiptAttachmentName?: string;
}

export interface ReminderLog {
  id: string;
  appointmentId: string;
  clientName: string;
  clientPhone: string;
  serviceSummary: string;
  startTime: string;
  staffName: string;
  type: 'CONFIRMATION_24H' | 'REMINDER_2H' | 'RETENTION_CYCLE';
  channel: 'WHATSAPP' | 'SMS';
  status: 'PENDING' | 'SENT' | 'CONFIRMED_BY_CLIENT' | 'CANCELLED_BY_CLIENT';
  sentAt?: string;
}
