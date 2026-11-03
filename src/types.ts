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

export interface BusinessConfig {
  id: string;
  slug: string;
  name: string;
  neighborhood: string;
  cityState: string;
  address: string;
  phone: string;
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
  status: AppointmentStatus;
  isWalkIn: boolean;
  isFirstVisitBoost?: boolean;
  originChannel: OriginChannel;
  deviceFingerprint: string;
  depositPixPaid: number;
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

export type MarketplaceCategory =
  | 'TODAS'
  | 'BARBEARIA'
  | 'SALAO_BELEZA'
  | 'CLINICA_ESTETICA'
  | 'STUDIO_SOBRANCELHA';

export interface VerifiedReview {
  id: string;
  venueId: string;
  clientName: string;
  serviceName: string;
  staffName: string;
  rating: number;
  comment: string;
  verifiedAt: string;
  posReceiptCode: string;
  originChannel: OriginChannel;
}

export interface MarketplaceVenue {
  id: string;
  slug: string;
  name: string;
  category: Exclude<MarketplaceCategory, 'TODAS'>;
  categoryLabel: string;
  neighborhood: string;
  cityState: string;
  address: string;
  distanceKm: number;
  rating: number;
  reviewsCount: number;
  bestOfYearBadge: boolean;
  isBoostSponsored: boolean;
  googleReserveIntegrated: boolean;
  acceptsWalkInNow: boolean;
  walkInWaitMinutes: number;
  startingPrice: number;
  nextAvailableSlots: string[];
  featuredServices: Array<{
    id: string;
    name: string;
    durationMinutes: number;
    price: number;
  }>;
  isCurrentWorkspaceVenue?: boolean;
}

