export type AppTab = 
  | 'dashboard' 
  | 'deployments' 
  | 'templates' 
  | 'wallet' 
  | 'settings' 
  | 'billing' 
  | 'pricing' 
  | 'suggest' 
  | 'invite'
  | 'admin';

export interface PurchaseRequest {
  id: string;
  referenceId: string;
  customerId: string;
  customerEmail: string;
  customerName: string;
  itemType: 'plan' | 'coin_pack';
  itemName: string;
  planId?: 'pro' | 'business';
  coinAmount?: number;
  priceLkr: number;
  priceFormatted: string;
  status: 'PENDING' | 'APPROVED' | 'FULFILLED' | 'REJECTED' | 'CANCELLED';
  createdAt: string;
  updatedAt?: string;
  adminNote?: string;
  fulfilledBy?: string;
}

export interface AdminCustomer {
  id: string;
  email: string;
  username: string;
  plan: 'mini' | 'pro' | 'business';
  coins: number;
  isSuspended: boolean;
  botStatus: 'online' | 'offline' | 'none';
  createdAt: string;
  lastActive: string;
  isOnline?: boolean;
  avatarUrl?: string;
  adminNote?: string;
  mediaUsed?: number;
  aiUsed?: number;
  totalEarnedCoins?: number;
  totalSpentCoins?: number;
  planActivatedAt?: string;
  planExpiresAt?: string;
}

export interface AdminWalletTransaction {
  id: string;
  customerId: string;
  customerEmail?: string;
  customerName?: string;
  adminId?: string;
  type: 'ADD' | 'DEDUCT' | 'PURCHASE' | 'SPENT' | 'REDEEM';
  amount: number;
  previousBalance: number;
  newBalance: number;
  reason: string;
  date: string;
  status: 'COMPLETED';
}

export interface LiveCustomerMetrics {
  totalCustomers: number;
  miniUsers: number;
  proUsers: number;
  businessUsers: number;
  onlineCustomers: number;
  activeToday: number;
  newRegistrationsToday: number;
  pendingPurchases: number;
  totalCoinsInCirculation: number;
  totalCoinsEarned: number;
  totalCoinsSpent: number;
  systemHealth: string;
}

export interface AdminAuditLog {
  id: string;
  timestamp: string;
  adminEmail: string;
  action: string;
  details: string;
  targetId?: string;
}

export interface AdminOverviewStats {
  totalCustomers: number;
  activeCustomers: number;
  activeBots: number;
  offlineBots: number;
  planDistribution: { mini: number; pro: number; business: number };
  totalCoinsInCirculation: number;
  pendingPurchases: number;
  completedPurchases: number;
  failedPurchases: number;
  systemHealth: string;
}

export type ThemeMode = 'dark' | 'light' | 'system';

export interface UserProfile {
  username: string;
  email: string;
  isVerified: boolean;
  signInMethod: string;
  plan: 'mini' | 'pro' | 'business';
  ownedPlans?: ('mini' | 'pro' | 'business')[];
  botSlotsUsed: number;
  botSlotsTotal: number;
  avatarLetter: string;
  emailNotifications: boolean;
  productUpdates: boolean;
}

export interface PlanTierConfig {
  id: 'mini' | 'pro' | 'business';
  name: string;
  badge: string;
  priceCoins: number;
  slots: number;
  mediaDailyQuota: number;
  aiDailyQuota: number;
  isFree: boolean;
  description: string;
  features: string[];
}

export interface Transaction {
  id: string;
  title: string;
  date: string;
  amount: number;
  category?: 'deploy' | 'claim' | 'bonus' | 'purchase' | 'promo' | 'unlock';
}

export interface CoinPack {
  id: string;
  coins: number;
  priceLkr: number;
  priceKes: number;
  daysEstimate: number;
  maxBots: number;
  isBestValue?: boolean;
}

export interface BotDeployment {
  id: string;
  name: string;
  templateName: string;
  platform: 'WhatsApp' | 'Discord' | 'Telegram' | 'NodeJS' | 'Python';
  status: 'running' | 'stopped' | 'rebuilding' | 'deploying';
  uptime: string;
  cpu: number;
  ramUsedMb: number;
  ramMaxMb: number;
  port: number;
  region: string;
  env: Record<string, string>;
  logs: string[];
}

export interface BotTemplate {
  id: string;
  name: string;
  title: string;
  description: string;
  platform: 'WhatsApp' | 'Discord' | 'Telegram' | 'NodeJS';
  category: string;
  badge?: string;
  costCoins: number;
  repoUrl: string;
  defaultEnv: { key: string; defaultValue: string; description: string; required: boolean }[];
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'info' | 'success' | 'warning';
}

export interface ToastItem {
  id: string;
  title?: string;
  message: string;
  type: 'success' | 'info' | 'error';
}

export interface PairingSession {
  phoneNumber: string;
  pairCode: string;
  status: 'idle' | 'generating' | 'ready' | 'linked';
  generatedAt: number;
  expiresInSeconds: number;
}

export interface ServerBotLog {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'CMD';
  message: string;
}

export interface CallEventLog {
  id: string;
  from: string;
  timestamp: string;
  rejected: boolean;
  replied: boolean;
}

export interface ServerBotConfig {
  botName: string;
  prefix: string;
  mode: 'public' | 'private';
  ownerNumber: string;
  autoReadStatus: boolean;
  plan: 'mini' | 'pro' | 'business';
  antiLink: boolean;
  antiSpam: boolean;
  welcomeMessage: boolean;
  welcomeTemplate: string;
  callDetectorEnabled: boolean;
  voiceAutoReplyEnabled: boolean;
}

export interface VoiceReply {
  id: string;
  name: string;
  triggers: string[];
  audioFileName: string;
  audioUrl: string;
  mimeType: string;
  fileSizeBytes: number;
  fileSizeFormatted: string;
  durationSeconds?: number;
  language: 'Sinhala' | 'English' | 'Both';
  enabled: boolean;
  scope: 'GLOBAL' | 'CUSTOMER';
  customerId?: string;
  customerEmail?: string;
  createdAt: string;
  updatedAt?: string;
  playCount: number;
  lastPlayedAt?: string;
}

export interface PlanQuotas {
  mediaRequestsUsed: number;
  mediaQuotaMax: number;
  aiRequestsUsed: number;
  aiQuotaMax: number;
  maxBotSlots: number;
  maxVoiceReplies?: number;
}

export interface ServerBotState {
  connectionStatus: 'disconnected' | 'connecting' | 'qr_ready' | 'pairing_code_ready' | 'connected' | 'reconnecting';
  isOnline: boolean;
  pairedNumber: string | null;
  qrCodeDataUrl: string | null;
  pairingCode: string | null;
  uptimeSeconds: number;
  startedAt: string | null;
  lastPingMs: number;
  totalMessagesReceived: number;
  totalCommandsExecuted: number;
  totalAiQueries: number;
  activeGroupCount: number;
  incomingCallsCount: number;
  callsRejectedCount: number;
  autoRepliesSentCount: number;
  voiceAutoRepliesSentCount: number;
  recentCalls: CallEventLog[];
  config: ServerBotConfig;
  quotas: PlanQuotas;
}
