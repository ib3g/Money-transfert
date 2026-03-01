export type Role = 'OWNER' | 'MANAGER' | 'AGENT';

export type Permission =
  | 'MANAGE_USERS'
  | 'MANAGE_ZONES'
  | 'MANAGE_RATES'
  | 'VIEW_ALL_TRANSACTIONS'
  | 'CANCEL_TRANSACTIONS'
  | 'VIEW_AUDIT_LOGS'
  | 'GENERATE_REPORTS'
  | 'FULL_ADMIN';

export type TransactionStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';
export type RateSource = 'MANUAL' | 'API';
export type NotificationType =
  | 'TRANSACTION_CONFIRMED'
  | 'TRANSACTION_CANCELLED'
  | 'TRANSACTION_EXPIRED'
  | 'RATE_UPDATED'
  | 'USER_CREATED';

export interface Zone {
  id: string;
  name: string;
  currency: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserZone {
  id: string;
  userId: string;
  zoneId: string;
  zone: Zone;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  isActive: boolean;
  permissions: Permission[];
  totpEnabled: boolean;
  zones?: UserZone[];
  createdAt: string;
  updatedAt: string;
}

export interface ExchangeRate {
  id: string;
  sourceZoneId: string;
  destZoneId: string;
  sourceZone?: Zone;
  destZone?: Zone;
  rate: string;
  source: RateSource;
  isActive: boolean;
  setById?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CorridorRate {
  sourceZone: Zone;
  destZone: Zone;
  appliedRate: string;
  appliedSource: RateSource;
  marketRate?: string;
  marketSource?: RateSource;
  marketUpdatedAt?: string;
  hasManualOverride: boolean;
}

export interface Transaction {
  id: string;
  code: string;
  sourceAmount: number;
  sourceCurrency: string;
  destAmount: number;
  destCurrency: string;
  appliedRate: string;
  rateSource: RateSource;
  sourceZoneId: string;
  destZoneId: string;
  senderAgentId: string;
  receiverAgentId?: string;
  senderName: string;
  recipientName: string;
  status: TransactionStatus;
  expiresAt?: string;
  confirmedAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
  sourceZone?: Zone;
  destZone?: Zone;
  senderAgent?: Pick<User, 'id' | 'firstName' | 'lastName'>;
  receiverAgent?: Pick<User, 'id' | 'firstName' | 'lastName'>;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  user?: Pick<User, 'id' | 'firstName' | 'lastName'>;
  action: string;
  entity: string;
  entityId: string;
  details?: unknown;
  ipAddress?: string;
  createdAt: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

// DTOs
export interface LoginDto {
  email: string;
  password: string;
}

export interface VerifyTotpDto {
  tempToken: string;
  totpCode: string;
}

export interface CreateTransactionDto {
  sourceAmount: number;
  sourceZoneId: string;
  destZoneId: string;
  senderName: string;
  recipientName: string;
}

export interface TransactionFilters {
  status?: TransactionStatus;
  sourceZoneId?: string;
  destZoneId?: string;
  agentId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface CreateUserDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: Role;
  zoneIds?: string[];
}

export interface StatsPeriod {
  period?: 'today' | '7d' | '30d' | 'custom';
  from?: string;
  to?: string;
}

export interface StatsSummary {
  total: number;
  pending: number;
  completed: number;
  cancelled: number;
  expired: number;
  totalSourceAmount: number;
  totalDestAmount: number;
}
