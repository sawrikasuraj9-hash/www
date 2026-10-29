import { UserProfile, Transaction, CoinPack, BotDeployment, BotTemplate, AppNotification, PlanTierConfig } from '../types';

export const APP_CONFIG = {
  brandName: 'YASHI HALLS',
  botTemplateName: 'YASHI HALLS PRO',
  logoUrl: 'https://i.ibb.co/gM1MwL9T/IMG-20261024-WA0008.jpg',
  showcaseImageUrl: 'https://i.ibb.co/SXkrpMDm/images-12.jpg',
  whatsappChannelUrl: 'https://whatsapp.com/channel/0029Vb927N4GJP8MS1yurM2Z',
  ownerNumber: '0740712934',
  ownerNumberFull: '94740712934',
};

export const PLAN_PRICING: Record<'mini' | 'pro' | 'business', PlanTierConfig> = {
  mini: {
    id: 'mini',
    name: 'YASHI HALLS MINI',
    badge: 'FREE',
    priceCoins: 0,
    slots: 1,
    mediaDailyQuota: 5,
    aiDailyQuota: 10,
    isFree: true,
    description: 'Lightweight Baileys bot for single device personal chats and basic utility.',
    features: [
      '1 Bot Container Slot',
      'Basic Media (.song, .video, .img)',
      'Basic AI Chat (.ai, .ask)',
      'Quick Reply Buttons & Fallback',
      'Basic Group Tools (.groupinfo, .tagall)',
      'Incoming Call Detection & Auto-Reply',
    ],
  },
  pro: {
    id: 'pro',
    name: 'YASHI HALLS PRO',
    badge: 'POPULAR VIP',
    priceCoins: 10,
    slots: 5,
    mediaDailyQuota: 1000,
    aiDailyQuota: 5000,
    isFree: false,
    description: 'Powerhouse WhatsApp platform with 5 bot containers, unlimited media, and full automation.',
    features: [
      '5 Bot Slots & Multi-Session',
      'Unlimited Media (.song, .play, .tiktok, .ig, .fb)',
      'Advanced AI (.write, .code, .translate, .imagine)',
      'Anti-Link Defense & Group Auto-Ban (.warn, .kick)',
      'Auto Status Story Viewer & Group Welcome',
      'Incoming Call Detector & Rejection Engine',
      'Priority 24/7 Cluster Uptime',
    ],
  },
  business: {
    id: 'business',
    name: 'YASHI HALLS BUSINESS',
    badge: 'ENTERPRISE FLEET',
    priceCoins: 30,
    slots: 25,
    mediaDailyQuota: 999999,
    aiDailyQuota: 999999,
    isFree: false,
    description: 'Enterprise Multi-Agent fleet with dedicated cloud nodes, white-label branding, and SLA.',
    features: [
      '25 Bot Slots & Fleet Management',
      'Dedicated High-Speed Node & Zero Rate-Limits',
      'White-Label Custom Bot Branding & Profile Sync',
      'Automated Mass Broadcast & Auto-Responder',
      'Incoming Call Detector with Fleet Filter Logs',
      'Rest API Webhook Access for External Systems',
      'VIP 24/7 Priority Support (+94 74 071 2934)',
    ],
  },
};

export const INITIAL_USER: UserProfile = {
  username: 'Sawrika-Suraj',
  email: 'sawrikasuraj759@gmail.com',
  isVerified: true,
  signInMethod: 'GOOGLE',
  plan: 'mini',
  ownedPlans: ['mini'],
  botSlotsUsed: 0,
  botSlotsTotal: 1,
  avatarLetter: 'H',
  emailNotifications: true,
  productUpdates: false,
};

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-1',
    title: 'Welcome bonus for Account Creation (+5 coins)',
    date: 'Just now',
    amount: 5,
    category: 'bonus',
  },
];

