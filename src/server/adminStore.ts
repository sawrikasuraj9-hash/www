import fs from "fs";
import path from "path";
import { seedDefaultVoiceFiles } from "./voiceService";

const DATA_DIR = path.resolve(process.cwd(), "data");
const DB_FILE = path.resolve(DATA_DIR, "admin_system_db.json");

const DEFAULT_SETTINGS = {
  storeName: "YASHI HALLS Cloud Platform",
  brandTagline: "Professional Cyber Multi-Device WhatsApp Engine",
  adminWhatsapp: "0740712934",
  maintenanceMode: false,
  allowPublicSignups: true,
  planPricesCoins: { mini: 0, pro: 10, business: 30 },
  coinPackPricesLkr: { basic: 450, popular: 1200, mega: 2800 }
};

const DEFAULT_DB = {
  customers: {
    "user-sawrikasuraj9": {
      id: "user-sawrikasuraj9",
      email: "sawrikasuraj9@gmail.com",
      username: "Sawrika Suraj (Master Admin)",
      plan: "business",
      coins: 500,
      isSuspended: false,
      botStatus: "online",
      createdAt: new Date(Date.now() - 30 * 864e5).toISOString(),
      lastActive: new Date().toISOString(),
      adminNote: "Master Administrator & Owner Account",
      mediaUsed: 12,
      aiUsed: 45
    },
    "user-sawrikasuraj759": {
      id: "user-sawrikasuraj759",
      email: "sawrikasuraj759@gmail.com",
      username: "Sawrika Suraj (Admin Backup)",
      plan: "business",
      coins: 500,
      isSuspended: false,
      botStatus: "online",
      createdAt: new Date(Date.now() - 30 * 864e5).toISOString(),
      lastActive: new Date().toISOString(),
      adminNote: "Master Administrator Account",
      mediaUsed: 12,
      aiUsed: 45
    }
  },
  purchaseRequests: [],
  auditLogs: [
    {
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      adminEmail: "system",
      action: "SYSTEM_BOOT",
      details: "YASHI HALLS Admin Engine & Manual Purchase Management System initialised."
    }
  ],
  settings: DEFAULT_SETTINGS,
  voiceReplies: [],
  walletTransactions: []
};

class AdminStore {
  db: any;

  constructor() {
    this.ensureDataDir();
    this.db = this.loadDatabase();
    this.initDefaultVoiceReplies();
  }

