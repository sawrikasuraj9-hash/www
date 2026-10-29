import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import { 
  AppTab, 
  ThemeMode, 
  UserProfile, 
  Transaction, 
  CoinPack, 
  BotDeployment, 
  BotTemplate, 
  AppNotification, 
  ToastItem,
  PairingSession,
  ServerBotState,
  ServerBotLog,
  ServerBotConfig,
  PurchaseRequest
} from '../types';
import { 
  INITIAL_USER, 
  INITIAL_TRANSACTIONS, 
  INITIAL_NOTIFICATIONS,
  BOT_TEMPLATES 
} from '../data/initialData';
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signInWithCredential,
  GoogleAuthProvider,
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile,
  doc,
  getDoc,
  setDoc,
  FirebaseUser
} from '../firebase';
import { soundFX } from '../utils/sound';

interface AppContextType {
  // Auth Gate
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithGoogleCredential: (idToken: string) => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<boolean>;
  signupWithEmail: (name: string, email: string, pass: string) => Promise<boolean>;
  loginAsDemo: (demoEmail?: string) => void;
  logout: () => Promise<void>;

  // User Profile & Coins
  user: UserProfile;
  updateUser: (partial: Partial<UserProfile>) => void;
  coins: number;
  addCoins: (amount: number, reason: string, category?: Transaction['category']) => void;
  transactions: Transaction[];
  redeemPromoCode: (code: string) => { success: boolean; message: string };
  claimDailyCoins: () => { success: boolean; message: string };
  cooldownSeconds: number;
  isClaimReady: boolean;

  // Real WhatsApp Server Engine State
  serverBotState: ServerBotState | null;
  serverLogs: ServerBotLog[];
  isBackendConnected: boolean;
  refreshBotStatus: () => Promise<void>;
  lastKeepAlivePulse: string | null;
  keepAliveStatus: 'active' | 'standby' | 'error';
  sendKeepAlivePing: () => Promise<void>;
  startBot: (phone?: string) => Promise<{ success: boolean; message: string }>;
  stopBot: () => Promise<{ success: boolean; message: string }>;
  restartBot: (id?: string) => Promise<void>;
  toggleBotState: (id?: string) => Promise<void>;
  deleteBot: (id?: string) => Promise<void> | void;
  updateBotEnv: (id: string, env: Record<string, string>) => void;
  updateBotConfig: (config: Partial<ServerBotConfig>) => Promise<void>;
  clearSession: () => Promise<{ success: boolean; message: string }>;

  // WhatsApp Pairing State
  pairingSession: PairingSession | null;
  generatePairCode: (phone: string) => Promise<{ success: boolean; code?: string; message: string }>;
  generateQrCode: () => Promise<{ success: boolean; message: string }>;
  linkAndDeployPairedBot: (customName?: string) => Promise<{ success: boolean; message: string }>;
  deployBot: (template: BotTemplate, name: string, env: Record<string, string>) => Promise<{ success: boolean; message: string }>;

  // Bot Instances
  bots: BotDeployment[];
  botUnlockClaim: boolean;
  unlockBotClaim: () => void;

  // Navigation & Theme
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;

  // Modals
  openDeployModal: boolean;
  setOpenDeployModal: (open: boolean) => void;
  selectedTemplateForDeploy: BotTemplate | null;
  setSelectedTemplateForDeploy: (tpl: BotTemplate | null) => void;
  openCoinModal: boolean;
  setOpenCoinModal: (open: boolean) => void;
  selectedCoinPack: CoinPack | null;
  setSelectedCoinPack: (pack: CoinPack | null) => void;
  openTerminalBot: BotDeployment | null;
  setOpenTerminalBot: (bot: BotDeployment | null) => void;
  openSupportModal: boolean;
  setOpenSupportModal: (open: boolean) => void;
  openProModal: boolean;
  setOpenProModal: (open: boolean) => void;
  planToPurchase: 'mini' | 'pro' | 'business' | null;
  setPlanToPurchase: (plan: 'mini' | 'pro' | 'business' | null) => void;
  openInviteModal: boolean;
  setOpenInviteModal: (open: boolean) => void;
  openDeleteAccountModal: boolean;
  setOpenDeleteAccountModal: (open: boolean) => void;
  openEditBotModal: boolean;
  setOpenEditBotModal: (open: boolean) => void;

  // Notifications & Toasts
  notifications: AppNotification[];
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  toasts: ToastItem[];
  addToast: (message: string, type?: 'success' | 'info' | 'error') => void;
  removeToast: (id: string) => void;
  upgradeToPro: () => void;
  changePlan: (plan: 'mini' | 'pro' | 'business') => Promise<void>;
  purchasePlan: (plan: 'mini' | 'pro' | 'business') => Promise<{ success: boolean; message: string; needCoins?: boolean }>;
  syncBotProfilePic: (customLogoUrl?: string) => Promise<void>;
  resetQuotas: () => Promise<void>;
  resetAccountData: () => void;