export const COIN_PACKS: CoinPack[] = [
  {
    id: 'pack-50',
    coins: 50,
    priceLkr: 76.49,
    priceKes: 30,
    daysEstimate: 5,
    maxBots: 5,
  },
  {
    id: 'pack-140',
    coins: 140,
    priceLkr: 178,
    priceKes: 70,
    daysEstimate: 14,
    maxBots: 5,
  },
  {
    id: 'pack-300',
    coins: 300,
    priceLkr: 382,
    priceKes: 150,
    daysEstimate: 30,
    maxBots: 7,
  },
  {
    id: 'pack-750',
    coins: 750,
    priceLkr: 956,
    priceKes: 375,
    daysEstimate: 75,
    maxBots: 10,
  },
  {
    id: 'pack-1600',
    coins: 1600,
    priceLkr: 2040,
    priceKes: 800,
    daysEstimate: 160,
    maxBots: 12,
    isBestValue: true,
  },
];

// Clean slate: 0 pre-running bots for a new customer
export const INITIAL_BOTS: BotDeployment[] = [];

// Dual Plan Templates: YASHI HALLS MINI and YASHI HALLS PRO
export const BOT_TEMPLATES: BotTemplate[] = [
  {
    id: 'tpl-yashi-halls-mini',
    name: 'YASHI HALLS MINI',
    title: 'YASHI HALLS MINI WhatsApp Bot',
    description: 'Lightweight & dependable WhatsApp Bot for individuals and basic groups. Includes .menu, .ping, .owner, limited media (.song, .video, .img, .sticker), basic YASHI HALLS AI chat, games (.guess, .quiz), and single container slot.',
    platform: 'WhatsApp',
    category: 'Basic Bots',
    badge: 'STARTER / MINI',
    costCoins: 0,
    repoUrl: 'https://github.com/hashi-halls/yashi-halls-mini',
    defaultEnv: [
      { key: 'SESSION_ID', defaultValue: '', description: 'Your WhatsApp Pair Code or Session ID', required: true },
      { key: 'PREFIX', defaultValue: '.', description: 'Command trigger prefix (e.g. . or !)', required: false },
      { key: 'OWNER_NUMBER', defaultValue: '94740712934', description: 'Bot owner phone number (0740712934 / 94740712934)', required: true },
      { key: 'BOT_NAME', defaultValue: 'YASHI HALLS MINI', description: 'Custom bot display name', required: false },
    ],
  },
  {
    id: 'tpl-yashi-halls-pro',
    name: 'YASHI HALLS PRO',
    title: 'YASHI HALLS PRO WhatsApp Bot Platform',
    description: 'High-performance WhatsApp Multi-Device power engine with Multi-Session slots (up to 5 bots), unlimited media (.song, .play, .video, .audio, .tiktok, .instagram, .facebook), advanced YASHI HALLS AI (.translate, .summarize, .write, .code, .imagine, .ocr), Anti-Link/Anti-Spam security, and automated story viewer.',
    platform: 'WhatsApp',
    category: 'Pro Bots',
    badge: 'OFFICIAL PRO',
    costCoins: 10,
    repoUrl: 'https://github.com/hashi-halls/yashi-halls-pro',
    defaultEnv: [
      { key: 'SESSION_ID', defaultValue: '', description: 'Your WhatsApp Pair Code or Session ID', required: true },
      { key: 'PREFIX', defaultValue: '.', description: 'Command trigger prefix (e.g. . or !)', required: false },
      { key: 'OWNER_NUMBER', defaultValue: '94740712934', description: 'Bot owner phone number (0740712934 / 94740712934)', required: true },
      { key: 'AUTO_READ_STATUS', defaultValue: 'true', description: 'Automatically view contacts status stories', required: false },
      { key: 'ANTI_LINK', defaultValue: 'true', description: 'Block unauthorized group invite links', required: false },
      { key: 'BOT_NAME', defaultValue: 'YASHI HALLS PRO', description: 'Custom bot display name', required: false },
    ],
  },
];

export const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-1',
    title: 'Welcome to YASHI HALLS!',
    message: '+10 free coins credited to your wallet. Pair your device to deploy YASHI HALLS PRO.',
    time: 'Just now',
    read: false,
    type: 'success',
  },
];