  ensureDataDir() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
    } catch {}
  }

  async initDefaultVoiceReplies() {
    if (!this.db.voiceReplies || this.db.voiceReplies.length === 0) {
      try {
        const seedPaths = await seedDefaultVoiceFiles();
        this.db.voiceReplies = [
          {
            id: "voice-greeting-hi",
            name: "Welcome & Greeting Voice (හායි / Hello)",
            triggers: ["hi", "hello", "හායි", "hey", "hello yashi"],
            audioFileName: "seed_hi.mp3",
            audioPath: seedPaths.hi,
            audioUrl: "/api/voice-replies/audio/voice-greeting-hi",
            mimeType: "audio/mpeg",
            fileSizeBytes: 12582,
            fileSizeFormatted: "12.3 KB",
            durationSeconds: 2,
            language: "Both",
            enabled: true,
            scope: "GLOBAL",
            createdAt: new Date().toISOString(),
            playCount: 14
          },
          {
            id: "voice-morning-greeting",
            name: "Morning Greeting Voice (සුබ උදෑසනක්)",
            triggers: ["good morning", "සුබ උදෑසනක්", "morning", "gm"],
            audioFileName: "seed_good_morning.mp3",
            audioPath: seedPaths.morning,
            audioUrl: "/api/voice-replies/audio/voice-morning-greeting",
            mimeType: "audio/mpeg",
            fileSizeBytes: 15400,
            fileSizeFormatted: "15.0 KB",
            durationSeconds: 2,
            language: "Both",
            enabled: true,
            scope: "GLOBAL",
            createdAt: new Date().toISOString(),
            playCount: 8
          },
          {
            id: "voice-night-greeting",
            name: "Good Night Voice (සුබ රාත්‍රියක්)",
            triggers: ["good night", "සුබ රාත්‍රියක්", "gn", "sweet dreams"],
            audioFileName: "seed_good_night.mp3",
            audioPath: seedPaths.night,
            audioUrl: "/api/voice-replies/audio/voice-night-greeting",
            mimeType: "audio/mpeg",
            fileSizeBytes: 14200,
            fileSizeFormatted: "13.9 KB",
            durationSeconds: 2,
            language: "Both",
            enabled: true,
            scope: "GLOBAL",
            createdAt: new Date().toISOString(),
            playCount: 5
          },
          {
            id: "voice-how-are-you",
            name: "How Are You Voice (කොහොමද / How Are You)",
            triggers: ["how are you", "කොහොමද", "how r u", "සැප සනීප කොහොමද"],
            audioFileName: "seed_how_are_you.mp3",
            audioPath: seedPaths.howAreYou,
            audioUrl: "/api/voice-replies/audio/voice-how-are-you",
            mimeType: "audio/mpeg",
            fileSizeBytes: 13800,
            fileSizeFormatted: "13.5 KB",
            durationSeconds: 2,
            language: "Both",
            enabled: true,
            scope: "GLOBAL",
            createdAt: new Date().toISOString(),
            playCount: 11
          }
        ];
        this.saveDatabase(this.db);
      } catch (err) {
        console.error("Failed to seed default voice replies:", err);
      }
    }
  }

  loadDatabase() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, "utf-8");
        const parsed = JSON.parse(raw);
        return {
          ...DEFAULT_DB,
          ...parsed,
          settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
          voiceReplies: Array.isArray(parsed.voiceReplies) ? parsed.voiceReplies : []
        };
      }
    } catch (e) {
      console.error("Failed to load admin db file, using defaults:", e);
    }
    this.saveDatabase(DEFAULT_DB);
    return DEFAULT_DB;
  }

  private saveTimeout: any = null;

  saveDatabase(data: any) {
    try {
      this.ensureDataDir();
      if (this.saveTimeout) clearTimeout(this.saveTimeout);
      this.saveTimeout = setTimeout(() => {
        try {
          fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
        } catch (err) {
          console.error("Failed to save admin system db:", err);
        }
      }, 250);
    } catch (err) {
      console.error("Failed to save admin system db:", err);
    }
  }

  saveDatabaseImmediate(data: any) {
    try {
      this.ensureDataDir();
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
    } catch (err) {
      console.error("Failed to save admin system db:", err);
    }
  }

  getSettings() {
    return { ...this.db.settings };
  }

  updateSettings(partial: any, adminEmail: string) {
    this.db.settings = { ...this.db.settings, ...partial };
    this.addAuditLog(adminEmail, "UPDATE_SETTINGS", `Updated system configuration: ${Object.keys(partial).join(", ")}`);
    this.saveDatabase(this.db);
    return this.getSettings();
  }

  getCustomers() {
    return Object.values(this.db.customers);
  }

  getCustomer(idOrEmail: string) {
    if (!idOrEmail) return undefined;
    const clean = String(idOrEmail).trim().toLowerCase();
    if (!clean) return undefined;
    const key = Object.keys(this.db.customers).find(k => {
      const cust = this.db.customers[k];
      if (!cust) return false;
      const idMatch = cust.id && String(cust.id).trim().toLowerCase() === clean;
      const emailMatch = cust.email && String(cust.email).trim().toLowerCase() === clean;
      return idMatch || emailMatch;
    });
    return key ? this.db.customers[key] : undefined;
  }

  syncCustomer(id: string, email: string, username?: string, plan?: string, coins?: number) {
    const cleanEmail = String(email || "").trim().toLowerCase();
    const cleanId = String(id || "").trim();
    const existing = (cleanId ? this.getCustomer(cleanId) : undefined) || (cleanEmail ? this.getCustomer(cleanEmail) : undefined);
    if (existing) {
      if (cleanEmail) existing.email = cleanEmail;
      if (username) existing.username = username;
      if (plan) existing.plan = plan;
      if (typeof coins === "number") existing.coins = coins;
      existing.lastActive = new Date().toISOString();
      this.saveDatabase(this.db);
      return existing;
    }
    const newCust = {
      id: cleanId || `cust-${Date.now()}`,
      email: cleanEmail,
      username: username || (cleanEmail ? cleanEmail.split("@")[0] : "Customer"),
      plan: plan || "mini",
      coins: typeof coins === "number" ? coins : 5,
      isSuspended: false,
      botStatus: "none",
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
      mediaUsed: 0,
      aiUsed: 0
    };
    this.db.customers[newCust.id] = newCust;
    this.saveDatabase(this.db);
    return newCust;
  }

  setCustomerSuspended(id: string, suspended: boolean, adminEmail: string) {
    const cust = this.getCustomer(id);
    if (!cust) return null;
    cust.isSuspended = suspended;
    this.addAuditLog(adminEmail, suspended ? "SUSPEND_CUSTOMER" : "UNSUSPEND_CUSTOMER", `Customer: ${cust.email}`, cust.id);
    this.saveDatabase(this.db);
    return cust;
  }

  updateCustomerNote(id: string, note: string, adminEmail: string) {
    const cust = this.getCustomer(id);
    if (!cust) return null;
    cust.adminNote = note;
    this.addAuditLog(adminEmail, "UPDATE_CUSTOMER_NOTE", `Note updated for ${cust.email}`, cust.id);
    this.saveDatabase(this.db);
    return cust;
  }

  deleteCustomer(id: string, adminEmail: string) {
    const cust = this.getCustomer(id);
    if (!cust) return false;
    delete this.db.customers[cust.id];
    this.addAuditLog(adminEmail, "DELETE_CUSTOMER", `Permanently deleted customer: ${cust.email}`, cust.id);
    this.saveDatabase(this.db);
    return true;
  }

  modifyCoins(customerIdOrEmail: string, action: "ADD" | "DEDUCT", amount: number, reason: string, adminEmail: string) {
    if (amount <= 0) {
      return { success: false, message: "Amount must be greater than zero." };
    }
    const cust = this.getCustomer(customerIdOrEmail);
    if (!cust) {
      return { success: false, message: "Customer not found." };
    }
    const prevBalance = cust.coins;
    let newBalance = prevBalance;
    if (action === "ADD") {
      newBalance = prevBalance + amount;
    } else {
      if (prevBalance < amount) {
        return { success: false, message: `Cannot deduct ${amount} coins. Customer only has ${prevBalance} coins. Balance cannot be negative.` };
      }
      newBalance = prevBalance - amount;
    }
    cust.coins = newBalance;
    const txId = `tx-admin-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const tx = {
      id: txId,
      customerId: cust.id,
      adminId: adminEmail,
      type: action,
      amount,
      previousBalance: prevBalance,
      newBalance,
      reason: reason || `Manual adjustment by ${adminEmail}`,
      date: new Date().toISOString(),
      status: "COMPLETED"
    };
    this.db.walletTransactions.unshift(tx);
    this.addAuditLog(adminEmail, `COIN_${action}`, `${action} ${amount} coins for ${cust.email}. Prev: ${prevBalance}, New: ${newBalance}. Reason: ${reason}`, cust.id);
    this.saveDatabase(this.db);
    return { success: true, newBalance, message: `Successfully ${action === "ADD" ? "added" : "deducted"} ${amount} coins.` };
  }

  getWalletTransactions(customerId?: string) {
    if (customerId) {
      return this.db.walletTransactions.filter((t: any) => t.customerId === customerId);
    }
    return this.db.walletTransactions;
  }

  createPurchaseRequest(data: any) {
    const referenceId = `REQ-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
    const newReq = { ...data, id: `req-${Date.now()}`, referenceId, status: "PENDING", createdAt: new Date().toISOString() };
    this.db.purchaseRequests.unshift(newReq);
    this.saveDatabase(this.db);
    return newReq;
  }

  getPurchaseRequests(status?: string) {
    if (status && status !== "ALL") {
      return this.db.purchaseRequests.filter((r: any) => r.status === status);
    }
    return this.db.purchaseRequests;
  }

  fulfillPurchaseRequest(requestId: string, action: "APPROVE" | "REJECT", adminEmail: string, adminNote?: string) {
    const req = this.db.purchaseRequests.find((r: any) => r.id === requestId || r.referenceId === requestId);
    if (!req) {
      return { success: false, message: "Purchase request not found." };
    }
    if (req.status === "FULFILLED" || req.status === "APPROVED") {
      return { success: false, message: "This purchase request has already been approved and fulfilled!" };
    }
    if (action === "REJECT") {
      req.status = "REJECTED";
      req.updatedAt = new Date().toISOString();
      req.adminNote = adminNote || "Rejected by Admin";
      req.fulfilledBy = adminEmail;
      this.addAuditLog(adminEmail, "REJECT_PURCHASE", `Rejected request ${req.referenceId} for ${req.customerEmail}`);
      this.saveDatabase(this.db);
      return { success: true, message: "Request rejected.", request: req };
    }
    let cust = (req.customerId ? this.getCustomer(req.customerId) : undefined) || (req.customerEmail ? this.getCustomer(req.customerEmail) : undefined);
    if (!cust) {
      cust = this.syncCustomer(req.customerId, req.customerEmail, req.customerName, req.itemType === "plan" && req.planId ? req.planId : "mini", 5);
    }
    if (req.itemType === "coin_pack" && req.coinAmount) {
      cust.coins += req.coinAmount;
      const tx = {
        id: `tx-fulfill-${Date.now()}`,
        customerId: cust.id,
        customerEmail: cust.email,
        customerName: cust.username,
        adminId: adminEmail,
        type: "ADD",
        amount: req.coinAmount,
        previousBalance: cust.coins - req.coinAmount,
        newBalance: cust.coins,
        reason: `Purchase fulfilled: ${req.itemName} (Ref: ${req.referenceId})`,
        date: new Date().toISOString(),
        status: "COMPLETED"
      };
      this.db.walletTransactions.unshift(tx);
    } else if (req.itemType === "plan" && req.planId) {
      cust.plan = req.planId;
      cust.planActivatedAt = new Date().toISOString();
    }
    req.status = "FULFILLED";
    req.updatedAt = new Date().toISOString();
    req.fulfilledBy = adminEmail;
    req.adminNote = adminNote || `Approved & Fulfilled by ${adminEmail}`;
    this.addAuditLog(adminEmail, "APPROVE_PURCHASE", `Approved and fulfilled ${req.itemName} (Ref: ${req.referenceId}) for ${req.customerEmail}`, req.id);
    this.saveDatabase(this.db);
    return { success: true, message: `Successfully approved & fulfilled ${req.itemName} for ${req.customerEmail}!`, request: req, customer: cust };
  }

  addAuditLog(adminEmail: string, action: string, details: string, targetId?: string) {
    this.db.auditLogs.unshift({
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      timestamp: new Date().toISOString(),
      adminEmail,
      action,
      details,
      targetId
    });
    if (this.db.auditLogs.length > 300) {
      this.db.auditLogs.pop();
    }
    this.saveDatabase(this.db);
  }

  getAuditLogs() {
    return this.db.auditLogs;
  }

  getOverviewStats() {
    const customers = Object.values(this.db.customers) as any[];
    const plans: Record<string, number> = { mini: 0, pro: 0, business: 0 };
    let totalCoins = 0;
    let activeCust = 0;
    customers.forEach(c => {
      plans[c.plan] = (plans[c.plan] || 0) + 1;
      totalCoins += c.coins || 0;
      if (!c.isSuspended) activeCust++;
    });
    const requests = this.db.purchaseRequests;
    const pendingPurchases = requests.filter((r: any) => r.status === "PENDING").length;
    const completedPurchases = requests.filter((r: any) => r.status === "FULFILLED" || r.status === "APPROVED").length;
    const failedPurchases = requests.filter((r: any) => r.status === "REJECTED" || r.status === "CANCELLED").length;
    return {
      totalCustomers: customers.length,
      activeCustomers: activeCust,
      activeBots: 1,
      offlineBots: 0,
      planDistribution: plans,
      totalCoinsInCirculation: totalCoins,
      pendingPurchases,
      completedPurchases,
      failedPurchases,
      systemHealth: "OPERATIONAL 100%"
    };
  }

  getVoiceReplies(scope?: string, customerId?: string) {
    let list = this.db.voiceReplies || [];
    if (scope) {
      list = list.filter((v: any) => v.scope === scope);
    }
    if (customerId) {
      list = list.filter((v: any) => v.customerId === customerId || v.scope === "GLOBAL");
    }
    return list;
  }

  getVoiceReply(id: string) {
    return (this.db.voiceReplies || []).find((v: any) => v.id === id);
  }

  createVoiceReply(data: any, adminEmail: string) {
    const id = `voice-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const record = {
      ...data,
      id,
      createdAt: new Date().toISOString(),
      playCount: 0,
      audioUrl: `/api/voice-replies/audio/${id}`
    };
    if (!this.db.voiceReplies) this.db.voiceReplies = [];
    this.db.voiceReplies.unshift(record);
    this.addAuditLog(adminEmail, "CREATE_VOICE_REPLY", `Created voice reply '${record.name}' with triggers: ${record.triggers.join(", ")}`, record.id);
    this.saveDatabase(this.db);
    return record;
  }

  updateVoiceReply(id: string, updates: any, adminEmail: string) {
    const item = this.getVoiceReply(id);
    if (!item) return null;
    Object.assign(item, updates, { updatedAt: new Date().toISOString() });
    this.addAuditLog(adminEmail, "UPDATE_VOICE_REPLY", `Updated voice reply '${item.name}'`, item.id);
    this.saveDatabase(this.db);
    return item;
  }

  toggleVoiceReply(id: string, enabled: boolean, adminEmail: string) {
    const item = this.getVoiceReply(id);
    if (!item) return null;
    item.enabled = enabled;
    item.updatedAt = new Date().toISOString();
    this.addAuditLog(adminEmail, "TOGGLE_VOICE_REPLY", `${enabled ? "Enabled" : "Disabled"} voice auto-reply '${item.name}'`, item.id);
    this.saveDatabase(this.db);
    return item;
  }

  deleteVoiceReply(id: string, adminEmail: string) {
    const idx = (this.db.voiceReplies || []).findIndex((v: any) => v.id === id);
    if (idx === -1) return false;
    const removed = this.db.voiceReplies.splice(idx, 1)[0];
    this.addAuditLog(adminEmail, "DELETE_VOICE_REPLY", `Deleted voice reply '${removed.name}'`, id);
    this.saveDatabase(this.db);
    return true;
  }

  incrementVoiceReplyPlay(id: string) {
    const item = this.getVoiceReply(id);
    if (item) {
      item.playCount = (item.playCount || 0) + 1;
      item.lastPlayedAt = new Date().toISOString();
      this.saveDatabase(this.db);
    }
  }

  private lastBackupTimes: Map<string, number> = new Map();

  saveSessionBackup(userId: string, sessionDir: string, force = false) {
    try {
      const safeKey = (userId || "default").replace(/[^a-zA-Z0-9_-]/g, "_");
      const now = Date.now();
      const last = this.lastBackupTimes.get(safeKey) || 0;

      if (!force && now - last < 60000) {
        return;
      }
      this.lastBackupTimes.set(safeKey, now);

      if (!fs.existsSync(sessionDir)) return;

      setImmediate(async () => {
        try {
          const files = await fs.promises.readdir(sessionDir);
          const backup: Record<string, string> = {};
          for (const file of files) {
            if (file.endsWith(".json")) {
              const filePath = path.join(sessionDir, file);
              const content = await fs.promises.readFile(filePath, "utf-8");
              if (content && content.length > 0) {
                backup[file] = content;
              }
            }
          }
          if (Object.keys(backup).length > 0) {
            if (!this.db.sessionBackups) this.db.sessionBackups = {};
            this.db.sessionBackups[safeKey] = backup;
            this.saveDatabase(this.db);
          }
        } catch (err: any) {
          console.warn("[AdminStore] Async session backup note:", err?.message);
        }
      });
    } catch (err: any) {
      console.warn("[AdminStore] Session backup save skipped:", err?.message);
    }
  }

  restoreSessionBackup(userId: string, sessionDir: string): boolean {
    try {
      const safeKey = (userId || "default").replace(/[^a-zA-Z0-9_-]/g, "_");
      const backup = this.db.sessionBackups?.[safeKey];
      if (!backup || typeof backup !== "object") return false;
      fs.mkdirSync(sessionDir, { recursive: true });
      let restoredCount = 0;
      for (const [fileName, content] of Object.entries(backup)) {
        if (typeof content === "string" && content.trim()) {
          const targetPath = path.join(sessionDir, fileName);
          fs.writeFileSync(targetPath, content, "utf-8");
          restoredCount++;
        }
      }
      return restoredCount > 0;
    } catch (err: any) {
      console.warn("[AdminStore] Session backup restore failed:", err?.message);
      return false;
    }
  }

  deleteSessionBackup(userId: string) {
    try {
      const safeKey = (userId || "default").replace(/[^a-zA-Z0-9_-]/g, "_");
      if (this.db.sessionBackups && this.db.sessionBackups[safeKey]) {
        delete this.db.sessionBackups[safeKey];
        this.saveDatabase(this.db);
      }
    } catch {}
  }

  findMatchingVoiceReply(incomingText: string, customerId?: string) {
    if (!incomingText || typeof incomingText !== "string") return { match: null };
    const cleanText = incomingText.trim().toLowerCase().replace(/^[!./#]+/, "").trim();
    if (!cleanText) return { match: null };

    const replies = this.db.voiceReplies || [];
    const sorted = [
      ...replies.filter((v: any) => v.enabled && v.scope === "CUSTOMER" && customerId && v.customerId === customerId),
      ...replies.filter((v: any) => v.enabled && v.scope === "GLOBAL")
    ];

    // Strip punctuation and normalize extra spaces
    const strippedText = cleanText.replace(/[?!.,~*_-]+/g, " ").replace(/\s+/g, " ").trim();
    // Normalize repeated letters e.g. "hiii" -> "hi", "hellooo" -> "hello", "adareiii" -> "adarei"
    const deRepeatedText = strippedText.replace(/(.)\1{2,}/g, "$1");

    // PASS 1: Exact matches or stripped/derepeated exact matches
    for (const reply of sorted) {
      for (const trigger of reply.triggers) {
        const cleanTrigger = trigger.trim().toLowerCase();
        if (!cleanTrigger) continue;
        const deRepeatedTrigger = cleanTrigger.replace(/(.)\1{2,}/g, "$1");

        if (
          cleanText === cleanTrigger ||
          strippedText === cleanTrigger ||
          deRepeatedText === cleanTrigger ||
          deRepeatedText === deRepeatedTrigger
        ) {
          return { match: reply, matchedTrigger: trigger };
        }
      }
    }

    // PASS 2: Word-boundary & Substring matching
    for (const reply of sorted) {
      const triggersSorted = [...reply.triggers].sort((a: any, b: any) => b.length - a.length);
      for (const trigger of triggersSorted) {
        const cleanTrigger = trigger.trim().toLowerCase();
        if (!cleanTrigger) continue;

        // Word boundary match in English or Sinhala text
        const isWordMatch =
          cleanText === cleanTrigger ||
          strippedText === cleanTrigger ||
          strippedText.startsWith(`${cleanTrigger} `) ||
          strippedText.endsWith(` ${cleanTrigger}`) ||
          strippedText.includes(` ${cleanTrigger} `) ||
          deRepeatedText.startsWith(`${cleanTrigger} `) ||
          deRepeatedText.endsWith(` ${cleanTrigger}`) ||
          deRepeatedText.includes(` ${cleanTrigger} `);

        if (isWordMatch) {
          return { match: reply, matchedTrigger: trigger };
        }

        // Alphanumeric word boundary regex for English words
        if (/^[a-z0-9]+$/i.test(cleanTrigger)) {
          try {
            const reg = new RegExp(`\\b${cleanTrigger}\\b`, "i");
            if (reg.test(strippedText) || reg.test(deRepeatedText)) {
              return { match: reply, matchedTrigger: trigger };
            }
          } catch {}
        }
      }
    }

    return { match: null };
  }
}

const adminStore = new AdminStore();
export { adminStore };