  // Admin & Manual Purchase State
  isAdmin: boolean;
  adminWhatsappNumber: string;
  userPurchaseRequests: PurchaseRequest[];
  submitPurchaseRequest: (item: {
    itemType: 'plan' | 'coin_pack';
    itemName: string;
    planId?: 'pro' | 'business';
    coinAmount?: number;
    priceLkr: number;
    priceFormatted?: string;
  }) => Promise<{ success: boolean; request?: PurchaseRequest; message: string; whatsappUrl?: string }>;
  refreshUserPurchases: () => Promise<void>;
  effectiveUserId: string;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const PROMO_CODES: Record<string, number> = {
  'YASHI-LAUNCH': 20,
  'HASHI-LAUNCH': 20,
  'YASHI-PRO': 25,
  'BONUS50': 50,
  'FREEBOT': 10,
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('yashi_auth_session');
      return Boolean(saved);
    } catch {
      return false;
    }
  });
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(false);
  const [currentFirebaseUser, setCurrentFirebaseUser] = useState<FirebaseUser | null>(null);

  const [user, setUser] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem('yashi_auth_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.userProfile) return parsed.userProfile;
      }
    } catch {}
    return INITIAL_USER;
  });
  const [coins, setCoins] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('yashi_auth_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.coins === 'number') return parsed.coins;
      }
    } catch {}
    return 5;
  });
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [redeemedCodes, setRedeemedCodes] = useState<string[]>([]);
  const [botUnlockClaim, setBotUnlockClaim] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<AppTab>('dashboard');
  const [theme, setThemeState] = useState<ThemeMode>('dark');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  // Compute effective user ID for multi-tenant bot sessions and storage
  const effectiveUserId = React.useMemo(() => {
    if (currentFirebaseUser?.uid) {
      return currentFirebaseUser.uid;
    }
    if (isAuthenticated && user?.email) {
      return `user_${user.email.toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '_')}`;
    }
    return 'guest';
  }, [currentFirebaseUser?.uid, isAuthenticated, user?.email]);

  const getBotHeaders = useCallback((extra: Record<string, string> = {}) => {
    return {
      'x-user-id': effectiveUserId,
      ...extra,
    };
  }, [effectiveUserId]);

  // Real Server Engine State (isolated per customer)
  const [serverBotState, setServerBotState] = useState<ServerBotState | null>(null);
  const [serverLogs, setServerLogs] = useState<ServerBotLog[]>([]);
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false);
  const [lastKeepAlivePulse, setLastKeepAlivePulse] = useState<string | null>(null);
  const [keepAliveStatus, setKeepAliveStatus] = useState<'active' | 'standby' | 'error'>('standby');

  // Concurrency & Memory Leak Prevention Refs
  const isStatusFetchingRef = useRef<boolean>(false);
  const isLogsFetchingRef = useRef<boolean>(false);
  const isKeepAliveFetchingRef = useRef<boolean>(false);
  const statusAbortControllerRef = useRef<AbortController | null>(null);
  const keepAliveAbortControllerRef = useRef<AbortController | null>(null);

  // Pairing Session State (isolated per customer)
  const [pairingSession, setPairingSession] = useState<PairingSession | null>(null);
  const wasOnlineRef = useRef<boolean>(false);

  // Cooldown timer - 24 hours (86400 seconds)
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(() => {
    try {
      const stored = localStorage.getItem('yashi_last_claim_timestamp');
      if (stored) {
        const last = parseInt(stored, 10);
        if (!isNaN(last) && last > 0) {
          const elapsed = Math.floor((Date.now() - last) / 1000);
          return Math.max(0, 86400 - elapsed);
        }
      }
    } catch {
      // fallback
    }
    return 0; // ready for the first daily claim!
  });

  // Real 1-second interval ticker for 24-hour daily coin cooldown
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds((prev) => {
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  // Modals
  const [openDeployModal, setOpenDeployModal] = useState<boolean>(false);
  const [selectedTemplateForDeploy, setSelectedTemplateForDeploy] = useState<BotTemplate | null>(null);
  const [openCoinModal, setOpenCoinModal] = useState<boolean>(false);
  const [selectedCoinPack, setSelectedCoinPack] = useState<CoinPack | null>(null);
  const [openTerminalBot, setOpenTerminalBot] = useState<BotDeployment | null>(null);
  const [openSupportModal, setOpenSupportModal] = useState<boolean>(false);
  const [openProModal, setOpenProModal] = useState<boolean>(false);
  const [planToPurchase, setPlanToPurchase] = useState<'mini' | 'pro' | 'business' | null>(null);
  const [openInviteModal, setOpenInviteModal] = useState<boolean>(false);
  const [openDeleteAccountModal, setOpenDeleteAccountModal] = useState<boolean>(false);
  const [openEditBotModal, setOpenEditBotModal] = useState<boolean>(false);

  // Notifications & Toasts
  const [notifications, setNotifications] = useState<AppNotification[]>(INITIAL_NOTIFICATIONS);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((message: string, type: 'success' | 'info' | 'error' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 65,
        spread: 75,
        origin: { y: 0.6 },
        colors: ['#00d084', '#10b981', '#38bdf8', '#ffffff'],
      });
    } catch {
      // ignore
    }
  };

  // 24/7 Dedicated Keep-Alive Heartbeat (every 25s - prevents Cloud Run idling without flooding)
  const sendKeepAlivePing = useCallback(async () => {
    if (isKeepAliveFetchingRef.current) return;
    isKeepAliveFetchingRef.current = true;
    try {
      keepAliveAbortControllerRef.current?.abort();
      const controller = new AbortController();
      keepAliveAbortControllerRef.current = controller;

      const res = await fetch('/api/keepalive', {
        headers: getBotHeaders(),
        signal: controller.signal,
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        const pulseTime = data.timestamp 
          ? new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLastKeepAlivePulse(pulseTime);
        setKeepAliveStatus('active');
        setIsBackendConnected(true);
      } else {
        setKeepAliveStatus('error');
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        setKeepAliveStatus('error');
      }
    } finally {
      isKeepAliveFetchingRef.current = false;
    }
  }, [getBotHeaders]);

  // Real Backend Status Polling - Isolated per Customer with Concurrency & Overlap Guard
  const refreshBotStatus = useCallback(async () => {
    if (!isAuthenticated) {
      setServerBotState(null);
      setServerLogs([]);
      return;
    }

    // Skip tick if previous request is still in-flight to prevent request piling
    if (isStatusFetchingRef.current) {
      return;
    }

    isStatusFetchingRef.current = true;
    try {
      statusAbortControllerRef.current?.abort();
      const controller = new AbortController();
      statusAbortControllerRef.current = controller;

      const res = await fetch('/api/bot/status', {
        headers: getBotHeaders(),
        signal: controller.signal,
        cache: 'no-store',
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setServerBotState(json.data);
          setIsBackendConnected(true);

          // Verify genuine WhatsApp Baileys connection status (not merely HTTP 200)
          const genuineOnline = Boolean(json.data.isOnline && json.data.connectionStatus === 'connected');
          if (genuineOnline && !wasOnlineRef.current) {
            wasOnlineRef.current = true;
            soundFX.playSuccess();
            triggerConfetti();
            addToast(`🎉 WhatsApp Connected Successfully! Bot is now active 24/7.`, 'success');
          } else if (!genuineOnline) {
            wasOnlineRef.current = false;
          }

          // Sync pairing session if backend generated code
          if (json.data.pairingCode) {
            setPairingSession((prev) => ({
              phoneNumber: json.data.pairedNumber || prev?.phoneNumber || '',
              pairCode: json.data.pairingCode,
              status: genuineOnline ? 'linked' : 'ready',
              generatedAt: prev?.generatedAt || Date.now(),
              expiresInSeconds: prev?.expiresInSeconds && prev.expiresInSeconds > 0 ? prev.expiresInSeconds : 120,
            }));
          } else if (genuineOnline) {
            setPairingSession((prev) => prev ? { ...prev, status: 'linked' } : null);
          }
        }
      } else {
        setIsBackendConnected(false);
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        setIsBackendConnected(false);
      }
    } finally {
      isStatusFetchingRef.current = false;
    }
  }, [isAuthenticated, getBotHeaders, addToast]);

  // Real Backend Logs Polling - Isolated per Customer
  const fetchLogs = useCallback(async () => {
    if (!isAuthenticated) {
      setServerLogs([]);
      return;
    }
    if (isLogsFetchingRef.current) return;
    isLogsFetchingRef.current = true;
    try {
      const res = await fetch('/api/bot/logs', {
        headers: getBotHeaders(),
        cache: 'no-store',
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setServerLogs(json.data);
        }
      }
    } catch {
      // ignore
    } finally {
      isLogsFetchingRef.current = false;
    }
  }, [isAuthenticated, getBotHeaders]);

  // High-Frequency 1-Second Status Engine + 25-Second Keep-Alive Heartbeat
  useEffect(() => {
    if (!isAuthenticated) {
      setServerBotState(null);
      setServerLogs([]);
      setPairingSession(null);
      wasOnlineRef.current = false;
      return;
    }

    // 1. Initial immediate trigger
    refreshBotStatus();
    fetchLogs();
    sendKeepAlivePing();

    // 2. Status Polling timer: 1000ms when tab is visible, 6000ms when in background
    let statusIntervalTimer: NodeJS.Timeout | null = null;

    const setupStatusInterval = (intervalMs: number) => {
      if (statusIntervalTimer) clearInterval(statusIntervalTimer);
      statusIntervalTimer = setInterval(() => {
        refreshBotStatus();
      }, intervalMs);
    };

    // Start with 1000ms (1 second) interval as requested
    setupStatusInterval(1000);

    // 3. Keep-Alive Heartbeat timer: every 25 seconds (25,000ms)
    // Optimal interval: keeps container warm, avoids request flood & rate limits
    const keepAliveTimer = setInterval(() => {
      sendKeepAlivePing();
    }, 25000);

    // 4. Logs Polling timer: every 4 seconds
    const logsTimer = setInterval(() => {
      fetchLogs();
    }, 4000);

    // 5. Page Visibility Listener (handles tab switching cleanly without memory leaks)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab moved to background: throttle status polling to 6s to prevent browser throttling/congestion
        setupStatusInterval(6000);
      } else {
        // Tab brought to foreground: immediately refresh and restore 1-second interval
        refreshBotStatus();
        setupStatusInterval(1000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 6. Cleanup: Guaranteed cancellation of all timers & aborting pending requests
    return () => {
      if (statusIntervalTimer) clearInterval(statusIntervalTimer);
      clearInterval(keepAliveTimer);
      clearInterval(logsTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      statusAbortControllerRef.current?.abort();
      keepAliveAbortControllerRef.current?.abort();
    };
  }, [isAuthenticated, refreshBotStatus, fetchLogs, sendKeepAlivePing]);

  // Real Firebase Auth State Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setIsAuthLoading(false);
      if (fbUser) {
        setCurrentFirebaseUser(fbUser);
        setIsAuthenticated(true);

        const email = fbUser.email || '';
        const name = fbUser.displayName || email.split('@')[0] || 'User';
        const isGoogle = fbUser.providerData.some((p) => p.providerId === 'google.com');

        try {
          const userDocRef = doc(db, 'users', fbUser.uid);
          const snap = await getDoc(userDocRef);
          if (snap.exists()) {
            const data = snap.data();
            const rawPlan = data.plan;
            const userPlan: 'mini' | 'pro' | 'business' = rawPlan === 'business' ? 'business' : rawPlan === 'pro' ? 'pro' : 'mini';
            const slotsTotal = userPlan === 'business' ? 25 : userPlan === 'pro' ? 5 : 1;
            const initialOwned: ('mini' | 'pro' | 'business')[] = Array.isArray(data.ownedPlans) 
              ? data.ownedPlans 
              : ['mini', ...(userPlan !== 'mini' ? [userPlan] : [])];

            setUser({
              username: data.username || name,
              email: data.email || email,
              isVerified: fbUser.emailVerified || isGoogle,
              signInMethod: isGoogle ? 'GOOGLE' : 'EMAIL',
              plan: userPlan,
              ownedPlans: initialOwned,
              botSlotsUsed: serverBotState?.isOnline ? 1 : 0,
              botSlotsTotal: slotsTotal,
              avatarLetter: (data.username || name).charAt(0).toUpperCase(),
              emailNotifications: true,
              productUpdates: false,
            });
            if (typeof data.coins === 'number') {
              setCoins(data.coins);
            }
            if (typeof data.lastDailyClaim === 'number') {
              const elapsed = Math.floor((Date.now() - data.lastDailyClaim) / 1000);
              setCooldownSeconds(Math.max(0, 86400 - elapsed));
            }

            // Real-time synchronization to Admin Panel
            fetch('/api/admin/customers/sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: fbUser.uid,
                email: data.email || email,
                username: data.username || name,
                plan: userPlan,
                coins: typeof data.coins === 'number' ? data.coins : 5,
                botStatus: serverBotState?.isOnline ? 'online' : 'none',
              }),
            }).catch(() => {});
          } else {
            const newUserProfile = {
              username: name,
              email,
              plan: 'mini',
              coins: 5,
              createdAt: new Date().toISOString(),
            };
            await setDoc(userDocRef, newUserProfile);
            setCoins(5);
            setUser({
              username: name,
              email,
              isVerified: fbUser.emailVerified || isGoogle,
              signInMethod: isGoogle ? 'GOOGLE' : 'EMAIL',
              plan: 'mini',
              ownedPlans: ['mini'],
              botSlotsUsed: 0,
              botSlotsTotal: 1,
              avatarLetter: name.charAt(0).toUpperCase(),
              emailNotifications: true,
              productUpdates: false,
            });

            // Real-time synchronization of new customer registration to Admin Panel
            fetch('/api/admin/customers/sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: fbUser.uid,
                email,
                username: name,
                plan: 'mini',
                coins: 5,
                botStatus: 'none',
              }),
            }).catch(() => {});
          }
        } catch (err: any) {
          const isOffline = err?.message?.includes('offline') || err?.code === 'unavailable';
          if (isOffline) {
            console.warn('Operating in offline/cached profile mode:', err?.message || err);
          } else {
            console.error('Error fetching Firestore user profile:', err);
          }
          setCoins(5);
          setUser({
            username: name,
            email,
            isVerified: fbUser.emailVerified || isGoogle,
            signInMethod: isGoogle ? 'GOOGLE' : 'EMAIL',
            plan: 'mini',
            ownedPlans: ['mini'],
            botSlotsUsed: 0,
            botSlotsTotal: 1,
            avatarLetter: name.charAt(0).toUpperCase(),
            emailNotifications: true,
            productUpdates: false,
          });
        }
      } else {
        try {
          const savedSession = localStorage.getItem('yashi_auth_session');
          if (savedSession) {
            const parsed = JSON.parse(savedSession);
            if (parsed && parsed.email) {
              return;
            }
          }
        } catch {}
        setCurrentFirebaseUser(null);
        setIsAuthenticated(false);
        setUser(INITIAL_USER);
        setServerBotState(null);
        setServerLogs([]);
        setPairingSession(null);
        wasOnlineRef.current = false;
      }
    });

    return () => unsubscribe();
  }, [serverBotState?.isOnline]);

  // Derived Real Bot Deployment based on Server Engine State
  const bots: BotDeployment[] = React.useMemo(() => {
    if (!serverBotState || serverBotState.connectionStatus === 'disconnected') {
      return [];
    }

    const logMessages = serverLogs.map((l) => `[${l.timestamp}] [${l.level}] ${l.message}`);
    const uptimeStr = serverBotState.uptimeSeconds > 0
      ? `${Math.floor(serverBotState.uptimeSeconds / 60)}m ${serverBotState.uptimeSeconds % 60}s`
      : 'Starting...';

    const statusMap: Record<string, BotDeployment['status']> = {
      connected: 'running',
      connecting: 'deploying',
      reconnecting: 'rebuilding',
      qr_ready: 'deploying',
      pairing_code_ready: 'deploying',
      disconnected: 'stopped',
    };

    return [
      {
        id: 'bot-yashi-pro-instance',
        name: serverBotState.config.botName.toUpperCase().replace(/\s+/g, '-'),
        templateName: serverBotState.config.plan === 'pro' ? 'YASHI HALLS PRO WhatsApp Bot' : 'YASHI HALLS MINI WhatsApp Bot',
        platform: 'WhatsApp',
        status: statusMap[serverBotState.connectionStatus] || 'running',
        uptime: uptimeStr,
        cpu: serverBotState.isOnline ? 1.8 : 0.0,
        ramUsedMb: serverBotState.isOnline ? 142 : 45,
        ramMaxMb: serverBotState.config.plan === 'pro' || user.plan === 'pro' ? 2048 : 512,
        port: 3001,
        region: 'ap-southeast-1 (Colombo/Singapore)',
        env: {
          SESSION_ID: serverBotState.pairedNumber ? `YASHI~${serverBotState.pairedNumber}` : '',
          PREFIX: serverBotState.config.prefix,
          OWNER_NUMBER: serverBotState.config.ownerNumber,
          MODE: serverBotState.config.mode,
          AUTO_READ_STATUS: String(serverBotState.config.autoReadStatus),
          BOT_NAME: serverBotState.config.botName,
        },
        logs: logMessages.length > 0 ? logMessages : ['[SYSTEM] Bot engine active. Awaiting logs...'],
      },
    ];
  }, [serverBotState, serverLogs, user.plan]);

  // Actions connecting directly to Node.js Baileys Backend (Tenant Isolated)
  const startBot = async (phone?: string): Promise<{ success: boolean; message: string }> => {
    try {
      addToast('Starting WhatsApp Bot Engine...', 'info');
      const res = await fetch('/api/bot/start', {
        method: 'POST',
        headers: getBotHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ phoneNumber: phone, userId: effectiveUserId }),
      });
      const data = await res.json();
      await refreshBotStatus();
      if (data.success) {
        addToast(data.message || 'Bot engine started', 'success');
      } else {
        addToast(data.message || 'Failed to start bot', 'error');
      }
      return data;
    } catch (err: any) {
      addToast(err?.message || 'Error communicating with backend', 'error');
      return { success: false, message: err?.message || 'Server error' };
    }
  };

  const stopBot = async (): Promise<{ success: boolean; message: string }> => {
    try {
      addToast('Stopping WhatsApp Bot Engine...', 'info');
      const res = await fetch('/api/bot/stop', {
        method: 'POST',
        headers: getBotHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ userId: effectiveUserId }),
      });
      const data = await res.json();
      await refreshBotStatus();
      addToast(data.message || 'Bot stopped', 'info');
      return data;
    } catch (err: any) {
      addToast(err?.message || 'Failed to stop bot', 'error');
      return { success: false, message: err?.message || 'Server error' };
    }
  };

  const restartBot = async (id?: string) => {
    try {
      addToast('Restarting WhatsApp Bot Engine...', 'info');
      soundFX.playClick();
      const res = await fetch('/api/bot/restart', {
        method: 'POST',
        headers: getBotHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ userId: effectiveUserId }),
      });
      const data = await res.json();
      await refreshBotStatus();
      if (data.success) {
        soundFX.playSuccess();
        addToast('Bot restarted and reconnected successfully!', 'success');
      } else {
        addToast(data.message || 'Restart error', 'error');
      }
    } catch (err: any) {
      addToast(err?.message || 'Restart failed', 'error');
    }
  };

  const toggleBotState = async (id?: string) => {
    soundFX.playClick();
    if (serverBotState && serverBotState.connectionStatus !== 'disconnected') {
      await stopBot();
    } else {
      await startBot();
    }
  };

  const deleteBot = async (id?: string) => {
    soundFX.playClick();
    addToast('Stopping and deleting bot container...', 'info');
    await stopBot();
    await clearSession();
    setPairingSession(null);
    await refreshBotStatus();
    addToast('Bot deployment completely removed and deleted.', 'success');
  };

  const updateBotEnv = (id: string, env: Record<string, string>) => {
    updateBotConfig({
      prefix: env.PREFIX,
      ownerNumber: env.OWNER_NUMBER,
      botName: env.BOT_NAME,
      mode: (env.MODE as 'public' | 'private') || 'public',
    });
  };

  const updateBotConfig = async (newConfig: Partial<ServerBotConfig>) => {
    try {
      const res = await fetch('/api/bot/config', {
        method: 'POST',
        headers: getBotHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ ...newConfig, userId: effectiveUserId }),
      });
      const data = await res.json();
      if (data.success) {
        addToast('Bot configuration updated and applied live.', 'success');
        await refreshBotStatus();
      }
    } catch (err: any) {
      addToast('Failed to update bot config', 'error');
    }
  };

  const clearSession = async (): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetch('/api/bot/clear-session', {
        method: 'POST',
        headers: getBotHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ userId: effectiveUserId }),
      });
      const data = await res.json();
      setPairingSession(null);
      await refreshBotStatus();
      addToast('WhatsApp session cleared. Ready for fresh pairing.', 'info');
      return data;
    } catch (err: any) {
      return { success: false, message: err?.message || 'Error' };
    }
  };

  // Real Phone Pairing Code Generator
  const generatePairCode = async (phone: string): Promise<{ success: boolean; code?: string; message: string }> => {
    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0') && cleanPhone.length === 10) {
      cleanPhone = '94' + cleanPhone.slice(1);
    }
    if (cleanPhone.length < 8) {
      addToast('Please enter a valid WhatsApp number (e.g. 0740712934 or 94740712934)', 'error');
      return { success: false, message: 'Invalid phone number format' };
    }

    setPairingSession({
      phoneNumber: cleanPhone,
      pairCode: '',
      status: 'generating',
      generatedAt: Date.now(),
      expiresInSeconds: 120,
    });

    try {
      const res = await fetch('/api/bot/pair/code', {
        method: 'POST',
        headers: getBotHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ phoneNumber: cleanPhone, userId: effectiveUserId }),
      });

      let data: any = null;
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        try {
          data = await res.json();
        } catch {}
      }

      // If code was returned directly
      if (data && data.success && data.code) {
        setPairingSession({
          phoneNumber: cleanPhone,
          pairCode: data.code,
          status: 'ready',
          generatedAt: Date.now(),
          expiresInSeconds: 120,
        });
        setServerBotState((prev: any) => prev ? { ...prev, pairingCode: data.code, connectionStatus: 'pairing_code_ready' } : ({ pairingCode: data.code, connectionStatus: 'pairing_code_ready' } as any));
        soundFX.playSuccess();
        triggerConfetti();
        addToast(`WhatsApp Pairing Code ready: ${data.code}`, 'success');
        return data;
      }

      // Active polling fallback in case connection takes a few seconds
      addToast('Connecting to WhatsApp gateway, generating pairing code...', 'info');
      let foundCode = false;
      for (let i = 0; i < 12; i++) {
        await new Promise((r) => setTimeout(r, 1200));
        try {
          const statusRes = await fetch('/api/bot/status', {
            headers: getBotHeaders(),
          });
          if (statusRes.ok) {
            const statusJson = await statusRes.json();
            if (statusJson.success && statusJson.data?.pairingCode) {
              const code = statusJson.data.pairingCode;
              setPairingSession({
                phoneNumber: cleanPhone,
                pairCode: code,
                status: 'ready',
                generatedAt: Date.now(),
                expiresInSeconds: 120,
              });
              setServerBotState(statusJson.data);
              soundFX.playSuccess();
              triggerConfetti();
              addToast(`WhatsApp Pairing Code ready: ${code}`, 'success');
              foundCode = true;
              return { success: true, code, message: 'Pairing code ready.' };
            }
          }
        } catch {}
      }

      if (!foundCode) {
        setPairingSession(null);
        addToast('Pairing code generation timed out. Please tap Generate Pairing Code again.', 'error');
        return { success: false, message: 'Timed out' };
      }
      return { success: true, message: 'Done' };
    } catch (err: any) {
      console.warn('Pairing error:', err);
      await refreshBotStatus();
      return { success: false, message: 'Please try again' };
    }
  };

  // Real QR Code Generator
  const generateQrCode = useCallback(async (): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetch("/api/bot/pair/qr", {
        method: "POST",
        headers: getBotHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ userId: effectiveUserId }),
      });
      let data: any = null;
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        try {
          data = await res.json();
        } catch {}
      }
      if (data && data.success && data.qr) {
        setServerBotState((prev: any) => prev ? { ...prev, qrCodeDataUrl: data.qr, connectionStatus: 'qr_ready' } : ({ qrCodeDataUrl: data.qr, connectionStatus: 'qr_ready' } as any));
        soundFX.playSuccess();
        return { success: true, message: 'QR Code ready.' };
      }
      await refreshBotStatus();
      // Poll fallback for QR code image
      for (let i = 0; i < 8; i++) {
        await new Promise((r) => setTimeout(r, 800));
        const statusRes = await fetch('/api/bot/status', {
          headers: getBotHeaders(),
        });
        if (statusRes.ok) {
          const sJson = await statusRes.json();
          if (sJson.data?.qrCodeDataUrl) {
            setServerBotState(sJson.data);
            break;
          }
        }
      }
      return data || { success: true, message: 'QR Code requested' };
    } catch (err: any) {
      await refreshBotStatus();
      return { success: false, message: "Network error" };
    }
  }, [getBotHeaders, effectiveUserId, refreshBotStatus]);

  const linkAndDeployPairedBot = async (customName?: string): Promise<{ success: boolean; message: string }> => {
    soundFX.playClick();
    addToast('Deploying YASHI HALLS PRO 24/7 container...', 'info');
    const res = await startBot(pairingSession?.phoneNumber);
    if (res.success) {
      soundFX.playSuccess();
      triggerConfetti();
      addToast('YASHI HALLS PRO container launched successfully!', 'success');
      setActiveTab('deployments');
    }
    return res;
  };

  const deployBot = async (template: BotTemplate, name: string, env: Record<string, string>) => {
    const isProTemplate = template.id.includes('pro');
    if (isProTemplate && user.plan === 'mini' && coins < template.costCoins) {
      return { 
        success: false, 
        message: `Insufficient coins. Deploying ${template.name} requires ${template.costCoins} coins, you have ${coins}.` 
      };
    }

    // Deduct coins if required
    if (template.costCoins > 0) {
      setCoins((prev) => Math.max(0, prev - template.costCoins));
      const now = new Date();
      const timeStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ', ' +
        now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

      setTransactions((prev) => [
        {
          id: `tx-${Date.now()}`,
          title: `Deploy ${name}`,
          date: timeStr,
          amount: -template.costCoins,
          category: 'deploy',
        },
        ...prev,
      ]);
    }

    // Switch engine to match deployed template tier
    const targetPlan: 'mini' | 'pro' = isProTemplate ? 'pro' : 'mini';
    await changePlan(targetPlan);

    const startRes = await startBot(env.OWNER_NUMBER || pairingSession?.phoneNumber);
    if (startRes.success) {
      triggerConfetti();
      addToast(`Bot ${name} (${targetPlan.toUpperCase()}) deployed successfully to 24/7 cluster!`, 'success');
    }
    return startRes;
  };

  // Cooldown countdown
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const interval = setInterval(() => {
      setCooldownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownSeconds]);

  // Pairing session countdown
  useEffect(() => {
    if (!pairingSession || pairingSession.status !== 'ready' || pairingSession.expiresInSeconds <= 0) return;
    const interval = setInterval(() => {
      setPairingSession((prev) => {
        if (!prev) return null;
        if (prev.expiresInSeconds <= 1) {
          return { ...prev, expiresInSeconds: 0, status: 'idle' };
        }
        return { ...prev, expiresInSeconds: prev.expiresInSeconds - 1 };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [pairingSession]);

  // Sync Theme
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light-mode');
      root.classList.remove('dark');
    } else {
      root.classList.remove('light-mode');
      root.classList.add('dark');
    }
  }, [theme]);

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    addToast(`Theme switched to ${newTheme}`, 'info');
  };

  // Auth Methods
  const loginAsDemo = (demoEmail?: string) => {
    const email = demoEmail || 'you596418@gmail.com';
    const name = email.split('@')[0] || 'User';
    const isAdminUser = ['epavenav@gmail.com', 'sawrikasuraj759@gmail.com', 'sawrikasuraj9@gmail.com', 'you596418@gmail.com'].includes(email.toLowerCase());

    // Reset bot runtime state so demo customer gets fresh isolated session
    setServerBotState(null);
    setServerLogs([]);
    setPairingSession(null);
    wasOnlineRef.current = false;

    const userProfile: UserProfile = {
      username: name,
      email: email,
      isVerified: true,
      signInMethod: 'GOOGLE',
      plan: isAdminUser ? 'business' : 'mini',
      ownedPlans: isAdminUser ? ['mini', 'pro', 'business'] : ['mini'],
      botSlotsUsed: 0,
      botSlotsTotal: isAdminUser ? 25 : 1,
      avatarLetter: name.charAt(0).toUpperCase(),
      emailNotifications: true,
      productUpdates: false,
    };

    setUser(userProfile);
    const userCoins = isAdminUser ? 1630 : 5;
    setCoins(userCoins);
    setIsAuthenticated(true);

    try {
      localStorage.setItem('yashi_auth_session', JSON.stringify({ email, userProfile, coins: userCoins }));
    } catch {}

    addToast(`Signed in as ${email}!`, 'success');
    soundFX.playSuccess();
    triggerConfetti();
  };

  const loginWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const fbUser = result.user;
      addToast(`Signed in with Google as ${fbUser.displayName || fbUser.email}!`, 'success');
      soundFX.playSuccess();
      triggerConfetti();
    } catch (err: unknown) {
      // Only warn for domain authorization or user cancel
      console.warn('Google Sign-in status:', (err as { code?: string })?.code || err);
      const code = (err as { code?: string })?.code || '';
      const msg = (err as { message?: string })?.message || '';
      if (code === 'auth/popup-blocked') {
        addToast('Google login popup was blocked by browser. Please allow popups.', 'error');
      } else if (code === 'auth/cancelled-popup-request' || code === 'auth/popup-closed-by-user') {
        addToast('Sign-in cancelled by user.', 'info');
      } else if (code === 'auth/unauthorized-domain' || msg.includes('unauthorized-domain')) {
        addToast('Google Sign-In: Firebase Authorized Domain required. Please check instructions on screen.', 'error');
      } else {
        addToast(msg || 'Google Sign-in failed', 'error');
      }
      throw err;
    }
  };

  const loginWithGoogleCredential = async (idToken: string) => {
    try {
      const credential = GoogleAuthProvider.credential(idToken);
      const result = await signInWithCredential(auth, credential);
      const fbUser = result.user;
      addToast(`Signed in with Google as ${fbUser.displayName || fbUser.email}!`, 'success');
      soundFX.playSuccess();
      triggerConfetti();
    } catch (err: unknown) {
      console.error('Google Sign-in Credential Error:', err);
      const msg = (err as { message?: string })?.message || 'Google Sign-in failed';
      addToast(msg, 'error');
      throw err;
    }
  };

  const loginWithEmail = async (email: string, pass: string): Promise<boolean> => {
    if (!email || !pass) {
      addToast('Please enter both email and password', 'error');
      return false;
    }
    try {
      const result = await signInWithEmailAndPassword(auth, email.trim(), pass);
      addToast(`Welcome back, ${result.user.displayName || email}!`, 'success');
      soundFX.playSuccess();
      triggerConfetti();
      return true;
    } catch (err: unknown) {
      console.error('Email Login Error:', err);
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/user-not-found' || code === 'auth/invalid-credential') {
        addToast('Invalid email or password. Please verify your credentials or create an account.', 'error');
      } else if (code === 'auth/wrong-password') {
        addToast('Incorrect password. Please try again.', 'error');
      } else {
        addToast('Login failed: ' + ((err as { message?: string })?.message || 'Authentication error'), 'error');
      }
      return false;
    }
  };

  const signupWithEmail = async (name: string, email: string, pass: string): Promise<boolean> => {
    if (!name || !email || !pass) {
      addToast('Please fill all required fields', 'error');
      return false;
    }
    if (pass.length < 6) {
      addToast('Password must be at least 6 characters', 'error');
      return false;
    }
    try {
      const result = await createUserWithEmailAndPassword(auth, email.trim(), pass);
      await updateProfile(result.user, { displayName: name.trim() });
      addToast(`Account created for ${name}! +5 free coins credited.`, 'success');
      soundFX.playSuccess();
      triggerConfetti();
      return true;
    } catch (err: unknown) {
      console.error('Email Signup Error:', err);
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/email-already-in-use') {
        addToast('This email is already registered. Please sign in instead.', 'error');
      } else {
        addToast('Sign-up failed: ' + ((err as { message?: string })?.message || 'Registration error'), 'error');
      }
      return false;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Sign out error:', err);
    } finally {
      try {
        localStorage.removeItem('yashi_auth_session');
      } catch {}
      setIsAuthenticated(false);
      setCurrentFirebaseUser(null);
      setUser(INITIAL_USER);
      setServerBotState(null);
      setServerLogs([]);
      setPairingSession(null);
      wasOnlineRef.current = false;
      addToast('Signed out from YASHI HALLS successfully.', 'info');
    }
  };

  const updateUser = async (partial: Partial<UserProfile>) => {
    setUser((prev) => ({ ...prev, ...partial }));
    if (currentFirebaseUser) {
      try {
        await setDoc(doc(db, 'users', currentFirebaseUser.uid), partial, { merge: true });
      } catch {
        // fallback
      }
    }

    // Proactively sync name & profile with Admin Panel Customer Database
    fetch('/api/admin/customers/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: currentFirebaseUser?.uid || user.email,
        email: partial.email || user.email,
        username: partial.username || user.username,
        plan: partial.plan || user.plan,
        coins: coins,
        botStatus: serverBotState?.isOnline ? 'online' : 'none',
      }),
    }).catch(() => {});

    addToast('Account profile updated successfully', 'success');
  };

  const addCoins = (amount: number, title: string, category: Transaction['category'] = 'purchase') => {
    setCoins((prev) => {
      const updated = prev + amount;
      if (currentFirebaseUser) {
        setDoc(doc(db, 'users', currentFirebaseUser.uid), { coins: updated }, { merge: true }).catch(() => {});
      }
      return updated;
    });

    const now = new Date();
    const timeStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ', ' +
      now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    setTransactions((prev) => [
      {
        id: `tx-${Date.now()}`,
        title,
        date: timeStr,
        amount,
        category,
      },
      ...prev,
    ]);

    if (amount > 0) {
      triggerConfetti();
    }
  };

  const claimDailyCoins = () => {
    if (cooldownSeconds > 0) {
      addToast('Daily coin reward is on cooldown. Please wait 24 hours.', 'error');
      return { success: false, message: 'Cooldown active' };
    }
    addCoins(1, 'Daily coin reward (+1 coin)', 'claim');
    const now = Date.now();
    try {
      localStorage.setItem('yashi_last_claim_timestamp', String(now));
    } catch {
      // ignore
    }
    if (currentFirebaseUser) {
      setDoc(doc(db, 'users', currentFirebaseUser.uid), { lastDailyClaim: now }, { merge: true }).catch(() => {});
    }
    setCooldownSeconds(24 * 3600);
    soundFX.playSuccess();
    triggerConfetti();
    addToast('+1 Daily Coin claimed! Come back in 24 hours.', 'success');
    return { success: true, message: '+1 coin claimed successfully' };
  };

  const redeemPromoCode = (code: string) => {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      return { success: false, message: 'Please enter a promo code' };
    }
    if (redeemedCodes.includes(cleanCode)) {
      return { success: false, message: 'This code has already been redeemed on your account' };
    }
    const reward = PROMO_CODES[cleanCode];
    if (reward) {
      setRedeemedCodes((prev) => [...prev, cleanCode]);
      addCoins(reward, `Promo code redeemed (${cleanCode})`, 'promo');
      addToast(`Promo code applied! +${reward} coins added to wallet.`, 'success');
      return { success: true, message: `Redeemed successfully! +${reward} coins.` };
    }
    return { success: false, message: 'Invalid or expired promo code' };
  };

  const unlockBotClaim = () => {
    if (botUnlockClaim) return;
    setBotUnlockClaim(true);
    addToast('Bot Claim feature unlocked! You can now send .claim to your bot.', 'success');
    triggerConfetti();
  };

  const markNotificationRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    addToast('All notifications marked as read', 'info');
  };

  const changePlan = async (targetPlan: 'mini' | 'pro' | 'business') => {
    soundFX.playClick();
    if (user.plan === targetPlan) return;

    // MINI is always free
    if (targetPlan === 'mini') {
      try {
        const slots = 1;
        setUser((prev) => ({
          ...prev,
          plan: 'mini',
          botSlotsTotal: slots,
        }));
        const res = await fetch('/api/bot/plan', {
          method: 'POST',
          headers: getBotHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ plan: 'mini', userId: effectiveUserId }),
        });
        const data = await res.json();
        if (data.success) {
          addToast('🟢 Switched to YASHI HALLS MINI (Free) plan.', 'info');
          await refreshBotStatus();
        }
        if (currentFirebaseUser) {
          setDoc(doc(db, 'users', currentFirebaseUser.uid), { plan: 'mini' }, { merge: true }).catch(() => {});
        }
      } catch (err: any) {
        addToast(err?.message || 'Failed to update plan', 'error');
      }
      return;
    }

    // PRO & BUSINESS: Check if user already owns this plan
    const isOwned = user.ownedPlans?.includes(targetPlan);
    if (!isOwned) {
      // LOCKED! Must purchase via confirmation dialog with coins
      setPlanToPurchase(targetPlan);
      return;
    }

    // Already owned: switch directly
    try {
      const slots = targetPlan === 'business' ? 25 : 5;
      setUser((prev) => ({
        ...prev,
        plan: targetPlan,
        botSlotsTotal: slots,
      }));
      const res = await fetch('/api/bot/plan', {
        method: 'POST',
        headers: getBotHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ plan: targetPlan, userId: effectiveUserId }),
      });
      const data = await res.json();
      if (data.success) {
        addToast(`Activated your owned ${targetPlan.toUpperCase()} plan.`, 'success');
        await refreshBotStatus();
      }
      if (currentFirebaseUser) {
        setDoc(doc(db, 'users', currentFirebaseUser.uid), { plan: targetPlan }, { merge: true }).catch(() => {});
      }
    } catch (err: any) {
      addToast(err?.message || 'Failed to update plan', 'error');
    }
  };

  const purchasePlan = async (targetPlan: 'mini' | 'pro' | 'business'): Promise<{ success: boolean; message: string; needCoins?: boolean }> => {
    if (targetPlan === 'mini') {
      await changePlan('mini');
      setPlanToPurchase(null);
      return { success: true, message: 'Activated MINI Plan' };
    }

    const cost = targetPlan === 'business' ? 30 : 10;
    if (coins < cost) {
      addToast(`⚠️ Insufficient coins! You need ${cost} coins, but your balance is only ${coins} coins.`, 'error');
      return { success: false, message: `Insufficient coins (${cost} required)`, needCoins: true };
    }

    try {
      soundFX.playClick();
      const res = await fetch('/api/bot/purchase-plan', {
        method: 'POST',
        headers: getBotHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ plan: targetPlan, userCoins: coins, userId: effectiveUserId }),
      });
      const data = await res.json();

      if (!data.success) {
        addToast(data.message || 'Plan purchase failed', 'error');
        return { success: false, message: data.message || 'Purchase failed' };
      }

      // Deduct coins & record real transaction
      const newCoins = data.remainingCoins ?? Math.max(0, coins - cost);
      setCoins(newCoins);

      const newTx: Transaction = data.transaction || {
        id: `tx-${Date.now()}`,
        title: `Purchased YASHI HALLS ${targetPlan.toUpperCase()} Plan`,
        date: 'Just now',
        amount: -cost,
        category: 'purchase',
      };
      setTransactions((prev) => [newTx, ...prev]);

      const slots = targetPlan === 'business' ? 25 : 5;
      setUser((prev) => {
        const owned = prev.ownedPlans || ['mini'];
        return {
          ...prev,
          plan: targetPlan,
          botSlotsTotal: slots,
          ownedPlans: owned.includes(targetPlan) ? owned : [...owned, targetPlan],
        };
      });

      soundFX.playSuccess();
      triggerConfetti();
      addToast(`🎉 Successfully purchased YASHI HALLS ${targetPlan.toUpperCase()}! -${cost} coins deducted.`, 'success');

      setPlanToPurchase(null);
      await refreshBotStatus();

      if (currentFirebaseUser) {
        setDoc(doc(db, 'users', currentFirebaseUser.uid), { 
          plan: targetPlan,
          coins: newCoins,
        }, { merge: true }).catch(() => {});
      }

      return { success: true, message: 'Plan purchased successfully' };
    } catch (err: any) {
      addToast(err?.message || 'Transaction error', 'error');
      return { success: false, message: err?.message || 'Transaction error' };
    }
  };

  const syncBotProfilePic = async (customLogoUrl?: string) => {
    try {
      soundFX.playClick();
      addToast('Updating WhatsApp bot profile image...', 'info');
      const res = await fetch('/api/bot/sync-profile-pic', {
        method: 'POST',
        headers: getBotHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ userId: effectiveUserId, logoUrl: customLogoUrl }),
      });
      const data = await res.json();
      if (data.success) {
        soundFX.playSuccess();
        addToast('✅ WhatsApp Bot profile picture updated successfully!', 'success');
        await refreshBotStatus();
      } else {
        addToast(data.message || 'Profile picture sync is ready when bot connects.', 'info');
      }
    } catch (err: any) {
      addToast('Failed to sync profile picture', 'error');
    }
  };

  const resetQuotas = async () => {
    try {
      const res = await fetch('/api/bot/reset-quotas', {
        method: 'POST',
        headers: getBotHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ userId: effectiveUserId }),
      });
      const data = await res.json();
      if (data.success) {
        addToast('Daily quotas reset successfully!', 'success');
        await refreshBotStatus();
      }
    } catch {
      addToast('Failed to reset quotas', 'error');
    }
  };

  const upgradeToPro = () => {
    changePlan('pro');
  };

  const resetAccountData = () => {
    stopBot();
    clearSession();
    setCoins(0);
    setTransactions([]);
    setUser((prev) => ({
      ...prev,
      botSlotsUsed: 0,
    }));
    addToast('Account wiped and reset successfully', 'info');
  };

  // --- ADMIN AND MANUAL PURCHASE REQUESTS ---
  const ADMIN_EMAILS = [
    'sawrikasuraj9@gmail.com',
    'sawrikasuraj759@gmail.com',
    'epavenav@gmail.com',
    'you596418@gmail.com'
  ];
  const isAdmin = Boolean(
    user.email && ADMIN_EMAILS.map(e => e.toLowerCase()).includes(user.email.trim().toLowerCase())
  );

  const [adminWhatsappNumber, setAdminWhatsappNumber] = useState<string>('0740712934');
  const [userPurchaseRequests, setUserPurchaseRequests] = useState<PurchaseRequest[]>([]);

  const refreshUserPurchases = useCallback(async () => {
    if (!user.email) return;
    try {
      const res = await fetch(`/api/purchase-requests/user/${encodeURIComponent(user.email)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setUserPurchaseRequests(json.data);
        }
      }

      // Synchronize live customer profile from backend for newly approved coins and plans
      const profileRes = await fetch(`/api/customer/profile/${encodeURIComponent(user.email)}`);
      if (profileRes.ok) {
        const profJson = await profileRes.json();
        if (profJson.success && profJson.customer) {
          const c = profJson.customer;
          if (typeof c.coins === 'number' && c.coins !== coins) {
            setCoins(c.coins);
            if (currentFirebaseUser) {
              setDoc(doc(db, 'users', currentFirebaseUser.uid), { coins: c.coins }, { merge: true }).catch(() => {});
            }
          }
          if (c.plan && c.plan !== user.plan) {
            setUser((prev) => ({
              ...prev,
              plan: c.plan,
              ownedPlans: Array.from(new Set([...(prev.ownedPlans || ['mini']), c.plan])),
              botSlotsTotal: c.plan === 'business' ? 25 : c.plan === 'pro' ? 5 : 1,
            }));
            if (currentFirebaseUser) {
              setDoc(doc(db, 'users', currentFirebaseUser.uid), {
                plan: c.plan,
                ownedPlans: Array.from(new Set([...(user.ownedPlans || ['mini']), c.plan])),
              }, { merge: true }).catch(() => {});
            }
          }
        }
      }
    } catch {
      // ignore
    }
  }, [user.email, coins, user.plan, currentFirebaseUser]);

  useEffect(() => {
    if (isAuthenticated && user.email) {
      refreshUserPurchases();
    }
  }, [isAuthenticated, user.email, refreshUserPurchases]);

  const submitPurchaseRequest = async (item: {
    itemType: 'plan' | 'coin_pack';
    itemName: string;
    planId?: 'pro' | 'business';
    coinAmount?: number;
    priceLkr: number;
    priceFormatted?: string;
  }): Promise<{ success: boolean; request?: PurchaseRequest; message: string; whatsappUrl?: string }> => {
    try {
      soundFX.playClick();
      const res = await fetch('/api/purchase-requests/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: currentFirebaseUser?.uid || `cust-${Date.now()}`,
          customerEmail: user.email,
          customerName: user.username,
          itemType: item.itemType,
          itemName: item.itemName,
          planId: item.planId,
          coinAmount: item.coinAmount,
          priceLkr: item.priceLkr,
          priceFormatted: item.priceFormatted || `Rs ${item.priceLkr.toLocaleString()}`,
        }),
      });

      const data = await res.json();
      if (data.success && data.request) {
        soundFX.playSuccess();
        triggerConfetti();
        if (data.adminWhatsapp) {
          setAdminWhatsappNumber(data.adminWhatsapp);
        }

        const refId = data.request.referenceId;
        const targetPhone = (data.adminWhatsapp || adminWhatsappNumber || '0740712934').replace(/\D/g, '');
        const cleanWa = targetPhone.startsWith('0') ? '94' + targetPhone.slice(1) : targetPhone;

        const prefilledText = encodeURIComponent(
          `*YASHI HALLS Purchase Request*\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `👤 *Customer:* ${user.username} (${user.email})\n` +
          `📦 *Item:* ${item.itemName}\n` +
          `💰 *Amount:* Rs ${item.priceLkr.toLocaleString()}\n` +
          `🔖 *Reference ID:* ${refId}\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `Hello Admin, I have submitted a purchase request on YASHI HALLS website. Please verify my payment and approve my request!`
        );

        const waUrl = `https://wa.me/${cleanWa}?text=${prefilledText}`;
        await refreshUserPurchases();
        addToast(`Purchase request created! Ref: ${refId}. WhatsApp opened.`, 'success');

        return {
          success: true,
          request: data.request,
          whatsappUrl: waUrl,
          message: data.message,
        };
      } else {
        addToast(data.message || 'Failed to submit purchase request', 'error');
        return { success: false, message: data.message || 'Submission error' };
      }
    } catch (err: any) {
      addToast(err?.message || 'Network error submitting purchase request', 'error');
      return { success: false, message: err?.message || 'Network error' };
    }
  };

  return (
    <AppContext.Provider
      value={{
        isAuthenticated,
        isAuthLoading,
        loginWithGoogle,
        loginWithGoogleCredential,
        loginWithEmail,
        signupWithEmail,
        loginAsDemo,
        logout,
        user,
        updateUser,
        coins,
        addCoins,
        transactions,
        redeemPromoCode,
        claimDailyCoins,
        cooldownSeconds,
        isClaimReady: cooldownSeconds <= 0,
        serverBotState,
        serverLogs,
        isBackendConnected,
        refreshBotStatus,
        startBot,
        stopBot,
        restartBot,
        toggleBotState,
        deleteBot,
        updateBotEnv,
        updateBotConfig,
        clearSession,
        bots,
        deployBot,
        pairingSession,
        generatePairCode,
        generateQrCode,
        linkAndDeployPairedBot,
        botUnlockClaim,
        unlockBotClaim,
        activeTab,
        setActiveTab,
        theme,
        setTheme,
        isSidebarOpen,
        setIsSidebarOpen,
        openDeployModal,
        setOpenDeployModal,
        selectedTemplateForDeploy,
        setSelectedTemplateForDeploy,
        openCoinModal,
        setOpenCoinModal,
        selectedCoinPack,
        setSelectedCoinPack,
        openTerminalBot,
        setOpenTerminalBot,
        openSupportModal,
        setOpenSupportModal,
        openProModal,
        setOpenProModal,
        planToPurchase,
        setPlanToPurchase,
        openInviteModal,
        setOpenInviteModal,
        openDeleteAccountModal,
        setOpenDeleteAccountModal,
        openEditBotModal,
        setOpenEditBotModal,
        notifications,
        markNotificationRead,
        markAllNotificationsRead,
        toasts,
        addToast,
        removeToast,
        upgradeToPro,
        changePlan,
        purchasePlan,
        syncBotProfilePic,
        resetQuotas,
        resetAccountData,
        isAdmin,
        adminWhatsappNumber,
        userPurchaseRequests,
        submitPurchaseRequest,
        refreshUserPurchases,
        effectiveUserId,
        lastKeepAlivePulse,
        keepAliveStatus,
        sendKeepAlivePing,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
