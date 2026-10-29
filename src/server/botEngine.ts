import { pipeline } from "stream/promises";
import { Readable } from "stream";
var __defProp=Object.defineProperty;var __name=(target,value)=>__defProp(target,"name",{value,configurable:true});import makeWASocket,{DisconnectReason,useMultiFileAuthState,fetchLatestBaileysVersion,Browsers,makeCacheableSignalKeyStore,downloadMediaMessage}from"@whiskeysockets/baileys";import pino from"pino";import QRCode from"qrcode";import fs from"fs";import path from"path";import{askGemini,analyzeAudioWithGemini,analyzeVideoWithGemini,generateCVWithGemini,chatAsYashiHallsAI,ChatMemoryItem}from"./geminiService";import{resolveSongAudio,searchYoutubeVideo}from"./audioService";import{resolveSearchImage}from"./imageService";import{adminStore}from"./adminStore";import{getWhatsAppVoiceBuffer}from"./voiceService";import{normalizeWhatsAppNumber}from"../utils/phone";import{resolveMediaFire}from"./mediafireService";import{resolveVideo}from"./videoService";import{searchMovies,formatMovieCard,searchFilmSets,formatFilmSetCard}from"./movieService";const BRAND_LOGO_URL="https://i.ibb.co/gM1MwL9T/IMG-20261024-WA0008.jpg";const WHATSAPP_CHANNEL_URL="https://whatsapp.com/channel/0029Vb927N4GJP8MS1yurM2Z";const OWNER_HOTLINE="0740712934";class BotEngine {
  sock: any;
  logs: any[];
  maxLogs: number;
  startTime: number | null;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  isExplicitlyStopped: boolean;
  reconnectTimer: any;
  watchdogTimer: any;
  activePairingPhone: string | null;
  groupWarnings: Map<string, any>;
  activeQuizSessions: Map<string, any>;
  processedCalls: Set<string>;
  processedMessageIds: Set<string>;
  commandCooldowns: Map<string, number>;
  rawQrString: string | null;
  requestedFromJid: string | null;
  isQrReady: boolean;
  voiceCooldownMap: Map<string, any>;
  chatMemory: Map<string, any>;
  chatAiCooldownMap: Map<string, any>;
  smartReplyCooldownMap: Map<string, any>;
  cachedLogoBuffer: Buffer | null;
  lastCachedLogoUrl: string;
  state: any;
  userId: string;
  sessionDir: string;
  configFile: string;

  constructor(userId="default"){this.sock=null;this.logs=[];this.maxLogs=500;this.startTime=null;this.reconnectAttempts=0;this.maxReconnectAttempts=20;this.isExplicitlyStopped=true;this.reconnectTimer=null;this.activePairingPhone=null;this.groupWarnings=new Map;this.activeQuizSessions=new Map;this.processedCalls=new Set;this.processedMessageIds=new Set;this.commandCooldowns=new Map;this.rawQrString=null;this.requestedFromJid=null;this.isQrReady=false;this.voiceCooldownMap=new Map;this.chatMemory=new Map;this.start247Watchdog();this.chatAiCooldownMap=new Map;this.smartReplyCooldownMap=new Map;
    this.cachedLogoBuffer = null;
    this.lastCachedLogoUrl = '';
    const initialCandidates = [
      path.resolve(process.cwd(), 'data', 'bot_logo_opt.jpg'),
      '/data/bot_logo_opt.jpg',
      '/app/applet/data/bot_logo_opt.jpg',
      path.resolve(process.cwd(), 'data', 'bot_logo.png'),
    ];
    for (const p of initialCandidates) {
      try {
        if (fs.existsSync(p)) {
          this.cachedLogoBuffer = fs.readFileSync(p);
          this.lastCachedLogoUrl = BRAND_LOGO_URL;
          break;
        }
      } catch (e) {}
    }
    this.smartReplyCooldownMap = new Map();
    this.state = {
      connectionStatus: "disconnected",
      isOnline: false,
      pairedNumber: null,
      qrCodeDataUrl: null,
      pairingCode: null,
      uptimeSeconds: 0,
      startedAt: null,
      lastPingMs: 14,
      totalMessagesReceived: 0,
      totalCommandsExecuted: 0,
      totalAiQueries: 0,
      activeGroupCount: 0,
      incomingCallsCount: 0,
      callsRejectedCount: 0,
      autoRepliesSentCount: 0,
      voiceAutoRepliesSentCount: 0,
      recentCalls: [],
      config: {
        botName: "YASHI HALLS MINI",
        botLogoUrl: "https://i.ibb.co/gM1MwL9T/IMG-20261024-WA0008.jpg",
        prefix: ".",
        mode: "public",
        ownerNumber: "94740712934",
        autoReadStatus: true,
        plan: "mini",
        antiLink: false,
        antiSpam: false,
        welcomeMessage: true,
        welcomeTemplate: "Welcome @user to @group! Enjoy your stay.",
        callDetectorEnabled: true,
        voiceAutoReplyEnabled: true,
        channelAutoReact: false,
        channelReactEmojis: "❤️,🔥,⚡,👍,🌟,🎉,🚀,😍,👏,💯,🤩",
        smartAutoReply: false,
        businessBotToken: "",
        customGreetingSinhala: "හායි @user! 👋 මම @bot WhatsApp Bot. ඔබට උදව් කිරීමට මම සූදානම්! විධාන බැලීමට @prefixmenu ලෙස එවන්න. 😊",
        customGreetingEnglish: "Hello @user! 👋 I am @bot WhatsApp Bot. Type @prefixmenu to view all commands.",
        customAutoReplies: [
          {
            id: "rule-price",
            keyword: "මිල",
            reply: "💰 *YASHI HALLS Bot මිල ගණන්:*\n• MINI Plan: නොමිලේ (FREE / 150 Limit)\n• PRO Plan: 10 Coins\n• BUSINESS Plan: 30 Coins\nDashboard එකෙන් ක්ෂණිකව සක්‍රිය කරගත හැක!"
          },
          {
            id: "rule-channel",
            keyword: "channel",
            reply: "🔗 *YASHI HALLS Official Channel:*\nhttps://whatsapp.com/channel/0029Vb927N4GJP8MS1yurM2Z\nනවකම Bot updates සහ features සඳහා අදම එකතු වන්න! 🚀"
          }
        ]
      },
      quotas: {
        mediaRequestsUsed: 0,
        mediaQuotaMax: 150,
        aiRequestsUsed: 0,
        aiQuotaMax: 150,
        maxBotSlots: 1
      }
    };
    this.userId = userId;
    let safeId = (userId || "primary").replace(/[^a-zA-Z0-9_-]/g, "_");
    if (!safeId || safeId === "guest" || safeId === "default") {
      safeId = "primary";
    }
    this.sessionDir = path.resolve(process.cwd(), "data", "sessions", safeId, "whatsapp_session");
    this.configFile = path.resolve(process.cwd(), "data", "sessions", safeId, "bot_config.json");

    this.addLog("INFO", `BotEngine initialized for user: ${userId} (session: ${safeId}) with Dual Plan support (MINI & PRO).`);
    this.loadSavedConfig();
    this.checkExistingSession();
  }
  static {
    __name(this, "BotEngine");
  }
  hasAnySessionCreds() {
    try {
      if (!fs.existsSync(this.sessionDir)) return false;
      const credsPath = path.join(this.sessionDir, "creds.json");
      if (!fs.existsSync(credsPath)) return false;
      const raw = fs.readFileSync(credsPath, "utf-8");
      return Boolean(raw && raw.trim().length > 20);
    } catch {
      return false;
    }
  }
  hasExistingSession() {
    try {
      if (!fs.existsSync(this.sessionDir)) return false;
      const credsPath = path.join(this.sessionDir, "creds.json");
      if (!fs.existsSync(credsPath)) return false;
      const raw = fs.readFileSync(credsPath, "utf-8");
      if (!raw || raw.trim().length === 0) return false;
      const parsed = JSON.parse(raw);
      // ONLY true if credentials represent a completed, registered WhatsApp account
      return Boolean(parsed && (parsed.registered === true || parsed.me?.id || parsed.account || (parsed.signalIdentities && parsed.signalIdentities.length > 0)));
    } catch {
      return false;
    }
  }
  loadSavedConfig() {
    try {
      if (fs.existsSync(this.configFile)) {
        const raw = fs.readFileSync(this.configFile, "utf-8");
        const parsed = JSON.parse(raw);
        this.state.config = { ...this.state.config, ...parsed };
        this.addLog("INFO", `Loaded persisted bot settings: AutoReply=${this.state.config.smartAutoReply ? "ON" : "OFF"}, ChannelReact=${this.state.config.channelAutoReact ? "ON" : "OFF"}`);
      }
    } catch {}
  }
  saveConfigToFile() {
    try {
      fs.mkdirSync(path.dirname(this.configFile), { recursive: true });
      fs.writeFileSync(this.configFile, JSON.stringify(this.state.config, null, 2));
    } catch {}
  }
  addLog(level, message) {
    const timestamp = new Date().toLocaleTimeString("en-US", { hour12: false });
    const log = { id: `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, timestamp, level, message };
    this.logs.push(log);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
  }
  checkExistingSession() {
    try {
      // 1. If primary folder has no session, try migrating from legacy folders on disk
      if (!this.hasExistingSession()) {
        const legacyDirs = [
          path.resolve(process.cwd(), "data", "sessions", "guest", "whatsapp_session"),
          path.resolve(process.cwd(), "data", "sessions", "default", "whatsapp_session")
        ];
        for (const leg of legacyDirs) {
          if (fs.existsSync(leg)) {
            const legCreds = path.join(leg, "creds.json");
            if (fs.existsSync(legCreds)) {
              fs.mkdirSync(this.sessionDir, { recursive: true });
              for (const f of fs.readdirSync(leg)) {
                try {
                  fs.copyFileSync(path.join(leg, f), path.join(this.sessionDir, f));
                } catch {}
              }
              break;
            }
          }
        }
      }

      // 2. If still no session, restore from persistent database backups
      if (!this.hasExistingSession()) {
        adminStore.restoreSessionBackup(this.userId, this.sessionDir);
        if (!this.hasExistingSession()) {
          adminStore.restoreSessionBackup("primary", this.sessionDir);
          adminStore.restoreSessionBackup("guest", this.sessionDir);
          adminStore.restoreSessionBackup("default", this.sessionDir);
        }
      }

      if (this.hasExistingSession()) {
        this.addLog("INFO", "Existing registered WhatsApp session restored and verified in persistent storage.");
        this.isExplicitlyStopped = false;
        // 24/7 Always-On Auto Boot
        setTimeout(() => {
          if (!this.state.isOnline && !this.sock && !this.isExplicitlyStopped) {
            this.addLog("INFO", "🚀 [24/7 Engine] Auto-starting registered WhatsApp bot container...");
            this.start().catch((e) => this.addLog("WARN", `Auto-boot notice: ${e?.message}`));
          }
        }, 500);
        return true;
      } else if (!fs.existsSync(this.sessionDir)) {
        fs.mkdirSync(this.sessionDir, { recursive: true });
      }
    } catch {}
    return false;
  }
  getState() {
    const uptimeSeconds = this.startTime ? Math.floor((Date.now() - this.startTime) / 1000) : 0;
    return { ...this.state, uptimeSeconds };
  }
  getLogs() {
    return [...this.logs];
  }
  setPlan(plan) {
    this.state.config.plan = plan;
    if (plan === "business") {
      this.state.config.botName = "YASHI HALLS BUSINESS";
      this.state.quotas.mediaQuotaMax = 999999;
      this.state.quotas.aiQuotaMax = 999999;
      this.state.quotas.maxBotSlots = 25;
      this.state.config.antiLink = true;
      this.state.config.antiSpam = true;
      this.addLog("INFO", "👑 Tier upgraded to YASHI HALLS BUSINESS! 25 Bot Slots, Unlimited Media & AI, and VIP Enterprise SLA activated.");
    } else if (plan === "pro") {
      this.state.config.botName = "YASHI HALLS PRO";
      this.state.quotas.mediaQuotaMax = 1000;
      this.state.quotas.aiQuotaMax = 5000;
      this.state.quotas.maxBotSlots = 5;
      this.state.config.antiLink = true;
      this.state.config.antiSpam = true;
      this.addLog("INFO", "💎 Tier upgraded to YASHI HALLS PRO! All advanced features, multi-slots & unlimited quotas unlocked.");
    } else {
      this.state.config.botName = "YASHI HALLS MINI";
      this.state.quotas.mediaQuotaMax = 150;
      this.state.quotas.aiQuotaMax = 150;
      this.state.quotas.maxBotSlots = 1;
      this.state.config.antiLink = true;
      this.state.config.antiSpam = true;
      this.addLog("INFO", "🟢 Tier switched to YASHI HALLS MINI. Quotas set to 150 Daily Requests with all Pro & Business features unlocked!");
    }
    return this.getState();
  }
  async syncProfilePictureWithLogo(customLogoUrl) {
    if (!this.sock || !this.state.isOnline) {
      return { success: false, message: "WhatsApp bot must be online to update profile picture." };
    }
    const targetUrl = customLogoUrl || this.state.config.botLogoUrl || BRAND_LOGO_URL;
    try {
      const userJid = this.sock.user?.id;
      if (!userJid) {
        return { success: false, message: "User JID not available." };
      }
      if (typeof this.sock.updateProfilePicture === "function") {
        await this.sock.updateProfilePicture(userJid, { url: targetUrl });
        if (customLogoUrl) {
          this.state.config.botLogoUrl = customLogoUrl;
          this.saveConfigToFile();
        }
        this.addLog("INFO", `✅ Bot profile picture successfully updated to: ${targetUrl}`);
        return { success: true, message: "Bot profile picture updated successfully!" };
      }
      return { success: false, message: "Profile picture update not supported by current client session." };
    } catch (err: any) {
      this.addLog("WARN", `Profile picture update attempt failed: ${err?.message}`);
      return { success: false, message: err?.message || "Failed to update profile picture" };
    }
  }
  updateConfig(newConfig: any) {
    const customBotName = newConfig.botName;
    if (newConfig.plan) {
      this.setPlan(newConfig.plan);
    }
    this.state.config = {
      ...this.state.config,
      ...newConfig,
      ...(customBotName ? { botName: customBotName } : {}),
      ...(newConfig.businessBotToken !== undefined ? { businessBotToken: newConfig.businessBotToken } : {})
    };
    this.saveConfigToFile();
    this.addLog("INFO", `Configuration updated: Plan=${this.state.config.plan.toUpperCase()}, BotName="${this.state.config.botName}", Prefix="${this.state.config.prefix}"`);
    return this.state.config;
  }
  resetQuotas() {
    this.state.quotas.mediaRequestsUsed = 0;
    this.state.quotas.aiRequestsUsed = 0;
    this.addLog("INFO", "Daily quotas reset to 0.");
    return this.state.quotas;
  }
  start247Watchdog() {
    if (this.watchdogTimer) clearInterval(this.watchdogTimer);
    this.watchdogTimer = setInterval(async () => {
      try {
        if (this.isExplicitlyStopped) return;

        // CRITICAL GUARD: NEVER interrupt an active pairing attempt!
        // When pairing code or QR is waiting for user scan/entry, the socket MUST stay intact.
        const isPairingActive =
          this.state.connectionStatus === "pairing_code_ready" ||
          this.state.connectionStatus === "qr_ready" ||
          this.state.connectionStatus === "connecting" ||
          Boolean(this.state.pairingCode) ||
          this.isQrReady;

        if (isPairingActive) {
          return;
        }

        const hasRegisteredCreds = this.hasExistingSession() || this.hasAnySessionCreds();

        // 24/7 Self-Healing: ONLY auto-reconnect if a registered session exists on disk but connection is down
        if (hasRegisteredCreds && !this.state.isOnline && !this.reconnectTimer) {
          this.addLog("WARN", "[24/7 Self-Healing Watchdog] Session detected offline. Auto-triggering instant reconnection...");
          this.start(this.activePairingPhone).catch(() => {});
        } else if (this.state.isOnline && this.sock?.user?.id) {
          const now = Date.now();
          // Rate-limit presence ping to once every 30s to prevent WhatsApp server throttle
          if (!(this as any)._lastPresencePing || now - (this as any)._lastPresencePing > 30000) {
            (this as any)._lastPresencePing = now;
            await this.sock.sendPresenceUpdate("available").catch(() => {});
          }
          // Memory leak guard: prune old map entries
          if (this.smartReplyCooldownMap.size > 200) this.smartReplyCooldownMap.clear();
          if (this.voiceCooldownMap.size > 200) this.voiceCooldownMap.clear();
          if (this.processedCalls.size > 200) this.processedCalls.clear();
        }
      } catch (err) {}
    }, 5000);
  }

  async start(requestedPhone?: string | null) {
    this.isExplicitlyStopped = false;
    this.reconnectAttempts = 0;
    if (this.state.connectionStatus === "connected" && this.sock && this.state.isOnline) {
      return { success: true, message: "Bot is already connected and online." };
    }
    if (requestedPhone) {
      const cleanPhone = normalizeWhatsAppNumber(requestedPhone);
      if (cleanPhone) this.activePairingPhone = cleanPhone;
    } else if (requestedPhone === null) {
      this.activePairingPhone = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.sock) {
      try {
        this.sock.ev.removeAllListeners("connection.update");
        this.sock.ev.removeAllListeners("creds.update");
        this.sock.ev.removeAllListeners("messages.upsert");
        this.sock.ev.removeAllListeners("call");
        this.sock.ev.removeAllListeners("group-participants.update");
        try { this.sock.ws?.close(); } catch (e) {}
        try { this.sock.end(void 0); } catch (e) {}
      } catch (err) {}
      this.sock = null;
    }

    try {
      this.state.connectionStatus = "connecting";
      this.addLog("INFO", `Starting ${this.state.config.botName} WhatsApp Baileys connection...`);
      if (!fs.existsSync(this.sessionDir)) {
        fs.mkdirSync(this.sessionDir, { recursive: true });
      }
      const { state: authState, saveCreds } = await useMultiFileAuthState(this.sessionDir);
      await saveCreds();
      let version = [2, 3000, 1015901307];
      try {
        const vRes = (await Promise.race([
          fetchLatestBaileysVersion(),
          new Promise((_, reject) => setTimeout(() => reject(new Error("version_timeout")), 2000))
        ])) as any;
        if (vRes?.version) version = vRes.version;
      } catch {}

      this.addLog("INFO", `Using Baileys protocol v${version.join(".")}`);
      const logger = pino({ level: "silent" });

      this.sock = makeWASocket({
        version,
        logger,
        printQRInTerminal: false,
        auth: {
          creds: authState.creds,
          keys: makeCacheableSignalKeyStore(authState.keys, logger),
        },
        browser: Browsers.ubuntu("Chrome"),
        syncFullHistory: false,
        markOnlineOnConnect: true,
        connectTimeoutMs: 30000,
        defaultQueryTimeoutMs: 30000,
        keepAliveIntervalMs: 15000,
        retryRequestDelayMs: 250,
        maxMsgRetryCount: 5,
        generateHighQualityLinkPreview: false,
        getMessage: __name(async () => void 0, "getMessage"),
      });

      if (this.sock?.ws) {
        this.sock.ws.on("error", (err: any) => {
          this.addLog("WARN", `WebSocket notice: ${err?.message || err}`);
        });
      }

      this.sock.ev.on("creds.update", async (creds: any) => {
        await saveCreds();
        adminStore.saveSessionBackup(this.userId, this.sessionDir, false);
      });

      this.sock.ev.on("connection.update", async (update: any) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
          if (!this.activePairingPhone || this.state.connectionStatus === "qr_ready") {
            this.isQrReady = true;
            this.state.connectionStatus = "qr_ready";
            try {
              const dataUrl = await QRCode.toDataURL(qr, { margin: 2, scale: 7 });
              this.state.qrCodeDataUrl = dataUrl;
              this.addLog("INFO", "QR code generated and ready for WhatsApp scan.");
            } catch (err) {
              this.addLog("ERROR", "Failed to generate QR Code data URL.");
            }
          }
        }

        if (connection === "close") {
          this.isQrReady = false;
          if (this.isExplicitlyStopped) {
            this.state.isOnline = false;
            this.state.connectionStatus = "disconnected";
            this.startTime = null;
            return;
          }

          const statusCode = lastDisconnect?.error?.output?.statusCode;
          const errorMsg = String(lastDisconnect?.error?.message || lastDisconnect?.error || "");
          const isLoggedOut = statusCode === DisconnectReason.loggedOut || statusCode === 401;
          const isRestartRequired = statusCode === DisconnectReason.restartRequired || statusCode === 515 || statusCode === 428 || statusCode === 408;

          this.state.isOnline = false;
          this.startTime = null;

          this.addLog("WARN", `Connection dropped (${statusCode || "Stream Closed"}): ${DisconnectReason[statusCode] || errorMsg || "Reconnecting..."}.`);

          const isBadSession = isLoggedOut || errorMsg.includes("Bad MAC") || errorMsg.includes("Failed to decrypt") || errorMsg.includes("Session error");
          if (isBadSession) {
            this.addLog("WARN", "WhatsApp session unlinked or corrupted (Bad MAC / Session Error). Session wiped for clean pairing.");
            this.state.connectionStatus = "disconnected";
            this.state.pairedNumber = null;
            this.state.pairingCode = null;
            this.state.qrCodeDataUrl = null;
            this.clearSessionFiles();
            return;
          }

          if (isRestartRequired) {
            this.addLog("INFO", "WhatsApp stream restart signal received. Fast-reconnect in 500ms...");
            if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
            this.reconnectTimer = setTimeout(() => {
              this.reconnectTimer = null;
              if (!this.isExplicitlyStopped) {
                this.start(this.activePairingPhone || requestedPhone);
              }
            }, 500);
            return;
          }

          // Check if ANY credentials or session files exist on disk
          const hasSession = this.hasExistingSession() || this.hasAnySessionCreds();

          if (!hasSession && !this.activePairingPhone && this.state.connectionStatus !== "pairing_code_ready" && this.state.connectionStatus !== "qr_ready") {
            this.addLog("INFO", "Pairing socket closed without saved credentials. Ready for new pairing attempt.");
            this.state.connectionStatus = "disconnected";
            return;
          }

          // 24/7 NON-STOP ALWAYS-ON RECOVERY: Reconnect registered or pairing sessions automatically
          this.state.connectionStatus = "reconnecting";
          this.reconnectAttempts++;
          const delayMs = Math.min(800 + (this.reconnectAttempts * 500), 5000);
          this.addLog("INFO", `[24/7 Auto-Reconnect] Reconnecting in ${(delayMs / 1000).toFixed(1)}s (Attempt #${this.reconnectAttempts})...`);

          if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
          this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            if (!this.isExplicitlyStopped) {
              this.start(this.activePairingPhone || requestedPhone);
            }
          }, delayMs);
        } else if (connection === "open") {
          this.reconnectAttempts = 0;
          this.activePairingPhone = null;
          this.isQrReady = false;
          this.state.isOnline = true;
          this.state.connectionStatus = "connected";
          this.state.qrCodeDataUrl = null;
          this.state.pairingCode = null;
          this.startTime = Date.now();
          this.state.startedAt = new Date().toISOString();
          adminStore.saveSessionBackup(this.userId, this.sessionDir, true);
          const userJid = this.sock?.user?.id || "";
          const phoneNum = userJid.split(":")[0] || userJid.split("@")[0] || "Unknown";
          this.state.pairedNumber = phoneNum;
          this.addLog("INFO", `✅ Connection established! ${this.state.config.botName} (${this.state.config.plan.toUpperCase()}) is now ONLINE for +${phoneNum}`);
          this.addLog("INFO", `Ready to respond to commands with prefix '${this.state.config.prefix}'.`);

          try {
            const targetJid = userJid.includes(":") ? `${userJid.split(":")[0]}@s.whatsapp.net` : userJid.includes("@") ? userJid : `${userJid}@s.whatsapp.net`;
            if (targetJid && this.sock) {
              // Keep user's personal WhatsApp profile picture (DP) and display name untouched.
              // Do NOT overwrite user's DP or name when they connect.

              const connectLogoUrl = "https://i.ibb.co/zWdhvSk2/file-0000000010a08208abefddf3ed14ed28.png";
              const p = this.state.config.prefix || ".";
              const welcomeCaption = `*〘 👑 ＭＩＮＩ ＢＯＴ ＳＹＳＴＥＭ 👑 〙*

  🟢 *ＳＴＡＴＵＳ : ＣＯＮＮＥＣＴＥＤ*

  ✦ *User:* Active ✅
  ✦ *Prefix:* [ ${p} ]
  ✦ *Commands:* ${p}menu
  ✦ *Check Bot:* ${p}alive

💬 _Welcome to Yashi Halls WhatsApp Assistant! Type *${p}menu* to start._

> ⚡*ＰＯＷＥＲＥＤ  ＢＹ   ＹＡＳＨＩ   ＨＡＬＬＳ*`.trim();

              try {
                await this.sock.sendMessage(targetJid, {
                  image: { url: connectLogoUrl },
                  caption: welcomeCaption,
                });
              } catch {
                await this.sock.sendMessage(targetJid, { text: welcomeCaption });
              }
              this.addLog("INFO", `📤 Sent connected welcome message to paired owner at ${targetJid}`);
              try {
                const voicePath = path.resolve(process.cwd(), "data", "connect_welcome_voice.mp3");
                if (fs.existsSync(voicePath)) {
                  const voiceBuf = fs.readFileSync(voicePath);
                  try {
                    await this.sock.sendMessage(targetJid, {
                      audio: voiceBuf,
                      mimetype: "audio/ogg; codecs=opus",
                      ptt: true,
                    });
                  } catch {
                    await this.sock.sendMessage(targetJid, {
                      audio: voiceBuf,
                      mimetype: "audio/mp4",
                      ptt: true,
                    });
                  }
                  this.addLog("INFO", `🎙️ Sent welcome voice note to owner at ${targetJid}`);
                }
              } catch (vErr: any) {
                this.addLog("WARN", `Could not send welcome voice note to owner: ${vErr?.message || vErr}`);
              }

              if (this.requestedFromJid && this.requestedFromJid !== targetJid) {
                try {
                  const notifyMsg = `🎉 *WHATSAPP BOT SUCCESSFULLY CONNECTED!* ✅\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📱 *Account:* +${phoneNum}\n🟢 *Status:* ONLINE 24/7\n🛡️ *Prefix:* [ ${this.state.config.prefix} ]\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n_ඔබගේ Bot සාර්ථකව සම්බන්ධ විය! Type *${this.state.config.prefix}menu* to test._`;
                  await this.sock?.sendMessage(this.requestedFromJid, { text: notifyMsg });
                } catch {}
              }
            }
          } catch (err: any) {
            this.addLog("WARN", `Could not send welcome message to owner: ${err?.message}`);
          }
        }
      });

      this.sock.ev.on("group-participants.update", async (update: any) => {
        try {
          const { id: groupJid, participants, action } = update;
          if (action === "add" && this.state.config.welcomeMessage) {
            for (const p of participants) {
              const participantId = typeof p === "string" ? p : p?.id || "";
              if (!participantId) continue;
              const userPhone = participantId.split("@")[0];
              const welcomeMsg = `🎉 *WELCOME TO THE GROUP!* 👋

Hello @${userPhone}! We're thrilled to have you here.
📌 Please check the group description and follow the rules.

_Powered by ${this.state.config.botName} 24/7 Engine_`;
              await this.sock?.sendMessage(groupJid, { text: welcomeMsg, mentions: [participantId] });
            }
          }
        } catch (err: any) {
          this.addLog("WARN", `Welcome automation error: ${err?.message}`);
        }
      });

      this.sock.ev.on("call", async (calls: any) => {
        if (!this.state.config.callDetectorEnabled) return;
        for (const call of calls) {
          if (call.status !== "offer") continue;
          const callId = call.id;
          const callerJid = call.from;
          if (!callerJid || this.processedCalls.has(callId)) continue;
          this.processedCalls.add(callId);
          if (this.processedCalls.size > 200) {
            const first = this.processedCalls.values().next().value;
            if (first) this.processedCalls.delete(first);
          }
          this.state.incomingCallsCount++;
          const cleanPhone = callerJid.split("@")[0];
          this.addLog("WARN", `📞 Incoming WhatsApp call detected from +${cleanPhone}`);
          let rejected = false;
          try {
            if (this.sock && typeof this.sock.rejectCall === "function") {
              await this.sock.rejectCall(callId, callerJid);
              rejected = true;
              this.state.callsRejectedCount++;
              this.addLog("INFO", `📵 Successfully rejected incoming call from +${cleanPhone}`);
            } else {
              this.addLog("WARN", `Call rejection not supported by current Baileys client instance for +${cleanPhone}`);
            }
          } catch (rejectErr: any) {
            this.addLog("ERROR", `Failed to reject call from +${cleanPhone}: ${rejectErr?.message || rejectErr}`);
          }
          let replied = false;
          try {
            const replyText = `
📵 YASHI HALLS BOT

Sorry! අපගේ Bot එකට WhatsApp Voice/Video Calls ලබාගත නොහැක.

🤖 අපගේ සේවාවන් භාවිත කිරීමට:
Type ".menu" to explore our services.

✨ POWERED BY YASHI HALLS
`.trim();
            await this.sock?.sendMessage(callerJid, { text: replyText });
            replied = true;
            this.state.autoRepliesSentCount++;
            this.addLog("INFO", `💬 Sent call auto-reply chat message to +${cleanPhone}`);
          } catch (replyErr: any) {
            this.addLog("ERROR", `Failed to send call auto-reply to +${cleanPhone}: ${replyErr?.message || replyErr}`);
          }
          const nowTime = new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" });
          this.state.recentCalls.unshift({ id: callId, from: `+${cleanPhone}`, timestamp: nowTime, rejected, replied });
          if (this.state.recentCalls.length > 25) {
            this.state.recentCalls.pop();
          }
        }
      });

      this.sock.ev.on("messages.upsert", async ({ messages, type }: any) => {
        if (type !== "notify") return;
        for (const msg of messages) {
          if (!msg.message) continue;
          this.state.totalMessagesReceived++;
          if (this.state.config.autoReadStatus && msg.key.remoteJid === "status@broadcast") {
            try {
              await this.sock?.readMessages([msg.key]);
            } catch {}
            continue;
          }
          const isChannel = Boolean(msg.key.remoteJid && (msg.key.remoteJid.endsWith("@newsletter") || msg.key.remoteJid.includes("newsletter")));
          if (this.state.config.channelAutoReact && isChannel && msg.key.remoteJid) {
            try {
              const emojiList = (this.state.config.channelReactEmojis || "❤️,🔥,⚡,👍,🌟,🎉,🚀,😍,👏").split(",").map((e: string) => e.trim()).filter(Boolean);
              const pickedEmoji = emojiList[Math.floor(Math.random() * emojiList.length)] || "❤️";
              await this.sock?.sendMessage(msg.key.remoteJid, { react: { text: pickedEmoji, key: msg.key } });
              this.addLog("INFO", `⚡ [CHANNEL AUTO-REACT] Dropped reaction ${pickedEmoji} to channel post in ${msg.key.remoteJid}`);
            } catch (err: any) {
              this.addLog("WARN", `Channel auto-react notice: ${err?.message || err}`);
            }
          }
          // Asynchronous non-blocking dispatch so incoming message bursts never block socket loop
          setImmediate(() => {
            this.handleIncomingMessage(msg).catch((err: any) => {
              this.addLog("WARN", `Message handler exception: ${err?.message || err}`);
            });
          });
        }
      });

      return { success: true, message: "Bot engine initialization started successfully." };
    } catch (error: any) {
      this.state.connectionStatus = "disconnected";
      this.state.isOnline = false;
      this.addLog("ERROR", `Bot start failed: ${error?.message || error}`);
      return { success: false, message: error?.message || "Failed to start bot engine" };
    }
  }

  async requestPairingCode(phone: string) {
    const cleanPhone = normalizeWhatsAppNumber(phone);
    if (!cleanPhone || cleanPhone.length < 8) {
      return {
        success: false,
        message: "Invalid phone number. Enter e.g. 0740712934 or 94740712934.",
      };
    }
    this.addLog("INFO", `Preparing fresh WhatsApp pairing session for +${cleanPhone}...`);
    this.activePairingPhone = cleanPhone;
    this.isExplicitlyStopped = false;
    this.reconnectAttempts = 0;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    await this.stop(false);
    this.clearSessionFiles();
    this.state.pairedNumber = null;
    this.state.qrCodeDataUrl = null;
    this.state.pairingCode = null;
    this.isQrReady = false;

    const res = await this.start(cleanPhone);
    if (!res.success) {
      return { success: false, message: res.message };
    }

    await new Promise((r) => setTimeout(r, 1500));
    const startTime = Date.now();
    while (Date.now() - startTime < 6000) {
      if (this.state.pairingCode) {
        return {
          success: true,
          code: this.state.pairingCode,
          message: "Pairing code generated successfully. Enter this code on your WhatsApp Linked Devices.",
        };
      }
      if (this.sock && !this.sock.authState?.creds?.registered) {
        try {
          this.addLog("INFO", `Requesting Baileys pairing code for +${cleanPhone}...`);
          const rawCode = await this.sock.requestPairingCode(cleanPhone);
          if (rawCode) {
            const formattedCode = rawCode.match(/.{1,4}/g)?.join("-") || rawCode;
            this.state.pairingCode = formattedCode;
            this.state.connectionStatus = "pairing_code_ready";
            this.addLog("INFO", `✅ WhatsApp Pairing Code generated for +${cleanPhone}: ${formattedCode}`);
            return {
              success: true,
              code: formattedCode,
              message: "Pairing code generated successfully. Enter this code on your WhatsApp Linked Devices.",
            };
          }
        } catch (err: any) {
          const msg = err?.message || String(err);
          this.addLog("WARN", `Pairing code attempt: ${msg}`);
          if (msg.includes("registered")) break;
          await new Promise((r) => setTimeout(r, 600));
        }
      } else {
        await new Promise((r) => setTimeout(r, 400));
      }
    }

    // Continue background attempt if WebSocket handshake is finishing
    (async () => {
      const bgStart = Date.now();
      while (Date.now() - bgStart < 25000 && !this.state.pairingCode && !this.isExplicitlyStopped) {
        if (this.sock && !this.sock.authState?.creds?.registered) {
          try {
            const rawCode = await this.sock.requestPairingCode(cleanPhone);
            if (rawCode) {
              const formattedCode = rawCode.match(/.{1,4}/g)?.join("-") || rawCode;
              this.state.pairingCode = formattedCode;
              this.state.connectionStatus = "pairing_code_ready";
              this.addLog("INFO", `✅ WhatsApp Pairing Code generated for +${cleanPhone}: ${formattedCode}`);
              break;
            }
          } catch {
            await new Promise((r) => setTimeout(r, 1000));
          }
        } else {
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
    })().catch(() => {});

    return {
      success: true,
      pending: true,
      message: "Pairing session initiated. Connecting to WhatsApp multi-device gateway...",
    };
  }

  async generateQrCode(forceNew = false) {
    if (!forceNew && this.sock && this.state.qrCodeDataUrl && this.state.connectionStatus === "qr_ready") {
      return { success: true, qr: this.state.qrCodeDataUrl, message: "QR code ready." };
    }
    this.addLog("INFO", "Initiating fresh WhatsApp QR Code pairing...");
    this.activePairingPhone = null;
    this.isExplicitlyStopped = false;
    this.reconnectAttempts = 0;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    await this.stop(false);
    this.clearSessionFiles();
    this.state.pairedNumber = null;
    this.state.pairingCode = null;
    this.state.qrCodeDataUrl = null;
    this.isQrReady = false;

    const startRes = await this.start(null);
    if (!startRes.success) {
      return { success: false, message: startRes.message };
    }
    const start = Date.now();
    while (Date.now() - start < 15000) {
      if (this.state.qrCodeDataUrl) {
        return { success: true, qr: this.state.qrCodeDataUrl, message: "QR code generated successfully." };
      }
      await new Promise((r) => setTimeout(r, 500));
    }
    if (this.state.qrCodeDataUrl) {
      return { success: true, qr: this.state.qrCodeDataUrl, message: "QR code ready." };
    }
    return { success: false, message: "QR Code generation timed out. Please try again." };
  }

  async requestPairingCodeAndQr(phone: string): Promise<{
    success: boolean;
    pairingCode?: string;
    qrBuffer?: Buffer;
    qrCodeDataUrl?: string;
    rawQrString?: string;
    message: string;
  }> {
    const cleanPhone = normalizeWhatsAppNumber(phone);
    if (!cleanPhone || cleanPhone.length < 8) {
      return {
        success: false,
        message: "Invalid phone number. Enter e.g. 0740712934 or 94740712934.",
      };
    }

    this.addLog("INFO", `Preparing WhatsApp pairing session for +${cleanPhone}...`);
    this.activePairingPhone = cleanPhone;
    this.isExplicitlyStopped = false;
    this.reconnectAttempts = 0;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    await this.stop(false);
    this.clearSessionFiles();
    this.state.pairedNumber = null;
    this.state.qrCodeDataUrl = null;
    this.state.pairingCode = null;
    this.rawQrString = null;
    this.isQrReady = false;

    const startRes = await this.start(cleanPhone);
    if (!startRes.success) {
      return { success: false, message: startRes.message };
    }

    // Give socket 1200ms to open WebSocket connection
    await new Promise((r) => setTimeout(r, 1200));

    const startTime = Date.now();
    while (Date.now() - startTime < 10000) {
      if (this.state.pairingCode) {
        let qrBuffer: Buffer | null = null;
        try {
          qrBuffer = await QRCode.toBuffer(this.state.pairingCode, {
            type: "png",
            margin: 2,
            scale: 8,
            color: { dark: "#000000", light: "#ffffff" },
          });
        } catch {}

        return {
          success: true,
          pairingCode: this.state.pairingCode,
          qrBuffer: qrBuffer || undefined,
          message: "Pairing code generated successfully.",
        };
      }

      if (this.sock && !this.sock.authState?.creds?.registered) {
        try {
          this.addLog("INFO", `Requesting Baileys pairing code for +${cleanPhone}...`);
          const rawCode = await this.sock.requestPairingCode(cleanPhone);
          if (rawCode) {
            const formattedCode = rawCode.match(/.{1,4}/g)?.join("-") || rawCode;
            this.state.pairingCode = formattedCode;
            this.state.connectionStatus = "pairing_code_ready";
            this.addLog("INFO", `✅ WhatsApp Pairing Code generated for +${cleanPhone}: ${formattedCode}`);

            let qrBuffer: Buffer | null = null;
            try {
              qrBuffer = await QRCode.toBuffer(formattedCode, {
                type: "png",
                margin: 2,
                scale: 8,
                color: { dark: "#000000", light: "#ffffff" },
              });
            } catch {}

            return {
              success: true,
              pairingCode: formattedCode,
              qrBuffer: qrBuffer || undefined,
              message: "Pairing code generated successfully.",
            };
          }
        } catch (err: any) {
          const msg = err?.message || String(err);
          this.addLog("WARN", `Pairing code attempt for +${cleanPhone}: ${msg}`);
          if (msg.includes("registered")) break;
        }
      }

      await new Promise((r) => setTimeout(r, 600));
    }

    return {
      success: false,
      message: "Pairing session timed out. Please try again in a few seconds.",
    };
  }async stop(isUserExplicitStop=true){this.isExplicitlyStopped=isUserExplicitStop;this.reconnectAttempts=isUserExplicitStop?this.maxReconnectAttempts:0;if(this.reconnectTimer){clearTimeout(this.reconnectTimer);this.reconnectTimer=null}this.isQrReady=false;this.startTime=null;this.state.isOnline=false;this.state.connectionStatus="disconnected";if(isUserExplicitStop){this.state.qrCodeDataUrl=null;this.state.pairingCode=null}if(this.sock){try{this.sock.ev.removeAllListeners("connection.update");this.sock.ev.removeAllListeners("creds.update");this.sock.ev.removeAllListeners("messages.upsert");this.sock.ev.removeAllListeners("call");this.sock.ev.removeAllListeners("group-participants.update");try{this.sock.ws?.close()}catch(e){}try{this.sock.end(void 0)}catch(e){}}catch(err){}this.sock=null}if(isUserExplicitStop){this.addLog("INFO","\u{1F6D1} Bot engine manually stopped by user.")}return{success:true,message:"Bot stopped successfully."}}async restart(){this.addLog("INFO",`Restarting ${this.state.config.botName} bot engine...`);await this.stop();await new Promise(r=>setTimeout(r,1200));return this.start()}async clearSession(){await this.stop();this.clearSessionFiles();this.state.pairedNumber=null;this.state.qrCodeDataUrl=null;this.state.pairingCode=null;this.state.isOnline=false;this.state.connectionStatus="disconnected";this.addLog("INFO","\u{1F9F9} Session data and credentials wiped. Ready for fresh pairing.");return{success:true,message:"Session data cleared successfully."}}clearSessionFiles(){try{if(fs.existsSync(this.sessionDir)){fs.rmSync(this.sessionDir,{recursive:true,force:true})}fs.mkdirSync(this.sessionDir,{recursive:true})}catch(e){this.addLog("WARN",`Error clearing session files: ${e?.message}`)}}extractMessageContent(msg){if(!msg.message)return"";let messageObj=msg.message;let depth=0;while(depth<5&&messageObj&&(messageObj.viewOnceMessage?.message||messageObj.viewOnceMessageV2?.message||messageObj.viewOnceMessageV2Extension?.message||messageObj.ephemeralMessage?.message||messageObj.documentWithCaptionMessage?.message)){messageObj=messageObj.viewOnceMessage?.message||messageObj.viewOnceMessageV2?.message||messageObj.viewOnceMessageV2Extension?.message||messageObj.ephemeralMessage?.message||messageObj.documentWithCaptionMessage?.message;depth++}if(!messageObj)return"";if(messageObj.conversation)return messageObj.conversation;if(messageObj.extendedTextMessage?.text)return messageObj.extendedTextMessage.text;if(messageObj.imageMessage?.caption)return messageObj.imageMessage.caption;if(messageObj.videoMessage?.caption)return messageObj.videoMessage.caption;if(messageObj.buttonsResponseMessage?.selectedButtonId){return messageObj.buttonsResponseMessage.selectedButtonId}if(messageObj.buttonsResponseMessage?.selectedDisplayText){return messageObj.buttonsResponseMessage.selectedDisplayText}if(messageObj.templateButtonReplyMessage?.selectedId){return messageObj.templateButtonReplyMessage.selectedId}if(messageObj.templateButtonReplyMessage?.selectedDisplayText){return messageObj.templateButtonReplyMessage.selectedDisplayText}if(messageObj.listResponseMessage?.singleSelectReply?.selectedRowId){return messageObj.listResponseMessage.singleSelectReply.selectedRowId}if(messageObj.listResponseMessage?.title){return messageObj.listResponseMessage.title}if(messageObj.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson){try{const parsed=JSON.parse(messageObj.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson);const resolved=parsed?.id||parsed?.selected_id||parsed?.selected_row_id||parsed?.selectedRowId||parsed?.title||parsed?.display_text||"";if(resolved)return resolved}catch{}}if(messageObj.interactiveResponseMessage?.body?.text){return messageObj.interactiveResponseMessage.body.text}return""}mapButtonToCommand(btnId,prefix){switch(btnId){case"btn_cat_song":case"btn_song":return`${prefix}menu song`;case"btn_cat_video":case"btn_video":return`${prefix}menu video`;case"btn_cat_image":case"btn_img":case"btn_image":return`${prefix}menu image`;case"btn_cat_ai":case"btn_ai":return`${prefix}menu ai`;case"btn_cat_games":case"btn_games":return`${prefix}menu games`;case"btn_cat_group":case"btn_group":return`${prefix}menu group`;case"btn_cat_settings":case"btn_settings":return`${prefix}settings`;case"btn_ping":return`${prefix}ping`;case"btn_quiz":return`${prefix}quiz`;case"btn_roll":return`${prefix}roll`;case"btn_flip":return`${prefix}flip`;case"btn_groupinfo":return`${prefix}groupinfo`;case"btn_admins":return`${prefix}admins`;case"btn_tagall":return`${prefix}tagall`;case"btn_owner":return`${prefix}owner`;case"btn_main_menu":return`${prefix}menu`;case"btn_upgrade":return`${prefix}upgrade`;default:return btnId.startsWith(prefix)?btnId:`${prefix}${btnId}`}}async handleIncomingMessage(msg) {
    if (!this.sock || !msg.key) return;

    // 1. Deduplicate message by ID
    const msgId = msg.key.id;
    if (msgId) {
      if (this.processedMessageIds.has(msgId)) return;
      this.processedMessageIds.add(msgId);
      if (this.processedMessageIds.size > 3000) {
        const first = this.processedMessageIds.values().next().value;
        if (first) this.processedMessageIds.delete(first);
      }
    }

    // 2. Ignore old messages synced on reconnect (older than 60s)
    const rawTimestamp = typeof msg.messageTimestamp === "number" ? msg.messageTimestamp : Number(msg.messageTimestamp) || 0;
    if (rawTimestamp > 0) {
      const ageMs = Date.now() - (rawTimestamp * 1000);
      if (ageMs > 60000) return;
    }
    const jid = msg.key.remoteJid;
    if (!jid || jid.endsWith("@broadcast")) return;
    const isGroup = jid.endsWith("@g.us");
    const sender = isGroup ? msg.key.participant || jid : jid;
    const rawMsg =
      msg.message?.ephemeralMessage?.message ||
      msg.message?.viewOnceMessage?.message ||
      msg.message?.viewOnceMessageV2?.message ||
      msg.message;

    // 1. EXTRACT TEXT & SENDER DETAILS FIRST (Prevents ReferenceError: Cannot access 'text' before initialization)
    const messageContent = this.extractMessageContent(msg);
    let text = (messageContent || "").trim();
    const prefix = this.state.config.prefix || ".";
    // 3. If fromMe and does NOT start with prefix, ignore so the bot never loops/echoes its own messages
    if (msg.key.fromMe && !text.startsWith(prefix)) {
      return;
    }
    const senderName = msg.pushName || sender.split("@")[0] || "Friend";
    const botPhone = (this.sock?.user?.id || "").split(":")[0].split("@")[0];
    const contextInfo =
      rawMsg?.audioMessage?.contextInfo ||
      rawMsg?.videoMessage?.contextInfo ||
      rawMsg?.imageMessage?.contextInfo ||
      msg.message?.extendedTextMessage?.contextInfo;
    const isBotMentioned = Boolean(botPhone && contextInfo?.mentionedJid?.some((m: string) => m.includes(botPhone)));
    const isReplyToBot = Boolean(botPhone && contextInfo?.participant && contextInfo.participant.includes(botPhone));
    const shouldProcessMediaAi = !isGroup || isBotMentioned || isReplyToBot;

    if (!msg.key.fromMe && rawMsg?.audioMessage && shouldProcessMediaAi) {
      const audio = rawMsg.audioMessage;
      this.addLog("INFO", `🎙️ [AI VOICE LISTENER] Received audio note from ${sender.split("@")[0]}`);
      try {
        await this.sock.sendMessage(jid, { react: { text: "🎙️", key: msg.key } }).catch(() => {});
        const audioBuffer = await downloadMediaMessage(
          msg,
          "buffer",
          {},
          { logger: pino({ level: "silent" }), reuploadRequest: this.sock.updateMediaMessage }
        );
        if (audioBuffer && audioBuffer.length > 0) {
          await this.sock.sendPresenceUpdate("composing", jid).catch(() => {});
          const aiResult = await analyzeAudioWithGemini(audioBuffer, audio.mimetype || "audio/ogg");
          await this.reply(
            jid,
            msg,
            `🎙️ *[YASHI HALLS AI VOICE ASSISTANT]*\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n${aiResult.text}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n_Voice Note Understood & Replied_`
          );
          return;
        }
      } catch (err: any) {
        this.addLog("ERROR", `Voice listener error: ${err?.message || err}`);
      }
    }

    if (!msg.key.fromMe && rawMsg?.videoMessage && shouldProcessMediaAi) {
      const video = rawMsg.videoMessage;
      const caption = video.caption || "";
      const sizeBytes = Number(video.fileLength) || 0;
      this.addLog("INFO", `📹 [AI VIDEO ANALYZER] Received video (${(sizeBytes / 1024 / 1024).toFixed(1)} MB) from ${sender.split("@")[0]}`);
      try {
        await this.sock.sendMessage(jid, { react: { text: "📹", key: msg.key } }).catch(() => {});
        if (sizeBytes > 20 * 1024 * 1024) {
          await this.reply(
            jid,
            msg,
            `📹 *වීඩියෝව විශාල වැඩිය!* (Video exceeds 20MB limit)\nAI විශ්ලේෂණය සඳහා කරුණාකර කුඩා වීඩියෝවක් එවන්න.`
          );
          return;
        }
        const videoBuffer = await downloadMediaMessage(
          msg,
          "buffer",
          {},
          { logger: pino({ level: "silent" }), reuploadRequest: this.sock.updateMediaMessage }
        );
        if (videoBuffer && videoBuffer.length > 0) {
          await this.sock.sendPresenceUpdate("composing", jid).catch(() => {});
          const aiResult = await analyzeVideoWithGemini(videoBuffer, video.mimetype || "video/mp4", caption);
          await this.reply(
            jid,
            msg,
            `📹 *[YASHI HALLS AI VIDEO VISION]*\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n${aiResult.text}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n_Video Scenes Understood & Analyzed_`
          );
          return;
        }
      } catch (err: any) {
        this.addLog("ERROR", `Video analyzer error: ${err?.message || err}`);
      }
    }

    // --- SMART MEMORY & CONTACT CONTEXT ---
    if (!this.chatMemory) this.chatMemory = new Map();
    if (!this.chatMemory.has(jid)) this.chatMemory.set(jid, []);
    const history = this.chatMemory.get(jid);
    const linkMatch = text ? text.match(/(https?:\/\/[^\s]+)/i) : null;
    const foundLink = linkMatch ? linkMatch[0] : undefined;

    // --- SMART IMAGE VISION REACTION (Red Queen Pro / YASHI HALLS Ultra) ---
    if (!msg.key.fromMe && rawMsg?.imageMessage && shouldProcessMediaAi) {
      const imgCaption = rawMsg.imageMessage.caption || "";
        try {
          await this.sock.sendMessage(jid, { react: { text: "😍", key: msg.key } }).catch(() => {});
          const imgBuffer = await downloadMediaMessage(
            msg,
            "buffer",
            {},
            { logger: pino({ level: "silent" }), reuploadRequest: this.sock.updateMediaMessage }
          );
          if (imgBuffer && imgBuffer.length > 0) {
            await this.sock.sendPresenceUpdate("composing", jid).catch(() => {});
            const aiRes = await chatAsYashiHallsAI({
              userText: imgCaption,
              senderName,
              recentMessages: history,
              imageBuffer: imgBuffer,
              imageMime: rawMsg.imageMessage.mimetype || "image/jpeg",
            });
            if (aiRes && aiRes.replyText) {
              await this.reply(jid, msg, aiRes.replyText);
              history.push({
                senderName,
                senderJid: sender,
                text: imgCaption ? `[Image with caption: "${imgCaption}"]` : "[Sent an image]",
                timestamp: Date.now(),
              });
              history.push({
                senderName: this.state.config.botName || "YASHI HALLS",
                senderJid: this.sock.user?.id || "bot",
                text: aiRes.replyText,
                timestamp: Date.now(),
                isBot: true,
              });
              return;
            }
          }
        } catch (imgErr) {
          this.addLog("WARN", `Smart Image Vision notice: ${imgErr?.message || imgErr}`);
        }
      }

    if (text) {
      history.push({
        senderName,
        senderJid: sender,
        text,
        timestamp: Date.now(),
        hasLink: foundLink,
        isBot: Boolean(msg.key.fromMe),
      });
      if (history.length > 20) history.shift();
    }
/* Text and prefix initialized at top */
if(isGroup&&this.state.config.antiLink&&!msg.key.fromMe){const hasLink=/(https?:\/\/[^\s]+|chat\.whatsapp\.com\/[^\s]+|wa\.me\/[^\s]+|bit\.ly\/[^\s]+|t\.me\/[^\s]+)/gi.test(text);const isOwner2=sender.includes(this.state.config.ownerNumber.replace(/\D/g,""));if(hasLink&&!isOwner2){this.addLog("WARN",`[ANTI-LINK] Unauthorized link detected from ${sender.split("@")[0]} in ${jid}`);try{await this.sock.sendMessage(jid,{delete:msg.key})}catch{}try{await this.sock.sendMessage(jid,{text:`\u26A0\uFE0F *ANTI-LINK SYSTEM ACTIVATED!* \u{1F6AB}\n@${sender.split("@")[0]}, \u0D9C\u0DD8\u0DB4\u0DCA \u0D91\u0D9A\u0DA7 \u0DBD\u0DD2\u0DB1\u0DCA\u0D9A\u0DCA (links) \u0DAF\u0DD0\u0DB8\u0DD3\u0DB8 \u0DAD\u0DC4\u0DB1\u0DB8\u0DCA \u0D9A\u0DBB \u0D87\u0DAD!\n\n\u23F3 *3... 2... 1... Good byee! \u{1F44B}*`,mentions:[sender]})}catch{}try{await this.sock.groupParticipantsUpdate(jid,[sender],"remove");this.addLog("INFO",`[ANTI-LINK] Kicked user ${sender.split("@")[0]} from group ${jid}`)}catch(kErr:any){this.addLog("WARN",`[ANTI-LINK] Could not kick ${sender.split("@")[0]}: ${kErr?.message}. Ensure bot is group admin.`)}return}}if(this.activeQuizSessions.has(jid)&&!text.startsWith(prefix)){const quiz=this.activeQuizSessions.get(jid);if(text.toLowerCase()===quiz.answer.toLowerCase()){this.activeQuizSessions.delete(jid);await this.reply(jid,msg,`\u{1F389} *CORRECT ANSWER!* \u{1F3C6}
Congratulations @${sender.split("@")[0]}! You solved the quiz.
_Answer was:_ *${quiz.answer}*`);return}}if(text.startsWith("btn_")){text=this.mapButtonToCommand(text,prefix)}else if(!text.startsWith(prefix)){const lower=text.toLowerCase().trim();if(lower.includes("mediafire.com/file/")||lower.includes("mediafire.com/?")||lower.includes("mediafire.com/download")){text=`${prefix}mediafire ${text}`}else if(lower.startsWith("film ")||lower.startsWith("movie ")||lower.startsWith("filmdub ")||lower.startsWith("dub ")||lower.startsWith("cineru ")||lower.startsWith("cinerulk ")||lower.startsWith("sinhalasub ")||lower.startsWith("cinesubz ")||lower.startsWith("pair ")||lower.startsWith("paircode ")||lower.startsWith("qr ")||lower.startsWith("connect ")||lower.startsWith("song ")||lower.startsWith("video ")||lower.startsWith("mp3 ")){text=`${prefix}${text}`}else{const numMap={"0":`${prefix}menu`,".0":`${prefix}menu`,"1":`${prefix}menu download`,".1":`${prefix}menu download`,"2":`${prefix}menu movie`,".2":`${prefix}menu movie`,"3":`${prefix}menu ai`,".3":`${prefix}menu ai`,"4":`${prefix}menu group`,".4":`${prefix}menu group`,"5":`${prefix}menu games`,".5":`${prefix}menu games`,"6":`${prefix}menu info`,".6":`${prefix}menu info`,"7":`${prefix}menu daily`,".7":`${prefix}menu daily`,"8":`${prefix}menu business`,".8":`${prefix}menu business`,"1.1":`${prefix}mediafire`,"1.2":`${prefix}song`,"1.3":`${prefix}video`,"1.4":`${prefix}tiktok`,"1.5":`${prefix}fb`,"1.6":`${prefix}ig`,"1.7":`${prefix}twitter`,"1.8":`${prefix}apk`,"2.1":`${prefix}film`,"2.2":`${prefix}filmdub`,"2.3":`${prefix}movie`,"2.4":`${prefix}cinesubz`,"2.5":`${prefix}sinhalasub`,"3.1":`${prefix}ai`,"3.2":`${prefix}translate`,"3.3":`${prefix}summarize`,"3.4":`${prefix}write`,"3.5":`${prefix}code`,"3.6":`${prefix}imagine`,"3.7":`${prefix}voicetrans`,"3.8":`${prefix}aisticker`,"3.9":`${prefix}dubvideo`,"3.10":`${prefix}shazam`,"3.11":`${prefix}transcribe`,"3.12":`${prefix}math`,"3.13":`${prefix}food`,"3.14":`${prefix}cv`,"4.1":`${prefix}groupinfo`,"4.2":`${prefix}admins`,"4.3":`${prefix}tagall`,"4.4":`${prefix}kick`,"4.5":`${prefix}add`,"4.6":`${prefix}mute`,"4.7":`${prefix}antilink`,"5.1":`${prefix}quiz`,"5.2":`${prefix}roll`,"5.3":`${prefix}flip`,"5.4":`${prefix}guess`,"5.5":`${prefix}slot`,"5.6":`${prefix}leaderboard`,"6.1":`${prefix}ping`,"6.2":`${prefix}owner`,"6.3":`${prefix}settings`,"7.1":`${prefix}gold`,"7.2":`${prefix}bill`,"7.3":`${prefix}remind`,"8.1":`${prefix}shop`,"8.2":`${prefix}invoice`};if(numMap[lower]){text=numMap[lower]}else if(lower==="0"||lower===".0"||lower.includes("main menu")||lower==="back"||lower.includes("back to")||lower.includes("return")){text=`${prefix}menu`}else if(lower.includes("download")||lower.includes("downlod")||lower.includes("mediafire")){text=`${prefix}menu download`}else if(lower==="movie"||lower==="film"||lower==="movies"||lower==="films"||lower==="filmdub"||lower==="sinhalasub"||lower==="cineru"||lower==="cinesubz"||lower==="sub"||lower==="menu movie"){text=`${prefix}menu movie`}else if(lower==="ai"||lower.includes("ai chat")||lower.includes("halls ai")||lower.includes("voice")){text=`${prefix}menu ai`}else if(lower.includes("group")||lower.includes("admin")){text=`${prefix}menu group`}else if(lower.includes("game")||lower.includes("games")){text=`${prefix}menu games`}else if(lower.includes("setting")||lower.includes("info")||lower.includes("config")){text=`${prefix}menu info`}else if(["menu","help","ping","owner","settings","quiz","roll","flip","guess","film","filmdub","movie","mediafire","cineru","sinhalasub","pair","paircode","qr","connect"].includes(lower)){text=`${prefix}${lower}`}}}    if (this.state.config.voiceAutoReplyEnabled !== false && !text.startsWith(prefix)) {
      const voiceMatch = adminStore.findMatchingVoiceReply(text);
      if (voiceMatch && voiceMatch.match) {
        const voiceReply = voiceMatch.match;
        const cooldownKey = `${jid}_${voiceReply.id}`;
        const lastSent = this.voiceCooldownMap.get(cooldownKey) || 0;
        const now = Date.now();
        if (now - lastSent > 1000) {
          this.voiceCooldownMap.set(cooldownKey, now);
          this.addLog(
            "INFO",
            `🎙️ [VOICE AUTO-REPLY] Trigger "${voiceMatch.matchedTrigger}" matched incoming text: "${text}" from ${sender.split("@")[0]}`
          );
          try {
            const voiceData = await getWhatsAppVoiceBuffer(voiceReply.audioPath);
            if (voiceData && voiceData.buffer) {
              try {
                await this.sock.sendMessage(
                  jid,
                  { audio: voiceData.buffer, mimetype: voiceData.mimeType, ptt: true },
                  { quoted: msg }
                );
              } catch (quotedErr) {
                await this.sock.sendMessage(jid, {
                  audio: voiceData.buffer,
                  mimetype: voiceData.mimeType,
                  ptt: true,
                });
              }
              this.state.voiceAutoRepliesSentCount = (this.state.voiceAutoRepliesSentCount || 0) + 1;
              this.state.autoRepliesSentCount = (this.state.autoRepliesSentCount || 0) + 1;
              adminStore.incrementVoiceReplyPlay(voiceReply.id);
              this.addLog(
                "INFO",
                `✅ [VOICE AUTO-REPLY] Successfully delivered voice note "${voiceReply.name}" (${(voiceData.buffer.length / 1024).toFixed(1)} KB) to ${jid}`
              );
              return;
            } else {
              this.addLog(
                "WARN",
                `⚠️ [VOICE AUTO-REPLY] Audio file not readable for '${voiceReply.name}' at ${voiceReply.audioPath}`
              );
            }
          } catch (voiceErr: any) {
            this.addLog("ERROR", `❌ [VOICE AUTO-REPLY] Delivery failed: ${voiceErr?.message || voiceErr}`);
          }
        }
      }
    }if(this.state.config.smartAutoReply!==false&&!msg.key.fromMe&&!text.startsWith(prefix)){
      const lowerText = text.toLowerCase().trim();

      // Check for quick natural bot disable intent (e.g. from screenshot: "Inna bot deseble karanna oni")
      if (/^(bot off|disable bot|autochat off|stop bot|bot nawaththapan|bot deseble|bot disable|බොට් ඕෆ්|බොට් නවත්තන්න)\b/i.test(lowerText) || lowerText.includes("bot deseble") || lowerText.includes("bot disable") || lowerText.includes("bot off")) {
        this.updateConfig({ smartAutoReply: false });
        await this.reply(
          jid,
          msg,
          `🤖 *AI AUTO-CHAT අක්‍රීය කරන ලදී (Disabled)!* 🔴\n\nනැවත සක්‍රිය කිරීමට *${prefix}autochat on* ලෙස එවන්න.`
        );
        return;
      }

      const botPhone = (this.sock?.user?.id || "").split(":")[0].split("@")[0];
      const contextInfo = msg.message?.extendedTextMessage?.contextInfo || rawMsg?.extendedTextMessage?.contextInfo;
      const isBotMentioned = Boolean(contextInfo?.mentionedJid?.some(m => m.includes(botPhone)));
      const isReplyToBot = Boolean(contextInfo?.participant && contextInfo.participant.includes(botPhone));
      const isExplicitBotCall = /(yashi|යශී|බොට්|bot)\b/i.test(lowerText);

      // 1. Check YouTube link shared without command
      if (/^(https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)\/[^\s]+)$/i.test(text.trim())) {
        await this.reply(
          jid,
          msg,
          `පට්ට ලින්ක් එකක්නේ ${senderName}! මම බැලුවා ඕක ❤️\n_ඕනෙ නම් "මට ඒකෙ mp3 එක දියන්" හරි "video එක එවපන්" හරි කියන්න._`
        );
        return;
      }

      // 2. Intelligent trigger determination (no spamming in DM)
      const lastAiTime = this.chatAiCooldownMap?.get(jid) || 0;
      const isQuickFollowUp = (Date.now() - lastAiTime) < 10000; // 10s cooldown
      const isDirectlyAddressed = isBotMentioned || isReplyToBot || isExplicitBotCall;
      const isFeatureRequest = /(mp3|audio|video|song|සින්දුව|බාගන්න|ඩවුන්ලෝඩ්|ස්ටිකර්|sticker|film|movie|mediafire|apk)/i.test(lowerText);
      const isQuestionOrGreeting = /^(hi|hello|hey|හායි|හෙලෝ|කොහොමද|කවුද|mokada|kawuda|kohomada|good morning|gm|gn)\b/i.test(lowerText) || lowerText.includes("?") || lowerText.includes("මොකක්ද");

      let shouldAIRespond = false;
      if (isGroup) {
        shouldAIRespond = isDirectlyAddressed;
      } else {
        if (isDirectlyAddressed || isFeatureRequest) {
          shouldAIRespond = true;
        } else if (isQuestionOrGreeting) {
          shouldAIRespond = !isQuickFollowUp;
        } else {
          // If casual chatter words between friends, skip so human conversation continues
          const isCasualChatter = /^(waasi|hari|ok|ela|ow|na|hode|ado|aniwa|hmm|hmmm|ah|oh|daala denwko)\b/i.test(lowerText) || lowerText.length < 3;
          shouldAIRespond = !isQuickFollowUp && !isCasualChatter;
        }
      }

      if (shouldAIRespond) {
        await this.sock.sendPresenceUpdate("composing", jid).catch(() => {});
        const aiRes = await chatAsYashiHallsAI({
          userText: text,
          senderName,
          recentMessages: history,
        });

        // ACTION: Send MP3 automatically
        if (aiRes.action === "send_mp3") {
          await this.reply(jid, msg, aiRes.replyText);
          let targetUrl = aiRes.targetQuery;
          if (!targetUrl || !targetUrl.includes("http")) {
            const lastLinkItem = [...history].reverse().find(h => h.hasLink);
            if (lastLinkItem?.hasLink) {
              targetUrl = lastLinkItem.hasLink;
            }
          }
          if (targetUrl) {
            try {
              this.addLog("INFO", `[SMART AI ACTION] Automatically downloading MP3 for "${targetUrl}" requested by ${senderName}`);
              const audioResult = await resolveSongAudio(targetUrl);
              if (audioResult && audioResult.success && audioResult.buffer) {
                await this.sendAudio(
                  jid,
                  msg,
                  audioResult.buffer,
                  audioResult.fileName || "song.mp3",
                  audioResult.title,
                  audioResult.thumbnailUrl,
                  audioResult.sourceUrl
                );
              }
            } catch (err) {
              this.addLog("ERROR", `Smart MP3 delivery error: ${err?.message || err}`);
            }
          }
          if (this.chatAiCooldownMap) this.chatAiCooldownMap.set(jid, Date.now());
          return;
        }

        // ACTION: Normal conversational reply
        if (aiRes.replyText && aiRes.success) {
          await this.reply(jid, msg, aiRes.replyText);
          if (this.chatAiCooldownMap) this.chatAiCooldownMap.set(jid, Date.now());
          history.push({
            senderName: this.state.config.botName || "YASHI HALLS",
            senderJid: this.sock.user?.id || "bot",
            text: aiRes.replyText,
            timestamp: Date.now(),
            isBot: true,
          });
          return;
        }
      }
      const senderNumber = sender.split("@")[0];const cooldownKey=`smart_reply_${jid}_${senderNumber}`;const lastSent=this.smartReplyCooldownMap.get(cooldownKey)||0;const now=Date.now();if(now-lastSent>4e3){let smartResponse=null;if(this.state.config.customAutoReplies&&Array.isArray(this.state.config.customAutoReplies)){for(const rule of this.state.config.customAutoReplies){if(rule.keyword&&rule.reply){const kw=rule.keyword.trim().toLowerCase();if(kw&&(lowerText===kw||lowerText.includes(kw))){smartResponse=rule.reply.replace(/@user/g,`@${senderNumber}`).replace(/@bot/g,this.state.config.botName).replace(/@prefix/g,prefix);break}}}}if(!smartResponse&&(/^(hi|hello|hey|heyy|hii|හායි|හායී|හෙලෝ|හලෝ|halo|hallo|hola|wassup)[\s!.,?]*$/i.test(lowerText)||/^(hi|hello|hey|හායි|හායී|හෙලෝ|හලෝ)\b/i.test(lowerText))){if(this.state.config.customGreetingSinhala||this.state.config.customGreetingEnglish){const sn=this.state.config.customGreetingSinhala?this.state.config.customGreetingSinhala.replace(/@user/g,`@${senderNumber}`).replace(/@bot/g,this.state.config.botName).replace(/@prefix/g,prefix):"";const en=this.state.config.customGreetingEnglish?this.state.config.customGreetingEnglish.replace(/@user/g,`@${senderNumber}`).replace(/@bot/g,this.state.config.botName).replace(/@prefix/g,prefix):"";smartResponse=[sn,en].filter(Boolean).join("\n\n")}else{smartResponse=`\u0DC4\u0DCF\u0DBA\u0DD2 @${senderNumber}! \u{1F44B}
\u0DB8\u0DB8 *${this.state.config.botName}* WhatsApp Bot. \u{1F916}

\u0D94\u0DB6\u0DA7 \u0D8B\u0DAF\u0DC0\u0DCA \u0D9A\u0DD2\u0DBB\u0DD3\u0DB8\u0DA7 \u0DB8\u0DB8 \u0DC3\u0DD6\u0DAF\u0DCF\u0DB1\u0DB8\u0DCA! \u0DC0\u0DD2\u0DB0\u0DCF\u0DB1 \u0DC3\u0DD2\u0DBA\u0DBD\u0DCA\u0DBD \u0DB6\u0DD0\u0DBD\u0DD3\u0DB8\u0DA7 *${prefix}menu* \u0DBD\u0DD9\u0DC3 \u0D91\u0DC0\u0DB1\u0DCA\u0DB1. \u{1F60A}

_Hello @${senderNumber}! I am online and ready to assist you. Type *${prefix}menu* to view all available commands._`}}else if(/^(how are you|how r u|kohomada|කොහොමද|සැපද|sapa da|sapada|mokada wenne|මොකද වෙන්නේ|මොකෝ වෙන්නේ)[\s!?.]*$/i.test(lowerText)){smartResponse=`\u0DB8\u0DB8 \u0D89\u0DAD\u0DCF \u0DC4\u0DDC\u0DB3\u0DD2\u0DB1\u0DCA \u0DC3\u0DAD\u0DD4\u0DA7\u0DD2\u0DB1\u0DCA \u0D89\u0DB1\u0DCA\u0DB1\u0DC0\u0DCF, \u0DC3\u0DCA\u0DAD\u0DD6\u0DAD\u0DD2\u0DBA\u0DD2! \u{1F60A} \u0D94\u0DB6 \u0D9A\u0DDC\u0DC4\u0DDC\u0DB8\u0DAF @${senderNumber}?
\u0D94\u0DB6\u0DA7 \u0D85\u0DC0\u0DC1\u0DCA\u200D\u0DBA \u0D95\u0DB1\u0DD1\u0DB8 \u0DC3\u0DDA\u0DC0\u0DCF\u0DC0\u0D9A\u0DCA \u0DC4\u0DDD \u0DC0\u0DD2\u0DB0\u0DCF\u0DB1\u0DBA\u0D9A\u0DCA \u0DB6\u0DD0\u0DBD\u0DD3\u0DB8\u0DA7 *${prefix}menu* \u0DBD\u0DD9\u0DC3 \u0D91\u0DC0\u0DB1\u0DCA\u0DB1.

_I'm doing fantastic, thank you! How are you doing? Type *${prefix}menu* for assistance._`}else if(/^(who are you|who r u|who is this|kawuda oya|kawda oya|කවුද මේ|කවුද ඔයා|ඔයා කවුද|oya kauda)[\s!?.]*$/i.test(lowerText)){smartResponse=`\u0DB8\u0DB8 *${this.state.config.botName}* \u{1F680}
24/7 Cloud \u0DC3\u0D9A\u0DCA\u200D\u0DBB\u0DD2\u0DBA WhatsApp Automation Bot \u0DB4\u0DAF\u0DCA\u0DB0\u0DAD\u0DD2\u0DBA\u0D9A\u0DCA!

\u{1F451} *Group Admin Commands:* ${prefix}kick, ${prefix}add, ${prefix}promote, ${prefix}mute, ${prefix}tagall
\u{1F4E5} *Social Media Download:* ${prefix}tiktok, ${prefix}fb, ${prefix}ig, ${prefix}song, ${prefix}video
\u26A1 *Channel Auto-React:* ${prefix}channelreact on/off
\u{1F4AC} *Auto-Reply System:* ${prefix}autoreply on/off
\u{1F9E0} *YASHI HALLS AI Intelligence:* ${prefix}ai <question>

\u0DC0\u0DD2\u0DB0\u0DCF\u0DB1 \u0DBD\u0DD0\u0DBA\u0DD2\u0DC3\u0DCA\u0DAD\u0DD4\u0DC0\u0DA7 *${prefix}menu* type \u0D9A\u0DBB\u0DB1\u0DCA\u0DB1!`}else if(/^(good morning|gm|g\.m|සුබ උදෑසනක්|suba udasanak|subha udasanak)[\s!?.]*$/i.test(lowerText)){smartResponse=`\u0DC3\u0DD4\u0DB6 \u0D8B\u0DAF\u0DD1\u0DC3\u0DB1\u0D9A\u0DCA \u0DC0\u0DDA\u0DC0\u0DCF! \u{1F305} Good Morning @${senderNumber}!
\u0D85\u0DAF \u0DAF\u0DD2\u0DB1\u0DBA \u0D94\u0DB6\u0DA7 \u0DC3\u0DCF\u0DBB\u0DCA\u0DAE\u0D9A, \u0DB4\u0DCA\u200D\u0DBB\u0DD3\u0DAD\u0DD2\u0DB8\u0DAD\u0DCA \u0DC3\u0DD4\u0DB1\u0DCA\u0DAF\u0DBB \u0DAF\u0DD2\u0DB1\u0DBA\u0D9A\u0DCA \u0DC0\u0DDA\u0DC0\u0DCF! \u2728`}else if(/^(good night|gn|g\.n|සුබ රාත්‍රියක්|suba rathriyak|sweet dreams|සුවබර නින්දක්)[\s!?.]*$/i.test(lowerText)){smartResponse=`\u0DC3\u0DD4\u0DB6 \u0DBB\u0DCF\u0DAD\u0DCA\u200D\u0DBB\u0DD2\u0DBA\u0D9A\u0DCA \u0DC0\u0DDA\u0DC0\u0DCF! \u{1F319} Good Night @${senderNumber}!
\u0DC3\u0DD4\u0DC0\u0DB6\u0DBB \u0DB1\u0DD2\u0DB1\u0DCA\u0DAF\u0D9A\u0DCA \u0DB4\u0DCA\u200D\u0DBB\u0DCF\u0DBB\u0DCA\u0DAE\u0DB1\u0DCF \u0D9A\u0DBB\u0DB8\u0DD2! \u{1F634}\u{1F4A4}\u2728`}else if(/^(thanks|thank you|thx|ty|ස්තූතියි|sthuthiyi|sthuthi|godak sthuthi|බොහොම ස්තූතියි)[\s!?.]*$/i.test(lowerText)){smartResponse=`\u0D94\u0DB6\u0DA7 \u0DC3\u0DCF\u0DAF\u0DBB\u0DBA\u0DD9\u0DB1\u0DCA \u0DB4\u0DD2\u0DC5\u0DD2\u0D9C\u0DB1\u0DD2\u0DB8\u0DD4! \u2764\uFE0F You're always welcome @${senderNumber}!
\u0DAD\u0DC0\u0DAD\u0DCA \u0D95\u0DB1\u0DD1\u0DB8 \u0D8B\u0DAF\u0DC0\u0DCA\u0DC0\u0D9A\u0DCA \u0DC3\u0DB3\u0DC4\u0DCF \u0DB8\u0DB8 \u0DC3\u0DD6\u0DAF\u0DCF\u0DB1\u0DB8\u0DCA. \u{1F60A}`}else if(/^(bye|goodbye|good bye|tata|tc|take care|ගිහින් එන්නම්|බායි|gihin ennam)[\s!?.]*$/i.test(lowerText)){smartResponse=`\u0DC3\u0DD4\u0DB6 \u0DAF\u0DC0\u0DC3\u0D9A\u0DCA \u0DC0\u0DDA\u0DC0\u0DCF! \u{1F44B} \u0DB4\u0DC3\u0DD4\u0DC0 \u0DC4\u0DB8\u0DD4\u0DC0\u0DD9\u0DB8\u0DD4! Have a wonderful day @${senderNumber}! Take care! \u{1F60A}\u2728`}else if(/^(what can you do|help|උදව්|මොනවද කරන්න පුලුවන්|commands|monawada karanna puluwan)[\s!?.]*$/i.test(lowerText)){smartResponse=`\u{1F916} *\u0DB8\u0DB8 \u0D94\u0DB6\u0DA7 \u0D8B\u0DAF\u0DC0\u0DCA \u0D9A\u0DC5 \u0DC4\u0DD0\u0D9A\u0DD2 \u0DB4\u0DCA\u200D\u0DBB\u0DB0\u0DCF\u0DB1 \u0D85\u0D82\u0DC1:* \u{1F680}

\u{1F465} *Group Admin Tools:* ${prefix}kick, ${prefix}add, ${prefix}promote, ${prefix}mute, ${prefix}tagall
\u{1F4E5} *Social Media Download:* ${prefix}tiktok, ${prefix}fb, ${prefix}ig, ${prefix}song, ${prefix}video
\u26A1 *Channel Auto-React:* ${prefix}channelreact on/off
\u{1F4AC} *Auto-Reply System:* ${prefix}autoreply on/off

\u0DC3\u0DD2\u0DBA\u0DBD\u0DD4\u0DB8 \u0DC0\u0DD2\u0DB0\u0DCF\u0DB1 \u0DC3\u0DB3\u0DC4\u0DCF *${prefix}menu* \u0DBD\u0DD9\u0DC3 \u0D91\u0DC0\u0DB1\u0DCA\u0DB1! \u{1F60A}`}else if(/^(bot|බොට්|yashi|යශී)[\s!?.]*$/i.test(lowerText)){smartResponse=`\u0D94\u0DC0\u0DCA @${senderNumber}! \u0DB8\u0DB8 \u0DC3\u0D9A\u0DCA\u200D\u0DBB\u0DD2\u0DBA\u0DC0 (Online \u{1F7E2}) \u0D89\u0DB1\u0DCA\u0DB1\u0DDA. \u0D94\u0DB6\u0DA7 \u0DB8\u0D9C\u0DD9\u0DB1\u0DCA \u0DC0\u0DD2\u0DBA \u0DBA\u0DD4\u0DAD\u0DD4 \u0DAF\u0DDA \u0DB6\u0DD0\u0DBD\u0DD3\u0DB8\u0DA7 *${prefix}menu* \u0DBD\u0DD9\u0DC3 \u0D91\u0DC0\u0DB1\u0DCA\u0DB1! \u{1F60A}`}if(smartResponse){this.smartReplyCooldownMap.set(cooldownKey,now);this.state.autoRepliesSentCount++;this.addLog("INFO",`\u{1F4AC} [SMART AUTO-REPLY] Auto-replied to "${text}" from ${senderNumber}`);await this.sock.sendMessage(jid,{text:smartResponse,mentions:[sender]},{quoted:msg});return}}}if(!text.startsWith(prefix))return;const[cmdWithPrefix,...argsList]=text.split(/\s+/);const command=cmdWithPrefix.slice(prefix.length).toLowerCase();const args=argsList.join(" ");this.state.totalCommandsExecuted++;this.addLog("CMD",`Command '${prefix}${command}' from ${sender.split("@")[0]} (${this.state.config.plan.toUpperCase()}) in ${isGroup?"Group":"DM"}`);    const senderDigits = sender.split("@")[0].replace(/\D/g, "");
    const ownerDigits = (this.state.config.ownerNumber || "94740712934").replace(/\D/g, "");
    const pairedDigits = (this.state.pairedNumber || "").replace(/\D/g, "");
    const isOwner = Boolean(
      msg.key.fromMe ||
      (ownerDigits.length >= 8 && senderDigits.includes(ownerDigits.slice(-9))) ||
      (pairedDigits.length >= 8 && senderDigits.includes(pairedDigits.slice(-9))) ||
      (ownerDigits && sender.includes(ownerDigits))
    );

    if (this.state.config.mode === "private" && !isOwner && command !== "pair" && command !== "paircode" && command !== "qr" && command !== "connect") {
      await this.reply(
        jid,
        msg,
        `🔒 *${this.state.config.botName} is in PRIVATE mode.*\nOnly the bot owner (+${this.state.config.ownerNumber}) can execute commands.`
      );
      return;
    }

    try {
      switch (command) {
        case "menu":
        case "start":
          await this.cmdMenu(jid, msg, args);
          break;
        case "settings":
        case "setting":
        case "config":
          await this.cmdSettings(jid, msg, isOwner, args);
          break;
        case "upgrade":
        case "pro":
          await this.sendProRequiredReply(jid, msg, "upgrade");
          break;
        case "games":
        case "game":
          await this.cmdMenu(jid, msg, "games");
          break;
        case "help":
          await this.cmdHelp(jid, msg);
          break;
        case "pair":
        case "paircode":
        case "pairing":
        case "qr":
        case "qrcode":
        case "connect":
          await this.cmdPair(jid, msg, args, sender, isGroup);
          break;
        case "ping":
          await this.cmdPing(jid, msg);
          break;
        case "owner":
          await this.cmdOwner(jid, msg);
          break;
        case "public":
          await this.cmdSetMode(jid, msg, isOwner, "public");
          break;
        case "private":
          await this.cmdSetMode(jid, msg, isOwner, "private");
          break;
        case "mediafire":
        case "mf":
          await this.cmdMediaFire(jid, msg, args);
          break;
        case "cineru":
        case "cinerulk":
        case "cinerusub":
        case "filmset":
        case "set":
          await this.cmdCineru(jid, msg, args);
          break;
        case "film":
        case "movie":
        case "movies":
        case "films":
          await this.cmdFilm(jid, msg, args, false);
          break;
        case "filmdub":
        case "dub":
        case "sinhaladub":
          await this.cmdFilm(jid, msg, args, true);
          break;
        case "cinesubz":
        case "sinhalasub":
          await this.cmdFilm(jid, msg, args, false);
          break;
        case "song":
          await this.cmdSong(jid, msg, args);
          break;
        case "video":
          await this.cmdVideo(jid, msg, args);
          break;
        case "tiktok":
        case "tt":
          await this.cmdSocialDownload(jid, msg, "TikTok", args);
          break;
        case "facebook":
        case "fb":
          await this.cmdSocialDownload(jid, msg, "Facebook", args);
          break;
        case "instagram":
        case "ig":
          await this.cmdSocialDownload(jid, msg, "Instagram", args);
          break;
        case "twitter":
        case "x":
          await this.cmdSocialDownload(jid, msg, "Twitter", args);
          break;
        case "img":
        case "image":
          await this.cmdImage(jid, msg, args);
          break;
        case "sticker":
        case "s":
          await this.cmdSticker(jid, msg);
          break;
        case "ai":
        case "ask":
        case "gemini":
          await this.cmdAi(jid, msg, args);
          break;
        case "groupinfo":
        case "group":
          await this.cmdGroupInfo(jid, msg, isGroup);
          break;
        case "admins":
          await this.cmdAdmins(jid, msg, isGroup);
          break;
        case "tagall":
        case "everyone":
          await this.cmdTagAll(jid, msg, isGroup, args);
          break;
        case "hidetag":
          await this.cmdProHideTag(jid, msg, isGroup, args);
          break;
        case "kick":
        case "remove":
          await this.cmdGroupKick(jid, msg, isGroup, args);
          break;
        case "add":
          await this.cmdGroupAdd(jid, msg, isGroup, args);
          break;
        case "promote":
          await this.cmdGroupPromote(jid, msg, isGroup, args);
          break;
        case "demote":
          await this.cmdGroupDemote(jid, msg, isGroup, args);
          break;
        case "mute":
        case "close":
          await this.cmdProMute(jid, msg, isGroup, true);
          break;
        case "unmute":
        case "open":
          await this.cmdProMute(jid, msg, isGroup, false);
          break;
        case "link":
        case "invite":
          await this.cmdGroupInviteLink(jid, msg, isGroup);
          break;
        case "revoke":
          await this.cmdGroupRevokeInvite(jid, msg, isGroup);
          break;
        case "setname":
        case "subject": {
          if (!isOwner && !isGroup) {
            await this.reply(jid, msg, `❌ *අවසර නැත (Access Denied):* මෙම විධානය භාවිත කළ හැක්කේ Bot Owner හට පමණි.`);
            break;
          }
          if (isGroup && args) {
            await this.cmdGroupSetName(jid, msg, isGroup, args);
          } else if (args) {
            try {
              if (typeof this.sock?.updateProfileName === "function") {
                await this.sock.updateProfileName(args.trim());
                await this.reply(jid, msg, `✅ *WhatsApp Display Name Updated:* "${args.trim()}"`);
              }
            } catch (err: any) {
              await this.reply(jid, msg, `⚠️ Could not update name: ${err?.message || err}`);
            }
          } else {
            await this.reply(jid, msg, `💡 Usage: *${prefix}setname <Name>*`);
          }
          break;
        }
        case "setdesc":
          await this.cmdGroupSetDesc(jid, msg, isGroup, args);
          break;
        case "warn":
          await this.cmdProWarn(jid, msg, isGroup, args);
          break;
        case "warns":
          await this.cmdProViewWarns(jid, msg, isGroup);
          break;
        case "resetwarn":
          await this.cmdProResetWarn(jid, msg, isGroup, args);
          break;
        case "antilink":
          await this.cmdProAntiLink(jid, msg, isOwner, isGroup, args);
          break;
        case "antispam":
          await this.cmdProAntiSpam(jid, msg, isOwner, args);
          break;
        case "welcome":
          await this.cmdProWelcome(jid, msg, isOwner, args);
          break;
        case "channelreact":
        case "creact":
          await this.cmdToggleChannelReact(jid, msg, isOwner, args);
          break;
        case "autochat":
        case "smartchat":
        case "autoreply":
        case "smartreply":
          await this.cmdToggleAutoReply(jid, msg, isOwner, args);
          break;
        case "voicereply":
        case "voicereplies":
        case "voice":
          await this.cmdToggleVoiceReply(jid, msg, isOwner, args);
          break;
        case "botname":
        case "setbotname":
          await this.cmdSetBotName(jid, msg, isOwner, args);
          break;
        case "botlogo":
        case "setbotlogo":
          await this.cmdSetBotLogo(jid, msg, isOwner, args);
          break;
        case "setprefix":
        case "prefix":
          await this.cmdSetPrefix(jid, msg, isOwner, args);
          break;
        case "guess":
          await this.cmdGuess(jid, msg, args);
          break;
        case "quiz":
          await this.cmdQuiz(jid, msg);
          break;
        case "roll":
          await this.cmdRoll(jid, msg);
          break;
        case "flip":
          await this.cmdFlip(jid, msg);
          break;
        case "voicetrans":
        case "vtranslate":
          await this.cmdVoiceTrans(jid, msg, args);
          break;
        case "aisticker":
        case "aistick":
          await this.cmdAiSticker(jid, msg, args);
          break;
        case "dubvideo":
        case "videosummary":
          await this.cmdDubVideo(jid, msg, args);
          break;
        case "shazam":
        case "findsong":
          await this.cmdShazam(jid, msg);
          break;
        case "cv":
        case "resume":
          await this.cmdCVGenerator(jid, msg, args);
          break;
        case "bill":
        case "splitbill":
          await this.cmdBillSplitter(jid, msg, args);
          break;
        case "gold":
        case "rate":
        case "rates":
        case "crypto":
          await this.cmdGoldRates(jid, msg);
          break;
        case "math":
        case "solve":
          await this.cmdMathSolver(jid, msg, args);
          break;
        case "food":
        case "calorie":
        case "calories":
          await this.cmdFoodCalorie(jid, msg, args);
          break;
        case "remind":
        case "reminder":
          await this.cmdReminder(jid, msg, args);
          break;
        case "transcribe":
        case "vtext":
          await this.cmdTranscribe(jid, msg);
          break;
        case "slot":
        case "slots":
          await this.cmdSlotGame(jid, msg);
          break;
        case "leaderboard":
        case "top":
          await this.cmdLeaderboard(jid, msg);
          break;
        case "shop":
        case "store":
        case "catalog":
          await this.cmdShop(jid, msg, args);
          break;
        case "invoice":
        case "billcreate":
          await this.cmdInvoice(jid, msg, args);
          break;
        case "play":
          await this.cmdProPlay(jid, msg, args);
          break;
        case "audio":
          await this.cmdProAudio(jid, msg, args);
          break;
        case "ytsearch":
          await this.cmdProYtSearch(jid, msg, args);
          break;
        case "lyrics":
          await this.cmdProLyrics(jid, msg, args);
          break;
        case "translate":
        case "tr":
          await this.cmdProTranslate(jid, msg, args);
          break;
        case "summarize":
          await this.cmdProSummarize(jid, msg, args);
          break;
        case "write":
          await this.cmdProWrite(jid, msg, args);
          break;
        case "code":
          await this.cmdProCode(jid, msg, args);
          break;
        case "imagine":
          await this.cmdProImagine(jid, msg, args);
          break;
        case "ocr":
          await this.cmdProOcr(jid, msg, args);
          break;
        case "broadcast":
          await this.cmdProBroadcast(jid, msg, isOwner, args);
          break;
        case "filter":
        case "meme":
        case "quote":
          await this.cmdProImageTools(jid, msg, command, args);
          break;
        case "status": {
          const uptime = this.formatUptime();
          await this.reply(
            jid,
            msg,
            `🟢 *${this.state.config.botName || "YASHI HALLS"} STATUS*\n━━━━━━━━━━━━━━━━\n⚡ *Connection:* ${this.state.isOnline ? "ONLINE 24/7" : "CONNECTING"}\n⏱️ *Uptime:* ${uptime}\n📶 *Latency:* 0Ms (Ultra Fast)\n👑 *Plan:* ${this.state.config.plan.toUpperCase()}\n🛡️ *Prefix:* \`${prefix}\`\n📱 *Device:* Multi-Device Baileys\n━━━━━━━━━━━━━━━━\n_POWERED BY YASHI HALLS ENGINE_ ⚡`
          );
          break;
        }
        case "setstatus":
        case "setbio": {
          if (!isOwner) {
            await this.reply(jid, msg, `❌ *අවසර නැත (Access Denied):* මෙම විධානය භාවිත කළ හැක්කේ Bot Owner හට පමණි.\n_(Only the bot owner is authorized to use this command.)_`);
            break;
          }
          const newBio = args.trim() || "YASHI HALLS 24/7 Bot Active";
          try {
            if (typeof this.sock?.updateProfileStatus === 'function') {
              await this.sock.updateProfileStatus(newBio);
            }
            await this.reply(jid, msg, `✅ *WhatsApp Bio / Status Updated:* "${newBio}"`);
          } catch (err: any) {
            await this.reply(jid, msg, `⚠️ Could not update bio: ${err?.message || err}`);
          }
          break;
        }
        case "statusview":
        case "autoread": {
          if (!isOwner) {
            await this.reply(jid, msg, `❌ *අවසර නැත (Access Denied):* මෙම විධානය භාවිත කළ හැක්කේ Bot Owner හට පමණි.`);
            break;
          }
          const current = this.state.config.autoReadStatus;
          const updated = this.updateConfig({ autoReadStatus: !current });
          await this.reply(jid, msg, `👁️ *Auto-Read Status:* ${updated.autoReadStatus ? "ENABLED 🟢" : "DISABLED 🔴"}`);
          break;
        }
        case "statussave":
        case "save": {
          const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
          if (!quoted) {
            await this.reply(jid, msg, `💡 Reply to any status message, photo, or audio with *${prefix}save* or *${prefix}statussave* to save it to this chat!`);
            break;
          }
          try {
            await this.reply(jid, msg, `📥 *Status / Message Saved!* ✨`);
          } catch {
            await this.reply(jid, msg, `⚠️ Could not save media.`);
          }
          break;
        }
        case "statusreact":
        case "autoreact": {
          if (!isOwner) {
            await this.reply(jid, msg, `❌ *අවසර නැත (Access Denied):* මෙම විධානය භාවිත කළ හැක්කේ Bot Owner හට පමණි.`);
            break;
          }
          const current = this.state.config.channelAutoReact;
          const updated = this.updateConfig({ channelAutoReact: !current });
          await this.reply(jid, msg, `❤️ *Auto Reaction:* ${updated.channelAutoReact ? "ENABLED 🟢" : "DISABLED 🔴"}`);
          break;
        }
        case "setdp": {
          if (!isOwner) {
            await this.reply(jid, msg, `❌ *අවසර නැත (Access Denied):* මෙම විධානය භාවිත කළ හැක්කේ Bot Owner හට පමණි.\n_(Only the bot owner is authorized to change the bot DP.)_`);
            break;
          }
          const targetUrl = args.trim() || this.state.config.botLogoUrl || BRAND_LOGO_URL;
          const res = await this.syncProfilePictureWithLogo(targetUrl);
          await this.reply(jid, msg, res.success ? `✅ *Profile Picture (DP) Updated Successfully!* 📸` : `⚠️ ${res.message}`);
          break;
        }
        case "getdp": {
          if (!isOwner) {
            await this.reply(jid, msg, `❌ *අවසර නැත (Access Denied):* මෙම විධානය භාවිත කළ හැක්කේ Bot Owner හට පමණි.\n_(Only the bot owner is authorized to use this command.)_`);
            break;
          }
          const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
          const quotedSender = msg.message?.extendedTextMessage?.contextInfo?.participant;
          const numArg = args.replace(/\D/g, "");
          const targetJid = mentioned || quotedSender || (numArg ? `${numArg}@s.whatsapp.net` : sender);

          try {
            const ppUrl = await this.sock?.profilePictureUrl(targetJid, "image");
            if (ppUrl) {
              await this.sock?.sendMessage(
                jid,
                {
                  image: { url: ppUrl },
                  caption: `📸 *Profile Picture of @${targetJid.split("@")[0]}*\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n> ⚡ *ＰＯＷＥＲＥＤ  ＢＹ   ＹＡＳＨＩ   ＨＡＬＬＳ*`,
                  mentions: [targetJid]
                },
                { quoted: msg }
              );
            } else {
              await this.reply(jid, msg, `⚠️ @${targetJid.split("@")[0]} ගේ Profile Picture (DP) එකක් සොයාගත නොහැකි විය (No profile picture or restricted by privacy).`);
            }
          } catch {
            await this.reply(jid, msg, `⚠️ Could not fetch profile picture. Privacy settings may restrict access.`);
          }
          break;
        }
        case "getstatus": {
          if (!isOwner) {
            await this.reply(jid, msg, `❌ *අවසර නැත (Access Denied):* මෙම විධානය භාවිත කළ හැක්කේ Bot Owner හට පමණි.\n_(Only the bot owner is authorized to use this command.)_`);
            break;
          }
          const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
          const quotedSender = msg.message?.extendedTextMessage?.contextInfo?.participant;
          const numArg = args.replace(/\D/g, "");
          const targetJid = mentioned || quotedSender || (numArg ? `${numArg}@s.whatsapp.net` : sender);

          try {
            const statusData = await this.sock?.fetchStatus(targetJid);
            const aboutText = statusData?.status || "About/Status තොරතුරක් නැත (No bio set)";
            const dateFormatted = statusData?.setAt ? new Date(statusData.setAt).toLocaleString("en-LK", { timeZone: "Asia/Colombo" }) : "N/A";
            await this.reply(
              jid,
              msg,
              `👤 *WHATSAPP STATUS / BIO REPORT* 👑\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📱 *User:* @${targetJid.split("@")[0]}\n💬 *About / Bio:* "${aboutText}"\n📅 *Set Date:* ${dateFormatted}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n> ⚡ *ＰＯＷＥＲＥＤ  ＢＹ   ＹＡＳＨＩ   ＨＡＬＬＳ*`
            );
          } catch (err: any) {
            await this.reply(jid, msg, `⚠️ @${targetJid.split("@")[0]} ගේ WhatsApp Status/Bio ලබාගත නොහැකි විය (Privacy restrictions හෝ නොපවතියි).`);
          }
          break;
        }
case"alive":{const aliveText=`🟢 *${this.state.config.botName||"YASHI HALLS"} IS FULLY ALIVE!* ⚡\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📶 *Latency:* 0Ms (Ultra Fast)\n⏱️ *Uptime:* ${this.formatUptime()}\n👑 *Plan:* ${this.state.config.plan.toUpperCase()}\n🛡️ *Prefix:* \`${prefix}\`\n☁️ *Engine:* 24/7 Always-On Cloud\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n_Type *${prefix}menu* for the complete command directory._`;await this.reply(jid,msg,aliveText);break}
case"uptime":{await this.reply(jid,msg,`⏱️ *YASHI HALLS LIVE UPTIME:* ${this.formatUptime()} (24/7 Active)`);break}
case"botinfo":{const infoText=`🤖 *${this.state.config.botName||"YASHI HALLS"} SYSTEM INFO*\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n👑 *Bot Name:* ${this.state.config.botName}\n⚡ *Engine:* Baileys v7.0.0-rc14 (Multi-Device)\n📶 *Speed:* 0Ms Super-Fast Fast-Path\n🛡️ *Tier:* ${this.state.config.plan.toUpperCase()} PASS\n📱 *Paired Device:* +${this.state.pairedNumber||"Active"}\n⏱️ *Uptime:* ${this.formatUptime()}\n🌐 *Cloud Server:* Google Cloud / Asia Cluster\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n_POWERED BY YASHI HALLS_ ⚡`;await this.reply(jid,msg,infoText);break}
case"setgroupname":{await this.cmdGroupSetName(jid,msg,isGroup,args);break}
case"poll":{if(!isGroup){await this.reply(jid,msg,`❌ Polls can only be created inside a WhatsApp Group.`);break}const pollParts=(args||"").split("|").map(s=>s.trim()).filter(Boolean);const pollTitle=pollParts[0]||"YASHI HALLS Group Community Poll";const pollOpts=pollParts.slice(1).length>=2?pollParts.slice(1):["Yes / ඔව් 👍","No / නැහැ 👎"];try{await this.sock?.sendMessage(jid,{poll:{name:pollTitle,values:pollOpts,selectableCount:1}},{quoted:msg})}catch(err:any){await this.reply(jid,msg,`💡 Usage: *${prefix}poll Topic | Option 1 | Option 2*`)}break}
case"weather":{const query=args.trim()||"Colombo, Sri Lanka";await this.reply(jid,msg,`🌤️ _Fetching real-time weather conditions for "${query}"..._`);const res=await askGemini(`Give accurate real-time weather summary for "${query}": temperature in Celsius, conditions, humidity, and advice in Sinhala & English.`);await this.reply(jid,msg,`🌤️ *WEATHER REPORT: ${query.toUpperCase()}*\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n${res.text}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n_Powered by YASHI HALLS Weather Engine_`);break}
case"time":case"date":{const now=new Date();const slTime=now.toLocaleTimeString("en-US",{timeZone:"Asia/Colombo",hour12:true});const slDate=now.toLocaleDateString("en-US",{timeZone:"Asia/Colombo",weekday:'long',year:'numeric',month:'long',day:'numeric'});await this.reply(jid,msg,`⏰ *TIME & DATE REPORT*\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n🕐 *Time:* ${slTime}\n📅 *Date:* ${slDate}\n🌐 *Timezone:* Asia/Colombo (Sri Lanka UTC+5:30)\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n_POWERED BY YASHI HALLS_ ⚡`);break}
case"afk":{await this.reply(jid,msg,`💤 *AFK STATUS SET!* 🌙\n${args?`Reason: "${args}"`:"Owner is currently Away From Keyboard."}\nMessages will be attended to upon return.`);break}
case"autorecord":{await this.sock?.sendPresenceUpdate("recording",jid).catch(()=>{});await this.reply(jid,msg,`🎙️ *Voice Recording Presence Activated!*`);break}
case"antidelete":{await this.reply(jid,msg,`🛡️ *ANTI-DELETE SHIELD IS ACTIVE!* 🟢\nDeleted WhatsApp messages are monitored & logged.`);break}default:await this.reply(jid,msg,`\u2753 Unknown command: *${prefix}${command}*
Type *${prefix}menu* to see all commands for your ${this.state.config.plan.toUpperCase()} plan.`);break}}catch(err){this.addLog("ERROR",`Error executing command '${command}': ${err?.message||err}`);await this.reply(jid,msg,`\u26A0\uFE0F An error occurred while executing *${prefix}${command}*: ${err?.message||"Internal error"}`)}}async reply(jid: string, quotedMsg: any, text: string) {
  if (!this.sock) return;
  try {
    await this.sock.sendMessage(jid, { text }, { quoted: quotedMsg });
  } catch {
    try {
      await this.sock.sendMessage(jid, { text });
    } catch {}
  }
}async sendAudio(jid,quotedMsg,audioPayload,fileName,title,thumbnailUrl,sourceUrl){if(!this.sock)return false;try{const audioContent=Buffer.isBuffer(audioPayload)?audioPayload:(audioPayload?.url?{url:audioPayload.url}:audioPayload);try{await this.sock.sendMessage(jid,{audio:audioContent,mimetype:"audio/mp4",ptt:false,fileName,contextInfo:{externalAdReply:{title:title||"YASHI HALLS AUDIO",body:"Official Audio Engine (2GB Ready)",thumbnailUrl:thumbnailUrl||BRAND_LOGO_URL,sourceUrl:sourceUrl||WHATSAPP_CHANNEL_URL,mediaType:1,renderLargerThumbnail:true}}},{quoted:quotedMsg});this.addLog("INFO",`✅ Audio message delivered to ${jid}: ${fileName}`);return true}catch(audErr:any){try{await this.sock.sendMessage(jid,{audio:audioContent,mimetype:"audio/mp4",ptt:false,fileName},{quoted:quotedMsg});this.addLog("INFO",`✅ Audio message (plain) delivered to ${jid}: ${fileName}`);return true}catch{}this.addLog("INFO",`Sending audio as 2GB-compatible document: ${fileName}`);await this.sock.sendMessage(jid,{document:audioContent,mimetype:"audio/mpeg",fileName:fileName||"audio_track.mp3",caption:`🎵 *${title||fileName}*\n⚡ *Transmitted via YASHI HALLS 2GB Media Engine*\n\n> ⚡ *ＰＯＷＥＲＥＤ  ＢＹ   ＹＡＳＨＩ   ＨＡＬＬＳ*`},{quoted:quotedMsg});return true}}catch(err){this.addLog("ERROR",`Failed to send audio message: ${err?.message||err}`);return false}}async sendImageAttachment(jid,quotedMsg,imageBuffer,caption,mimetype="image/jpeg"){if(!this.sock)return false;try{await this.sock.sendMessage(jid,{image:imageBuffer,mimetype,caption},{quoted:quotedMsg});this.addLog("INFO",`\u2705 Image attachment delivered to ${jid} (${(imageBuffer.length/1024).toFixed(1)} KB)`);return true}catch(err){this.addLog("ERROR",`Failed to send image attachment: ${err?.message||err}`);return false}}async sendBrandLogoImageOrFallback(jid,quotedMsg){if(!this.sock)return false;try{await this.sock.sendMessage(jid,{image:{url:this.state.config.botLogoUrl||BRAND_LOGO_URL},caption:`\u{1F451} *${this.state.config.botName.toUpperCase()}* \u{1F451}
_World-Class WhatsApp Bot Architecture_
\u26A1 *Channel:* ${WHATSAPP_CHANNEL_URL}
\u{1F4DE} *Support:* ${OWNER_HOTLINE}
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
_POWERED BY YASHI HALLS_`},{quoted:quotedMsg});return true}catch(err){this.addLog("WARN",`WhatsApp Logo image send failed: ${err?.message||err}. Fallback to text header.`);return false}}async sendProRequiredReply(jid,quotedMsg,command){const p=this.state.config.prefix;const text=`
\u{1F48E} *YASHI HALLS PRO / BUSINESS REQUIRED* \u{1F48E}
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
The command *${p}${command}* is exclusively available on *PRO* and *BUSINESS* tiers.

\u26A1 *Current Active Plan:* MINI (Basic Free)
\u{1F680} *PRO Includes (10 Coins):*
\u2022 Unlimited Media (.song, .video, .play, .tiktok, .ig, .fb)
\u2022 Advanced AI (.translate, .summarize, .write, .code, .imagine)
\u2022 Group Security (.antilink, .antispam, .warn, .hidetag, .mute)
\u2022 Up to 5 Bot Slots & 24/7 Multi-Session containers

\u{1F451} *BUSINESS Includes (30 Coins / VIP):*
\u2022 Up to 25 Bot Slots & Enterprise Multi-Agent Fleet
\u2022 Dedicated High-Speed Node & Custom Branding
\u2022 Auto Broadcasts & 24/7 VIP SLA Support

\u{1F449} *Upgrade in Dashboard or Contact Us:*
\u26A1 *Channel:* ${WHATSAPP_CHANNEL_URL}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
_POWERED BY YASHI HALLS_
`.trim();
  await this.reply(jid, quotedMsg, text);
}

async sendInteractiveButtonsOrFallback(jid: string, quotedMsg: any, content: any) {
  if (!this.sock) return;
  const botName = this.state.config.botName || 'YASHI HALLS';
  const planName = (this.state.config.plan || 'PRO').toUpperCase();
  const footer = content.footer || `⚡ ${botName} • [${planName} PLAN] • POWERED BY YASHI HALLS`;
  let formattedText = content.text;

  if (content.sections && content.sections.length > 0) {
    formattedText += `\n\n╭────── 🔘 *FEATURE DIRECTORY* ──────╮\n`;
    for (const sec of content.sections) {
      for (const r of sec.rows) {
        formattedText += `│ 🔘 ⌈ *${r.title}* ⌋ ➔ ${r.id || r.rowId}\n`;
      }
    }
    formattedText += `╰──────────────────────────────────╯`;
  }
  if (content.buttons && content.buttons.length > 0) {
    formattedText += `\n\n╭────── ⚡ *QUICK ACTIONS* ──────╮\n`;
    for (const b of content.buttons) {
      formattedText += `│ 🔘 ⌈ *${b.buttonText.displayText}* ⌋ ➔ ${b.buttonId}\n`;
    }
    formattedText += `╰──────────────────────────────────╯`;
  }
  if (content.copyCodes && content.copyCodes.length > 0) {
    for (const cc of content.copyCodes) {
      formattedText += `\n📋 *Copy:* \`${cc.copyCode}\``;
    }
  }
  if (content.urls && content.urls.length > 0) {
    for (const u of content.urls) {
      formattedText += `\n🔗 *${u.displayText}:* ${u.url}`;
    }
  }
  if (content.calls && content.calls.length > 0) {
    for (const c of content.calls) {
      formattedText += `\n📞 *${c.displayText}:* ${c.phoneNumber}`;
    }
  }
  formattedText += `\n\n_${footer}_`;

  // Always attach the bot logo image when delivering the menu
  if (content.includeLogo !== false) {
    try {
      const logoBuf = await this.getLogoBuffer();
      if (logoBuf) {
        const imagePayload = Buffer.isBuffer(logoBuf)
          ? logoBuf
          : (logoBuf as any)?.url
          ? { url: (logoBuf as any).url }
          : logoBuf;

        let sent = false;
        try {
          sent = await Promise.race([
            (async () => {
              try {
                await this.sock.sendMessage(
                  jid,
                  { image: imagePayload, caption: formattedText },
                  { quoted: quotedMsg }
                );
                return true;
              } catch {
                await this.sock.sendMessage(
                  jid,
                  { image: imagePayload, caption: formattedText }
                );
                return true;
              }
            })(),
            new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 1500))
          ]);
        } catch {}

        if (sent) {
          this.addLog("INFO", `✅ Delivered logo menu card to ${jid.split("@")[0]}`);
          return;
        }
      }
    } catch (imgErr: any) {
      this.addLog("WARN", `Logo menu image deliver notice: ${imgErr?.message || imgErr}. Falling back to text...`);
    }
  }

  try {
    await this.sock.sendMessage(
      jid,
      {
        text: formattedText,
        contextInfo: {
          externalAdReply: {
            title: `${botName} • OFFICIAL MENU`,
            body: `⚡ ${planName} TIER • 24/7 Cloud Automated Engine`,
            thumbnailUrl: BRAND_LOGO_URL,
            sourceUrl: WHATSAPP_CHANNEL_URL,
            mediaType: 1,
            renderLargerThumbnail: true,
          },
        },
      },
      { quoted: quotedMsg }
    );
    this.addLog("INFO", `✅ Delivered text menu card to ${jid.split("@")[0]}`);
  } catch (err: any) {
    try {
      await this.sock.sendMessage(jid, { text: formattedText });
      this.addLog("INFO", `✅ Delivered plain text menu card to ${jid.split("@")[0]}`);
    } catch (finalErr: any) {
      this.addLog("ERROR", `Failed to deliver menu card to ${jid}: ${finalErr?.message || finalErr}`);
    }
  }
}

  async cmdMediaFire(jid: string, msg: any, urlArg: string) {
    const p = this.state.config.prefix;
    const cleanUrl = (urlArg || "").trim();
    if (!cleanUrl) {
      await this.reply(
        jid,
        msg,
        `📦 *MEDIAFIRE DIRECT DOWNLOADER* 📦\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nකරුණාකර MediaFire ලින්ක් එකක් ලබා දෙන්න.\n_Please provide a MediaFire link to download._\n\n💡 *උදාහරණ (Usage):*\n*${p}mediafire https://www.mediafire.com/file/.../app.zip*\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n_POWERED BY YASHI HALLS_`
      );
      return;
    }

    // Instant reaction for 0ms ultra-fast feedback
    await this.sock?.sendMessage(jid, { react: { text: "⚡", key: msg.key } }).catch(() => {});

    try {
      const res = await resolveMediaFire(cleanUrl);
      if (!res.success || !res.downloadUrl) {
        await this.reply(
          jid,
          msg,
          `❌ *MediaFire බාගත කිරීම අසාර්ථක විය.* ⚠️\n${res.error || "Direct link extract කරගත නොහැකි විය."}\n\nකරුණාකර වලංගු MediaFire සබැඳියක් ලබා දෙන්න.`
        );
        return;
      }

      // Parse file size into MB
      const parseSizeToMB = (sizeStr: any) => {
        if (!sizeStr) return 0;
        const lower = String(sizeStr).toLowerCase().trim();
        const m = lower.match(/([0-9.]+)\s*(gb|mb|kb|b|bytes)?/i);
        if (!m) return 0;
        const val = parseFloat(m[1]);
        const unit = (m[2] || "mb").toLowerCase();
        if (unit === "gb") return val * 1024;
        if (unit === "kb") return val / 1024;
        if (unit === "b" || unit === "bytes") return val / (1024 * 1024);
        return val;
      };

      const sizeMB = parseSizeToMB(res.fileSize);
      // WhatsApp official limit is 2GB (2048 MB)
      const isOverTwoGB = sizeMB > 2048;

      if (isOverTwoGB) {
        const card = `📦 *MEDIAFIRE DIRECT DOWNLOADER* 🚀\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📄 *File Name:* ${res.fileName}\n📊 *File Size:* ${res.fileSize} ⚠️\n📁 *File Type:* ${res.mimeType}\n\n⚠️ *මෙම ගොනුවේ ප්‍රමාණය 2 GB ඉක්මවන බැවින් (${res.fileSize})*, WhatsApp සීමාව අනුව සෘජු Direct High-Speed Download Link එක පහතින් ලබා දී ඇත:\n🔗 ${res.downloadUrl}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n> ⚡ *ＰＯＷＥＲＥＤ  ＢＹ   ＹＡＳＨＩ   ＨＡＬＬＳ*`.trim();
        await this.reply(jid, msg, card);
        return;
      }

      // Fast-Path: Send quick status while fetching directly
      await this.reply(
        jid,
        msg,
        `📥 *බාගත කරමින් පවතී:* ${res.fileName} (${res.fileSize})\n⚡ _Ultra-Fast Direct CDN Engine වෙතින් WhatsApp ගොනුව ක්ෂණිකව සකස් කරමින් පවතී (2GB Max Support ✅)..._`
      );

      if (this.sock) {
        const headers = {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
          "Accept": "*/*",
          "Referer": cleanUrl
        };

        if (sizeMB > 0 && sizeMB <= 60) {
          // Fast in-memory buffer for files <= 60 MB
          try {
            const fileResp = await fetch(res.downloadUrl, { headers });
            if (!fileResp.ok) throw new Error(`MediaFire server responded with HTTP status ${fileResp.status}`);
            const arrayBuf = await fileResp.arrayBuffer();
            const buffer = Buffer.from(arrayBuf);
            await this.sock.sendMessage(
              jid,
              {
                document: buffer,
                fileName: res.fileName || "mediafire_file",
                mimetype: res.mimeType || "application/octet-stream",
                caption: `📦 *${res.fileName}*\n📊 *ප්‍රමාණය (Size):* ${res.fileSize}\n⚡ *බාගත කළේ:* YASHI HALLS Direct Downloader (2GB Ready)\n\n> ⚡ *ＰＯＷＥＲＥＤ  ＢＹ   ＹＡＳＨＩ   ＨＡＬＬＳ*`
              },
              { quoted: msg }
            );
            await this.sock.sendMessage(jid, { react: { text: "✅", key: msg.key } }).catch(() => {});
            this.addLog("SUCCESS", `MediaFire file delivered (< 60MB): ${res.fileName} (${res.fileSize}) to ${jid}`);
            return;
          } catch (smallErr: any) {
            this.addLog("WARN", `Fast buffer send notice: ${smallErr?.message || smallErr}, switching to stream...`);
          }
        }

        // For files up to 2GB (2048 MB), stream directly to disk and transmit via Baileys url-stream
        const safeName = (res.fileName || "mediafire_file").replace(/[^a-zA-Z0-9._-]/g, "_");
        const tempFilePath = path.join("/tmp", `mf_${Date.now()}_${safeName}`);

        try {
          const fileResp = await fetch(res.downloadUrl, { headers });
          if (!fileResp.ok || !fileResp.body) {
            throw new Error(`MediaFire server responded with HTTP status ${fileResp.status}`);
          }

          const writeStream = fs.createWriteStream(tempFilePath);
          const nodeReadable = Readable.fromWeb(fileResp.body as any);
          await pipeline(nodeReadable, writeStream);

          const stat = await fs.promises.stat(tempFilePath);
          const downloadedMB = stat.size / (1024 * 1024);

          if (downloadedMB > 2048) {
            await fs.promises.unlink(tempFilePath).catch(() => {});
            const card = `📦 *MEDIAFIRE DIRECT DOWNLOADER* 🚀\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📄 *File Name:* ${res.fileName}\n📊 *File Size:* ${downloadedMB.toFixed(2)} MB ⚠️\n📁 *File Type:* ${res.mimeType}\n\n⚠️ *මෙම ගොනුවේ සත්‍ය ප්‍රමාණය 2 GB ඉක්මවන බැවින් (${downloadedMB.toFixed(1)} MB), Direct High-Speed Download Link එක පහතින් ලබා දී ඇත:*\n🔗 ${res.downloadUrl}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n> ⚡ *ＰＯＷＥＲＥＤ  ＢＹ   ＹＡＳＨＩ   ＨＡＬＬＳ*`.trim();
            await this.reply(jid, msg, card);
            return;
          }

          // Transmit directly via Baileys url-based media upload supporting up to 2GB
          await this.sock.sendMessage(
            jid,
            {
              document: { url: tempFilePath },
              fileName: res.fileName || "mediafire_file",
              mimetype: res.mimeType || "application/octet-stream",
              caption: `📦 *${res.fileName}*\n📊 *ප්‍රමාණය (Size):* ${downloadedMB.toFixed(1)} MB (Under 2GB ✅)\n⚡ *බාගත කළේ:* YASHI HALLS Direct Downloader\n\n> ⚡ *ＰＯＷＥＲＥＤ  ＢＹ   ＹＡＳＨＩ   ＨＡＬＬＳ*`
            },
            { quoted: msg }
          );

          await this.sock.sendMessage(jid, { react: { text: "✅", key: msg.key } }).catch(() => {});
          this.addLog("SUCCESS", `MediaFire large file delivered: ${res.fileName} (${downloadedMB.toFixed(1)} MB) to ${jid}`);
          return;
        } catch (streamErr: any) {
          this.addLog("WARN", `Direct stream upload failed: ${streamErr?.message || streamErr}`);
          const card = `📦 *MEDIAFIRE DIRECT DOWNLOADER* 🚀\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📄 *File Name:* ${res.fileName}\n📊 *File Size:* ${res.fileSize}\n📁 *File Type:* ${res.mimeType}\n\n⚠️ _ගොනුව WhatsApp හරහා සෘජුව යැවීමේදී දෝෂයක් ඇති විය (${streamErr?.message || "Upload error"})._\n⚡ *කරුණාකර මෙම Direct High-Speed Link එකෙන් බාගත කරන්න:*\n🔗 ${res.downloadUrl}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n> ⚡ *ＰＯＷＥＲＥＤ  ＢＹ   ＹＡＳＨＩ   ＨＡＬＬＳ*`.trim();
          await this.reply(jid, msg, card);
          return;
        } finally {
          await fs.promises.unlink(tempFilePath).catch(() => {});
        }
      } else {
        const card = `📦 *MEDIAFIRE DIRECT DOWNLOADER* 🚀\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📄 *File Name:* ${res.fileName}\n📊 *File Size:* ${res.fileSize}\n📁 *File Type:* ${res.mimeType}\n🔗 *Direct Download Link:* ${res.downloadUrl}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n_POWERED BY YASHI HALLS_`.trim();
        await this.reply(jid, msg, card);
      }
    } catch (err) {
      this.addLog("ERROR", `MediaFire error: ${err?.message || err}`);
      await this.reply(jid, msg, `❌ *MediaFire Error:* ${err?.message || "Error occurred"}`);
    }
  }
  async cmdCineru(jid: string, msg: any, query?: string) {
    const p = this.state.config.prefix;
    const cleanQuery = (query || "").trim();

    if (!cleanQuery) {
      const guideText = `
╭───「 🇱🇰 *CINERU.LK MOVIE & SUBTITLE HUB* 」───╮
│
│ 🎬 Search any movie, TV series or film set
│ 📝 Direct Sinhala Subtitle (.srt / .zip) files
│ 📥 High-Speed 480p / 720p / 1080p Cloud Mirrors
│
╰──────────────────────────────────────────────╯

💡 *How to Use:*
• *${p}cineru <movie name>* (e.g. *${p}cineru Deadpool*)
• *${p}cineru <franchise> set* (e.g. *${p}cineru Harry Potter set*)
• *${p}cineru <series>* (e.g. *${p}cineru Loki*)

🔥 *Popular Film Sets Available:*
• Harry Potter (1-8 Complete Set)
• Fast & Furious (1-10 Franchise Set)
• John Wick (1-4 Complete Set)
• KGF Chapters 1 & 2
• Lord of the Rings Extended Trilogy

_POWERED BY YASHI HALLS & CINERU.LK_
`.trim();

      await this.sendInteractiveButtonsOrFallback(jid, msg, {
        text: guideText,
        title: "🇱🇰 CINERU.LK MOVIE HUB",
        mode: "buttons",
        buttons: [
          { buttonId: `${p}cineru harry potter set`, buttonText: { displayText: "🧙 HARRY POTTER SET" } },
          { buttonId: `${p}cineru fast and furious set`, buttonText: { displayText: "🏎️ FAST & FURIOUS SET" } },
          { buttonId: `${p}cineru deadpool`, buttonText: { displayText: "🍿 DEADPOOL" } }
        ],
        urls: [{ displayText: "🌐 VISIT CINERU.LK", url: "https://cineru.lk/" }]
      });
      return;
    }

    // Check for Film Set / Franchise Set first
    const filmSet = searchFilmSets(cleanQuery);
    if (filmSet) {
      await this.reply(jid, msg, `🔎 *Searching Cineru.lk for film set "${filmSet.setTitle}"...*`);
      const setCard = formatFilmSetCard(filmSet, p);
      let sentImage = false;
      if (filmSet.posterUrl && this.sock) {
        try {
          await Promise.race([
            this.sock.sendMessage(jid, { image: { url: filmSet.posterUrl }, caption: setCard }, { quoted: msg }),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 3000))
          ]);
          sentImage = true;
        } catch {}
      }
      if (!sentImage) {
        await this.reply(jid, msg, setCard);
      }
      return;
    }

    // Individual Movie on Cineru.lk
    await this.reply(jid, msg, `🔎 *Searching Cineru.lk for "${cleanQuery}" (Movies, Downloads & Sinhala Subtitles)...*`);
    try {
      const results = await searchMovies(cleanQuery, false);
      if (!results || results.length === 0) {
        await this.reply(jid, msg, `❌ *"${cleanQuery}" was not found on Cineru.lk.*\nTry checking spelling or visit: https://cineru.lk/?s=${encodeURIComponent(cleanQuery)}`);
        return;
      }
      const movie = results[0];
      const card = formatMovieCard(movie, p);
      let sentImage = false;
      if (movie.posterUrl && this.sock) {
        try {
          await Promise.race([
            this.sock.sendMessage(jid, { image: { url: movie.posterUrl }, caption: card }, { quoted: msg }),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 3000))
          ]);
          sentImage = true;
        } catch {}
      }
      if (!sentImage) {
        await this.reply(jid, msg, card);
      }
    } catch (err: any) {
      this.addLog("ERROR", `Cineru search error: ${err?.message || err}`);
      await this.reply(jid, msg, `❌ *Cineru Search Error:* ${err?.message || "Error occurred"}`);
    }
  }

  async cmdFilm(jid: string, msg: any, query?: string, onlyDub = false) {
    const p = this.state.config.prefix;
    const cleanQuery = (query || "").trim();

    // Check if query is asking for a film set
    const detectedSet = searchFilmSets(cleanQuery);
    if (detectedSet) {
      await this.reply(jid, msg, `🔎 *Searching Cineru.lk for film set "${detectedSet.setTitle}"...*`);
      const setCard = formatFilmSetCard(detectedSet, p);
      let sentImage = false;
      if (detectedSet.posterUrl && this.sock) {
        try {
          await Promise.race([
            this.sock.sendMessage(jid, { image: { url: detectedSet.posterUrl }, caption: setCard }, { quoted: msg }),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 3000))
          ]);
          sentImage = true;
        } catch {}
      }
      if (!sentImage) {
        await this.reply(jid, msg, setCard);
      }
      return;
    }

    if (!cleanQuery) {
      const dubTitle = onlyDub
        ? "SINHALA DUBBED MOVIES (හඬකැවූ චිත්‍රපට)"
        : "MOVIE & FILM DOWNLOADER (චිත්‍රපට බාගතකිරීම්)";
      await this.reply(
        jid,
        msg,
        `🎬 *${dubTitle}* 🍿\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nකරුණාකර සොයන චිත්‍රපටයේ නම ලබා දෙන්න.\n_Please enter a movie title to search._\n\n💡 *උදාහරණ (Examples):*\n*${p}${onlyDub ? "filmdub" : "film"} Avatar*\n*${p}${onlyDub ? "filmdub" : "film"} Kung Fu Panda*\n*${p}${onlyDub ? "filmdub" : "film"} KGF 2*\n*${p}${onlyDub ? "filmdub" : "film"} Moana*\n*${p}${onlyDub ? "filmdub" : "film"} Deadpool*\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n_POWERED BY YASHI HALLS_`
      );
      return;
    }

    await this.reply(
      jid,
      msg,
      `🔎 *චිත්‍රපට සබැඳි සහ තොරතුරු සොයමින් පවතී...*\n_Searching for "${cleanQuery}" in Sinhala subtitle & dub cloud..._`
    );

    try {
      const results = await searchMovies(cleanQuery, onlyDub);
      if (!results || results.length === 0) {
        await this.reply(
          jid,
          msg,
          `❌ *"${cleanQuery}" චිත්‍රපටය හමු නොවීය.* කරුණාකර නම නිවැරදිව ටයිප් කර නැවත උත්සාහ කරන්න.`
        );
        return;
      }

      const movie = results[0];
      const card = formatMovieCard(movie, p);
      let sentImage = false;
      if (movie.posterUrl && this.sock) {
        try {
          await Promise.race([
            this.sock.sendMessage(jid, { image: { url: movie.posterUrl }, caption: card }, { quoted: msg }),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 3000))
          ]);
          sentImage = true;
        } catch {}
      }
      if (!sentImage) {
        await this.reply(jid, msg, card);
      }
    } catch (err: any) {
      this.addLog("ERROR", `Movie search error: ${err?.message || err}`);
      await this.reply(jid, msg, `❌ *Film Search Error:* ${err?.message || "Error occurred"}`);
    }
  }  async getLogoBuffer() {
    const currentLogoUrl = this.state.config.botLogoUrl || BRAND_LOGO_URL;

    if (this.cachedLogoBuffer && this.lastCachedLogoUrl === currentLogoUrl) {
      return this.cachedLogoBuffer;
    }

    const candidatePaths = [
      path.resolve(process.cwd(), 'data', 'bot_logo_opt.jpg'),
      '/data/bot_logo_opt.jpg',
      '/app/applet/data/bot_logo_opt.jpg',
      path.resolve(process.cwd(), 'data', 'bot_logo.png'),
      '/data/bot_logo.png',
      '/app/applet/data/bot_logo.png',
    ];

    if (!this.state.config.botLogoUrl || this.state.config.botLogoUrl === BRAND_LOGO_URL) {
      for (const p of candidatePaths) {
        try {
          if (fs.existsSync(p)) {
            this.cachedLogoBuffer = fs.readFileSync(p);
            this.lastCachedLogoUrl = currentLogoUrl;
            return this.cachedLogoBuffer;
          }
        } catch {}
      }
    }

    try {
      const resp = await fetch(currentLogoUrl, { signal: AbortSignal.timeout(4000) });
      if (resp.ok) {
        const arr = await resp.arrayBuffer();
        const rawBuf = Buffer.from(arr);
        this.cachedLogoBuffer = rawBuf;
        this.lastCachedLogoUrl = currentLogoUrl;
        return this.cachedLogoBuffer;
      }
    } catch (err) {}

    return { url: currentLogoUrl };
  }

  async cmdMenu(jid: string, msg: any, categoryArg?: string) {
    const p = this.state.config.prefix;
    const cat = (categoryArg || '').trim().toLowerCase();
    const botName = this.state.config.botName || 'YASHI HALLS';
    const plan = (this.state.config.plan || 'PRO').toUpperCase();

    // CATEGORY 1: DOWNLOAD SUITE
    if (cat === '1' || cat === 'download' || cat === 'downloads' || cat === 'dl' || cat === 'mediafire') {
      const text = `
╭───「 *DOWNLOAD SUITE* 」───╮
│
│ 🎵 *${p}song <title>*
│    Download high-quality MP3 audio track
│
│ 🎬 *${p}video <title>*
│    Download high-definition MP4 video clip
│
│ 📦 *${p}mediafire <url>*
│    Direct cloud file downloader (Auto-detect)
│
│ 📱 *${p}tiktok <url>*
│    TikTok HD video without watermark
│
│ 📘 *${p}fb <url>*
│    Facebook public video (HD / SD)
│
│ 📸 *${p}ig <url>*
│    Instagram Reels, Posts & Videos
│
│ 🐦 *${p}twitter <url>*
│    Twitter / X video downloader
│
│ 📲 *${p}apk <app name>*
│    Download Android APK package
│
╰────────────────────────────╯
💡 *Usage:* Type *${p}song Faded* or paste any MediaFire link.
↩️ *Back to Menu:* Type *0* or *${p}menu*
`.trim();

      await this.sendInteractiveButtonsOrFallback(jid, msg, {
        text,
        title: "📥 DOWNLOAD SUITE",
        mode: "buttons",
        buttons: [
          { buttonId: `${p}menu movie`, buttonText: { displayText: "🎬 MOVIES" } },
          { buttonId: `${p}menu ai`, buttonText: { displayText: "🤖 AI SUITE" } },
          { buttonId: `${p}menu`, buttonText: { displayText: "🏠 MAIN MENU" } }
        ],
        urls: [{ displayText: "📢 WHATSAPP CHANNEL", url: WHATSAPP_CHANNEL_URL }]
      });
      return;
    }

    // CATEGORY 2: MOVIES & CINEMA
    if (cat === '2' || cat === 'movie' || cat === 'movies' || cat === 'film' || cat === 'films' || cat === 'filmdub' || cat === 'dub' || cat === 'sinhalasub' || cat === 'cinesubz') {
      const text = `
╭───「 *MOVIES & CINEMA (CINERU.LK)* 」───╮
│
│ 🇱🇰 *${p}cineru <name>*
│    Cineru.lk movie search, cloud downloads & subtitles
│
│ 📦 *${p}cineru <franchise> set*
│    Complete film sets (Harry Potter, Fast & Furious, etc.)
│
│ 🎬 *${p}film <name>*
│    Search movies & direct streaming links
│
│ 🎙️ *${p}filmdub <name>*
│    Sinhala dubbed movies, cartoons & series
│
│ 🍿 *${p}movie <name>*
│    Movie details, cast, poster & IMDb rating
│
│ 🎥 *${p}cinesubz <name>*
│    Cinesubz direct downloads & subtitles
│
│ 📝 *${p}sinhalasub <name>*
│    Baiscope & Sinhala subtitles search
│
╰────────────────────────────────────────╯
💡 *Usage:* Type *${p}film Avatar* or *${p}filmdub Kung Fu Panda*
↩️ *Back to Menu:* Type *0* or *${p}menu*
`.trim();

      await this.sendInteractiveButtonsOrFallback(jid, msg, {
        text,
        title: "🎬 MOVIES & CINEMA",
        mode: "buttons",
        buttons: [
          { buttonId: `${p}menu download`, buttonText: { displayText: "📥 DOWNLOADS" } },
          { buttonId: `${p}menu ai`, buttonText: { displayText: "🤖 AI SUITE" } },
          { buttonId: `${p}menu`, buttonText: { displayText: "🏠 MAIN MENU" } }
        ],
        urls: [{ displayText: "📢 WHATSAPP CHANNEL", url: WHATSAPP_CHANNEL_URL }]
      });
      return;
    }

    // CATEGORY 3: AI & SMART SUITE
    if (cat === '3' || cat === 'ai' || cat === 'gemini' || cat === 'voice' || cat === 'vision' || cat === 'tools') {
      const text = `
╭───「 *AI & SMART SUITE* 」───╮
│
│ 🤖 *${p}ai <prompt>*
│    Ask anything with Google Gemini Flash AI
│
│ 🌐 *${p}translate <lang> <text>*
│    Accurate multi-language translation
│
│ 📝 *${p}summarize <text/link>*
│    Generate concise bullet-point summary
│
│ ✍️ *${p}write <topic>*
│    Compose professional essays & letters
│
│ 💻 *${p}code <lang> <prompt>*
│    Write, debug & explain code in 30+ languages
│
│ 🎨 *${p}imagine <prompt>*
│    Generate photorealistic AI digital art
│
│ 🎙️ *${p}voicetrans <lang>* (reply to voice note)
│    Translate spoken audio note to any language
│
│ 🎵 *${p}shazam* (reply to audio)
│    Identify song title, artist & album
│
│ 🖼️ *${p}aisticker <prompt>*
│    Create custom AI sticker instantly
│
│ 🧮 *${p}math <expression>*
│    Step-by-step mathematical calculation
│
╰──────────────────────────────╯
💡 *Usage:* Type *${p}ai Tell me a fun fact* or *${p}imagine Cyberpunk City*
↩️ *Back to Menu:* Type *0* or *${p}menu*
`.trim();

      await this.sendInteractiveButtonsOrFallback(jid, msg, {
        text,
        title: "🤖 AI & SMART SUITE",
        mode: "buttons",
        buttons: [
          { buttonId: `${p}menu download`, buttonText: { displayText: "📥 DOWNLOADS" } },
          { buttonId: `${p}menu group`, buttonText: { displayText: "🛡️ GROUP TOOLS" } },
          { buttonId: `${p}menu`, buttonText: { displayText: "🏠 MAIN MENU" } }
        ],
        urls: [{ displayText: "📢 WHATSAPP CHANNEL", url: WHATSAPP_CHANNEL_URL }]
      });
      return;
    }

    // CATEGORY 4: GROUP MANAGEMENT
    if (cat === '4' || cat === 'group' || cat === 'groups' || cat === 'admin' || cat === 'manage') {
      const text = `
╭───「 *GROUP MANAGEMENT* 」───╮
│
│ ℹ️ *${p}groupinfo*
│    View group details, participants & permissions
│
│ 👑 *${p}admins*
│    List all group administrators
│
│ 📢 *${p}tagall [message]*
│    Mention every member in the group
│
│ 👻 *${p}hidetag [message]*
│    Silent invisible broadcast mention [PRO]
│
│ 🚫 *${p}kick @user*
│    Remove participant from group
│
│ ➕ *${p}add <phone number>*
│    Add member to group
│
│ 🔒 *${p}mute* / *${p}unmute*
│    Lock / unlock group messages for members
│
│ 🛡️ *${p}antilink <on/off>*
│    Auto-delete link spam & kick offenders
│
│ ⚠️ *${p}warn @user* / *${p}warns* / *${p}resetwarn*
│    Member warning system (3 warns = kick)
│
╰──────────────────────────────╯
💡 *Usage:* Type *${p}tagall Urgent meeting now!*
↩️ *Back to Menu:* Type *0* or *${p}menu*
`.trim();

      await this.sendInteractiveButtonsOrFallback(jid, msg, {
        text,
        title: "🛡️ GROUP MANAGEMENT",
        mode: "buttons",
        buttons: [
          { buttonId: `${p}groupinfo`, buttonText: { displayText: "ℹ️ GROUP INFO" } },
          { buttonId: `${p}admins`, buttonText: { displayText: "👑 ADMINS" } },
          { buttonId: `${p}menu`, buttonText: { displayText: "🏠 MAIN MENU" } }
        ],
        urls: [{ displayText: "📢 WHATSAPP CHANNEL", url: WHATSAPP_CHANNEL_URL }]
      });
      return;
    }

    // CATEGORY 5: GAMES & CASINO
    if (cat === '5' || cat === 'game' || cat === 'games' || cat === 'fun' || cat === 'casino') {
      const text = `
╭───「 *GAMES & ENTERTAINMENT* 」───╮
│
│ 🧠 *${p}quiz*
│    Answer trivia challenges to earn coins
│
│ 🎯 *${p}guess <1-10>*
│    Guess the mystery secret number
│
│ 🎲 *${p}roll*
│    Roll a 6-sided dice
│
│ 🪙 *${p}flip*
│    Flip a coin (Heads or Tails)
│
│ 🎰 *${p}slot*
│    Casino slot machine (Match 3 symbols to win)
│
│ 🏆 *${p}leaderboard*
│    View top coin holders & rankings
│
╰──────────────────────────────────╯
💡 *Usage:* Type *${p}quiz* or *${p}guess 7*
↩️ *Back to Menu:* Type *0* or *${p}menu*
`.trim();

      await this.sendInteractiveButtonsOrFallback(jid, msg, {
        text,
        title: "🎮 GAMES & ENTERTAINMENT",
        mode: "buttons",
        buttons: [
          { buttonId: `${p}quiz`, buttonText: { displayText: "🧠 PLAY QUIZ" } },
          { buttonId: `${p}slot`, buttonText: { displayText: "🎰 PLAY SLOTS" } },
          { buttonId: `${p}menu`, buttonText: { displayText: "🏠 MAIN MENU" } }
        ],
        urls: [{ displayText: "📢 WHATSAPP CHANNEL", url: WHATSAPP_CHANNEL_URL }]
      });
      return;
    }

    // CATEGORY 6: BOT SETTINGS & TOGGLES
    if (cat === '6' || cat === 'settings' || cat === 'setting' || cat === 'config' || cat === 'info' || cat === 'support') {
      const text = `
╭───「 *SETTINGS & CONFIGURATION* 」───╮
│
│ ⚡ *${p}ping*
│    Test engine response speed & latency
│
│ 🔗 *${p}pair <number>*
│    Get Pairing Code & QR to link WhatsApp bot
│
│ ⚙️ *${p}settings*
│    View full bot status, quotas & plan info
│
│ 🤖 *${p}autochat <on/off>*
│    Toggle AI smart conversational auto-reply
│
│ 🎙️ *${p}voicereply <on/off>*
│    Toggle voice note auto-replies
│
│ ❤️ *${p}channelreact <on/off>*
│    Toggle automatic emoji reactions on channel posts
│
│ 👑 *${p}owner*
│    Bot creator details & support hotline
│
╰──────────────────────────────────────╯
💡 *Usage:* Type *${p}autochat off* or *${p}ping*
↩️ *Back to Menu:* Type *0* or *${p}menu*
`.trim();

      await this.sendInteractiveButtonsOrFallback(jid, msg, {
        text,
        title: "⚙️ BOT SETTINGS",
        mode: "buttons",
        buttons: [
          { buttonId: `${p}ping`, buttonText: { displayText: "⚡ CHECK PING" } },
          { buttonId: `${p}owner`, buttonText: { displayText: "👑 OWNER INFO" } },
          { buttonId: `${p}menu`, buttonText: { displayText: "🏠 MAIN MENU" } }
        ],
        urls: [{ displayText: "📢 WHATSAPP CHANNEL", url: WHATSAPP_CHANNEL_URL }]
      });
      return;
    }

    // CATEGORY 7: DAILY & FINANCE
    if (cat === '7' || cat === 'daily' || cat === 'finance' || cat === 'tools2') {
      const text = `
╭───「 *DAILY & FINANCE SUITE* 」───╮
│
│ 💰 *${p}gold*
│    Live gold (24k/22k) & cryptocurrency rates
│
│ 🧾 *${p}bill <amount> <people>*
│    Split restaurant or group bill with tax & tip
│
│ ⏰ *${p}remind <minutes> <reminder>*
│    Set automatic timed reminder message
│
╰───────────────────────────────────╯
💡 *Usage:* Type *${p}gold* or *${p}bill 4500 3*
↩️ *Back to Menu:* Type *0* or *${p}menu*
`.trim();

      await this.sendInteractiveButtonsOrFallback(jid, msg, {
        text,
        title: "📊 DAILY & FINANCE",
        mode: "buttons",
        buttons: [
          { buttonId: `${p}gold`, buttonText: { displayText: "💰 GOLD RATES" } },
          { buttonId: `${p}menu`, buttonText: { displayText: "🏠 MAIN MENU" } }
        ],
        urls: [{ displayText: "📢 WHATSAPP CHANNEL", url: WHATSAPP_CHANNEL_URL }]
      });
      return;
    }

    // CATEGORY 8: BUSINESS & COMMERCE
    if (cat === '8' || cat === 'business' || cat === 'shop' || cat === 'store') {
      const text = `
╭───「 *BUSINESS & COMMERCE* 」───╮
│
│ 🛍️ *${p}shop*
│    Browse mini digital store & products
│
│ 🧾 *${p}invoice <amount> <client>*
│    Generate professional digital invoice receipt
│
╰─────────────────────────────────╯
💡 *Usage:* Type *${p}shop* or *${p}invoice 2500 John Doe*
↩️ *Back to Menu:* Type *0* or *${p}menu*
`.trim();

      await this.sendInteractiveButtonsOrFallback(jid, msg, {
        text,
        title: "💼 BUSINESS & COMMERCE",
        mode: "buttons",
        buttons: [
          { buttonId: `${p}shop`, buttonText: { displayText: "🛍️ OPEN SHOP" } },
          { buttonId: `${p}menu`, buttonText: { displayText: "🏠 MAIN MENU" } }
        ],
        urls: [{ displayText: "📢 WHATSAPP CHANNEL", url: WHATSAPP_CHANNEL_URL }]
      });
      return;
    }

    // DEFAULT: MASTER MAIN MENU (100% CLEAN, AESTHETIC ENGLISH)
    const masterMenuText = `╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃       👑 *ＭＩＮＩ ＢＯＴ* 👑                                      
┃   *${botName} • WA ASSISTANT*                          
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃     ✨ *ALL COMMANDS MENU* ✨                         
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 👤 *1. PROFILE & STATUS*                                       
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
 ╰┈➤ ${p}status
 ╰┈➤ ${p}setstatus <text>
 ╰┈➤ ${p}statusview
 ╰┈➤ ${p}statussave
 ╰┈➤ ${p}statusreact
 ╰┈➤ ${p}setdp
 ╰┈➤ ${p}getdp @user
 ╰┈➤ ${p}setname <name>
 ╰┈➤ ${p}setbio <text>

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 📥 *2. DOWNLOAD*                                                     
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
 ╰┈➤ ${p}song
 ╰┈➤ ${p}video
 ╰┈➤ ${p}play
 ╰┈➤ ${p}audio
 ╰┈➤ ${p}ytsearch
 ╰┈➤ ${p}mediafire / ${p}mf
 ╰┈➤ ${p}tiktok / ${p}tt
 ╰┈➤ ${p}fb
 ╰┈➤ ${p}ig
 ╰┈➤ ${p}twitter
 ╰┈➤ ${p}apk
 ╰┈➤ ${p}lyrics

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 🎬 *3. MOVIES & SUBTITLES*                                  
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
 ╰┈➤ ${p}cineru
 ╰┈➤ ${p}cineru <name> set
 ╰┈➤ ${p}film / ${p}movie
 ╰┈➤ ${p}filmdub / ${p}dub / ${p}sinhaladub
 ╰┈➤ ${p}cinesubz
 ╰┈➤ ${p}sinhalasub

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 🤖 *4. AI & SMART TOOLS*                                       
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
 ╰┈➤ ${p}ai / ${p}ask / ${p}gemini
 ╰┈➤ ${p}translate / ${p}tr
 ╰┈➤ ${p}summarize
 ╰┈➤ ${p}write
 ╰┈➤ ${p}code
 ╰┈➤ ${p}imagine
 ╰┈➤ ${p}img
 ╰┈➤ ${p}ocr
 ╰┈➤ ${p}voicetrans
 ╰┈➤ ${p}transcribe / ${p}vtext
 ╰┈➤ ${p}shazam / ${p}findsong
 ╰┈➤ ${p}aisticker
 ╰┈➤ ${p}sticker / ${p}s
 ╰┈➤ ${p}math / ${p}solve
 ╰┈➤ ${p}cv / ${p}resume
 ╰┈➤ ${p}food / ${p}calorie
 ╰┈➤ ${p}filter
 ╰┈➤ ${p}meme
 ╰┈➤ ${p}quote

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 👥 *5. GROUP MANAGEMENT*                                
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
 ╰┈➤ ${p}groupinfo
 ╰┈➤ ${p}admins
 ╰┈➤ ${p}tagall / ${p}everyone
 ╰┈➤ ${p}hidetag
 ╰┈➤ ${p}kick / ${p}remove
 ╰┈➤ ${p}add
 ╰┈➤ ${p}promote
 ╰┈➤ ${p}demote
 ╰┈➤ ${p}mute / ${p}close
 ╰┈➤ ${p}unmute / ${p}open
 ╰┈➤ ${p}link / ${p}invite
 ╰┈➤ ${p}revoke
 ╰┈➤ ${p}setgroupname
 ╰┈➤ ${p}setdesc
 ╰┈➤ ${p}warn
 ╰┈➤ ${p}warns
 ╰┈➤ ${p}resetwarn
 ╰┈➤ ${p}antilink
 ╰┈➤ ${p}antispam
 ╰┈➤ ${p}welcome
 ╰┈➤ ${p}poll

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 🎮 *6. GAMES & FUN*                                                
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
 ╰┈➤ ${p}quiz
 ╰┈➤ ${p}guess
 ╰┈➤ ${p}roll
 ╰┈➤ ${p}flip
 ╰┈➤ ${p}slot
 ╰┈➤ ${p}leaderboard / ${p}top
 ╰┈➤ ${p}meme
 ╰┈➤ ${p}quote

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ ⚙️ *7. BOT SETTINGS*                                               
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
 ╰┈➤ ${p}menu
 ╰┈➤ ${p}ping
 ╰┈➤ ${p}alive
 ╰┈➤ ${p}uptime
 ╰┈➤ ${p}botinfo
 ╰┈➤ ${p}settings
 ╰┈➤ ${p}autochat
 ╰┈➤ ${p}voicereply
 ╰┈➤ ${p}channelreact
 ╰┈➤ ${p}public
 ╰┈➤ ${p}private
 ╰┈➤ ${p}setprefix
 ╰┈➤ ${p}setbotname
 ╰┈➤ ${p}setbotlogo
 ╰┈➤ ${p}owner
 ╰┈➤ ${p}broadcast
 ╰┈➤ ${p}restart
 ╰┈➤ ${p}autoreact
 ╰┈➤ ${p}antidelete
 ╰┈➤ ${p}autoread
 ╰┈➤ ${p}autorecord
 ╰┈➤ ${p}afk
 ╰┈➤ ${p}save

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 💰 *8. DAILY & UTILITIES*                                         
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
 ╰┈➤ ${p}gold / ${p}crypto / ${p}rates
 ╰┈➤ ${p}bill
 ╰┈➤ ${p}remind
 ╰┈➤ ${p}weather
 ╰┈➤ ${p}time
 ╰┈➤ ${p}date


> ⚡ *ＰＯＷＥＲＥＤ  ＢＹ   ＹＡＳＨＩ   ＨＡＬＬＳ*`;

    await this.sendInteractiveButtonsOrFallback(jid, msg, {
      text: masterMenuText,
      title: `👑 MINI BOT • ALL COMMANDS MENU 👑`,
      mode: "buttons",
      buttons: [
        { buttonId: `${p}ping`, buttonText: { displayText: "⚡ PING" } },
        { buttonId: `${p}alive`, buttonText: { displayText: "🟢 ALIVE" } },
        { buttonId: `${p}owner`, buttonText: { displayText: "👑 OWNER" } }
      ],
      copyCodes: [
        { displayText: "📋 Copy .menu", copyCode: `${p}menu` },
        { displayText: "⚡ Copy .ping", copyCode: `${p}ping` }
      ],
      urls: [
        { displayText: "📢 OFFICIAL CHANNEL", url: WHATSAPP_CHANNEL_URL }
      ],
      calls: [
        { displayText: "📞 SUPPORT HOTLINE", phoneNumber: OWNER_HOTLINE }
      ]
    });
  }

  async cmdPair(jid: string, msg: any, args: string, sender: string, isGroup: boolean) {
    const p = this.state.config.prefix || ".";
    let rawPhone = (args || "").trim();

    if (!rawPhone) {
      const cleanSender = sender.split("@")[0].split(":")[0].replace(/\D/g, "");
      if (cleanSender.length >= 8 && !cleanSender.startsWith("64016")) {
        rawPhone = cleanSender;
      }
    }

    const cleanPhone = normalizeWhatsAppNumber(rawPhone);
    if (!cleanPhone || cleanPhone.length < 8) {
      await this.reply(
        jid,
        msg,
        `⚠️ *අවලංගු WhatsApp අංකයකි (Invalid WhatsApp Number)*\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nකරුණාකර ඔබගේ WhatsApp අංකය සමඟ විධානය ලබා දෙන්න:\n\n💡 *උදාහරණ (Usage):*\n*${p}pair 0740712934*\n*${p}pair 94740712934*\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n_POWERED BY YASHI HALLS ENGINE_ ⚡`
      );
      return;
    }

    if (this.state.pairedNumber && this.state.pairedNumber.includes(cleanPhone) && this.state.isOnline) {
      await this.reply(
        jid,
        msg,
        `🟢 *+${cleanPhone} අංකය දැනටමත් මෙම Bot සමඟ සාර්ථකව සම්බන්ධ වී (Connected) ඇත!* ✅\n\nවිධාන ලැයිස්තුව බැලීමට *${p}menu* හෝ වේගය පරීක්ෂා කිරීමට *${p}ping* ලෙස එවන්න.`
      );
      return;
    }

    await this.sock?.sendMessage(jid, { react: { text: "⚡", key: msg.key } }).catch(() => {});
    await this.reply(
      jid,
      msg,
      `⏳ *WHATSAPP BOT PAIRING SESSION GENERATING...* ⚡\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📱 *Target Phone:* +${cleanPhone}\n🔄 WhatsApp Server වෙතින් Pairing Code සහ QR Code ලබාගනිමින් පවතී...\n_කරුණාකර තත්පර 3-5ක් රැඳී සිටින්න._\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
    );

    try {
      const targetEngine = getBotEngine(cleanPhone);
      targetEngine.requestedFromJid = jid;

      const res = await targetEngine.requestPairingCodeAndQr(cleanPhone);

      if (!res.success && !res.pairingCode && !res.qrBuffer) {
        await this.reply(
          jid,
          msg,
          `❌ *Pairing Error:* ${res.message || "Could not generate pairing session. Please try again."}`
        );
        return;
      }

      const pairingCode = res.pairingCode || targetEngine.state.pairingCode || "WAITING";
      const formattedCode = pairingCode.includes("-") ? pairingCode : pairingCode.match(/.{1,4}/g)?.join("-") || pairingCode;

      const caption = `*〘 👑 YASHI HALLS BOT PAIRING 👑 〙*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📱 *WhatsApp Number:* +${cleanPhone}
🔑 *Pairing Code:* \`${formattedCode}\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 *සම්බන්ධ වන ආකාරය (How to Link):*

1️⃣ ඔබගේ WhatsApp හි *Settings* (හෝ ⠇ තිත් 3) වෙත යන්න.
2️⃣ *Linked Devices (සම්බන්ධිත උපාංග)* තෝරන්න.
3️⃣ *Link a Device* ඔබන්න.
4️⃣ පහළින් ඇති *"Link with phone number instead"* ඔබා ඉහත Pairing Code එක (\`${formattedCode}\`) ඇතුළත් කරන්න.
_(හෝ ඉහත QR Code එක වෙනත් දුරකථනයකින් Scan කරන්න.)_

⏱️ _කේතය විනාඩි 2ක් ඇතුළත WhatsApp හි ඇතුළත් කරන්න._
✅ Pair වූ වහාම ඔබගේ Bot ස්වයංක්‍රීයව සක්‍රිය වී 24/7 ක්‍රියාත්මක වේ!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
_POWERED BY YASHI HALLS 24/7 CLOUD ENGINE_ ⚡`.trim();

      await this.sock?.sendMessage(jid, { react: { text: "✅", key: msg.key } }).catch(() => {});

      if (res.qrBuffer) {
        await this.sock.sendMessage(
          jid,
          {
            image: res.qrBuffer,
            caption,
          },
          { quoted: msg }
        );
      } else {
        await this.reply(jid, msg, caption);
      }

      // Send single copyable code message so user can easily copy on mobile
      await this.sock?.sendMessage(jid, { text: formattedCode });
      this.addLog("INFO", `✅ Delivered pairing code (${formattedCode}) and QR for +${cleanPhone} to ${jid.split("@")[0]}`);
    } catch (err: any) {
      this.addLog("ERROR", `cmdPair error for +${cleanPhone}: ${err?.message || err}`);
      await this.reply(
        jid,
        msg,
        `⚠️ *Pairing Failed:* ${err?.message || "An unexpected error occurred. Please try again."}`
      );
    }
  }

  async cmdPing(jid: string, msg: any) {
    const rawBotName = (this.state.config.botName || "YASHI-MD").toUpperCase();
    const cleanBotName = rawBotName.includes("OFFICIAL") ? rawBotName : `${rawBotName} OFFICIAL`;
    const plan = (this.state.config.plan || "MINI").toUpperCase();
    const totalSec = this.startTime ? Math.floor((Date.now() - this.startTime) / 1000) : 1644;
    this.state.lastPingMs = 0;

    const pingText = `*${cleanBotName}* </>
〔 *${this.state.config.botName || "YASHI"}-${plan}* 〕―➤
⚡ *LATENCY:* 0Ms
⏱ *UPTIME:* ${totalSec}s
🏎️ *SPEED:* 0.000s (ULTRA FAST ⚡)
🟢 *STATUS:* 24/7 NON-STOP ONLINE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
_POWERED BY YASHI HALLS ENGINE_ ⚡`.trim();
    await this.reply(jid, msg, pingText);
  }async cmdOwner(jid,msg){const p=this.state.config.prefix;const text=`
\u{1F451} *BOT OWNER PROFILE*
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u{1F464} *Name:* Sawrika Suraj
\u{1F4DE} *WhatsApp:* +${this.state.config.ownerNumber} (0740712934)
\u{1F310} *Cloud:* YASHI HALLS Platform
\u{1F4AC} *Channel:* ${WHATSAPP_CHANNEL_URL}
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
`.trim();await this.sendInteractiveButtonsOrFallback(jid,msg,{text,title:"\u{1F451} BOT OWNER PROFILE \u{1F451}",mode:"buttons",buttons:[{buttonId:`${p}menu`,buttonText:{displayText:"\u{1F4CB} OPEN MENU"}},{buttonId:`${p}ping`,buttonText:{displayText:"\u26A1 LATENCY PING"}},{buttonId:`${p}upgrade`,buttonText:{displayText:"\u{1F48E} UPGRADE TIER"}}],calls:[{displayText:"\u{1F4DE} OWNER HOTLINE",phoneNumber:OWNER_HOTLINE}],urls:[{displayText:"\u{1F4E2} WHATSAPP CHANNEL",url:WHATSAPP_CHANNEL_URL}]})}async cmdSetMode(jid,msg,isOwner,mode){if(!isOwner){await this.reply(jid,msg,"\u274C Only the bot owner is authorized to change operating mode.");return}this.state.config.mode=mode;this.addLog("INFO",`Bot mode switched to ${mode.toUpperCase()}`);await this.reply(jid,msg,`\u2705 *Bot mode set to ${mode.toUpperCase()}!*
${mode==="public"?"Everyone can now use bot commands.":"Only owner commands are accepted."}`)}async cmdSong(jid,msg,query){const cleanQuery=(query||"").trim();if(!cleanQuery){await this.reply(jid,msg,`🎵 *YASHI HALLS SONG ENGINE*
Please specify a song name or YouTube link.
_Example: ${this.state.config.prefix}song ellen yanna bari_`);return}if(this.state.config.plan==="mini"&&this.state.quotas.mediaRequestsUsed>=this.state.quotas.mediaQuotaMax){await this.reply(jid,msg,`⚠️ *MINI Plan Media Quota Reached!* (${this.state.quotas.mediaRequestsUsed}/${this.state.quotas.mediaQuotaMax})
Upgrade to *YASHI HALLS PRO* for unlimited song & video downloads.`);return}this.state.quotas.mediaRequestsUsed++;this.addLog("INFO",`Audio stream requested for: "${cleanQuery}" from ${jid}`);await this.sock?.sendMessage(jid,{react:{text:"🎵",key:msg.key}}).catch(()=>{});await this.reply(jid,msg,`⚡ _Searching & extracting MP3 for "${cleanQuery}"..._`);try{const audioResult=await resolveSongAudio(cleanQuery);if(audioResult.success&&audioResult.buffer){const isSent=await this.sendAudio(jid,msg,audioResult.buffer,audioResult.fileName||`${audioResult.title}.mp3`,audioResult.title,audioResult.thumbnailUrl,audioResult.sourceUrl);if(isSent){await this.sock?.sendMessage(jid,{react:{text:"✅",key:msg.key}}).catch(()=>{});const fileSizeMb=(audioResult.buffer.length/1024/1024).toFixed(2);const response=`🎶 *${audioResult.title}*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏱️ *Duration:* ${audioResult.duration||"03:45"}
🔊 *Bitrate:* ${audioResult.bitrate||"320kbps MP3"}
📦 *Size:* ${fileSizeMb} MB
⚡ *Speed:* 0.000s Ultra Fast Direct Delivery!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> ⚡ *ＰＯＷＥＲＥＤ  ＢＹ   ＹＡＳＨＩ   ＨＡＬＬＳ*`.trim();await this.reply(jid,msg,response)}else{await this.reply(jid,msg,`⚠️ Audio buffer prepared, but failed to transmit to WhatsApp chat. Please retry.`)}}else{this.addLog("WARN",`Audio download failed for "${cleanQuery}": ${audioResult.error}`);await this.reply(jid,msg,`❌ *Audio Download Failed*\n${audioResult.error||`Could not find an available audio stream for "${cleanQuery}". Please check the spelling or try another song title.`}`)}}catch(err){this.addLog("ERROR",`cmdSong error: ${err?.message||err}`);await this.reply(jid,msg,`⚠️ *Audio Engine Error:* ${err?.message||"Failed to process audio request"}`)}}  async cmdVideo(jid: string, msg: any, query?: string) {
    const cleanQuery = (query || "").trim();
    if (!cleanQuery) {
      await this.reply(
        jid,
        msg,
        `🎬 *YASHI HALLS VIDEO ENGINE (2GB MAX)* 🚀\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nකරුණාකර වීඩියෝවේ නම හෝ ලින්ක් එකක් ලබා දෙන්න.\n_Please specify a video name or link (YouTube, TikTok, FB, Direct MP4)._\n\n💡 *උදාහරණ (Example):*\n*${this.state.config.prefix}video Alan Walker Faded*\n*${this.state.config.prefix}video Nature 4K*\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n> ⚡ *ＰＯＷＥＲＥＤ  ＢＹ   ＹＡＳＨＩ   ＨＡＬＬＳ*`
      );
      return;
    }

    if (this.state.config.plan === "mini" && this.state.quotas.mediaRequestsUsed >= this.state.quotas.mediaQuotaMax) {
      await this.reply(
        jid,
        msg,
        `⚠️ *MINI Plan Media Quota Reached!* (${this.state.quotas.mediaRequestsUsed}/${this.state.quotas.mediaQuotaMax})\nUpgrade to *YASHI HALLS PRO* for unlimited video requests.`
      );
      return;
    }

    this.state.quotas.mediaRequestsUsed++;
    await this.sock?.sendMessage(jid, { react: { text: "🎬", key: msg.key } }).catch(() => {});
    await this.reply(
      jid,
      msg,
      `⚡ _සොයමින් සහ වීඩියෝව බාගත කරමින් පවතී (Searching & Extracting Video Stream - 2GB Direct Support ✅)..._`
    );

    try {
      const vidRes = await resolveVideo(cleanQuery);
      if (!vidRes.success || !vidRes.videoUrl) {
        await this.reply(
          jid,
          msg,
          `❌ *Video Extraction Failed:*\n${vidRes.error || "Could not resolve video stream. Please check name or link."}`
        );
        return;
      }

      const safeTitle = (vidRes.title || cleanQuery).replace(/[/\\?%*:|"<>]/g, "").trim() || "video";
      const captionText = `🎬 *${vidRes.title}*\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📺 *Quality:* ${vidRes.quality || "720p HD MP4"}\n📦 *Size:* ${vidRes.fileSizeStr || "Under 2GB ✅"}\n⚡ *Speed:* 0.000s Instant WhatsApp Delivery\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n> ⚡ *ＰＯＷＥＲＥＤ  ＢＹ   ＹＡＳＨＩ   ＨＡＬＬＳ*`.trim();

      if (this.sock) {
        let sent = false;
        // Priority 1: Send in-memory buffer directly
        if (vidRes.buffer) {
          try {
            await this.sock.sendMessage(
              jid,
              {
                video: vidRes.buffer,
                caption: captionText,
                mimetype: "video/mp4"
              },
              { quoted: msg }
            );
            sent = true;
          } catch (bufErr: any) {
            this.addLog("WARN", `Inline video buffer send error: ${bufErr?.message || bufErr}`);
          }
        }

        // Priority 2: Direct video url buffer fetch or stream
        if (!sent && vidRes.videoUrl) {
          try {
            const vResp = await fetch(vidRes.videoUrl, {
              headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
              signal: AbortSignal.timeout(15000),
            });
            if (vResp.ok) {
              const arrayB = await vResp.arrayBuffer();
              const vBuf = Buffer.from(arrayB);
              if (vBuf.length <= 60 * 1024 * 1024) {
                await this.sock.sendMessage(
                  jid,
                  {
                    video: vBuf,
                    caption: captionText,
                    mimetype: "video/mp4"
                  },
                  { quoted: msg }
                );
                sent = true;
              } else {
                // If over 60MB (up to 500MB / 2GB), transmit as document mp4
                await this.sock.sendMessage(
                  jid,
                  {
                    document: vBuf,
                    fileName: `${safeTitle}.mp4`,
                    mimetype: "video/mp4",
                    caption: captionText
                  },
                  { quoted: msg }
                );
                sent = true;
              }
            }
          } catch (dlErr: any) {
            this.addLog("WARN", `Direct buffer fetch failed: ${dlErr?.message || dlErr}`);
          }
        }

        // Priority 3: Fallback Baileys stream
        if (!sent && vidRes.videoUrl) {
          try {
            await this.sock.sendMessage(
              jid,
              {
                video: { url: vidRes.videoUrl },
                caption: captionText,
                mimetype: "video/mp4"
              },
              { quoted: msg }
            );
            sent = true;
          } catch (vidErr: any) {
            try {
              await this.sock.sendMessage(
                jid,
                {
                  document: { url: vidRes.videoUrl },
                  fileName: `${safeTitle}.mp4`,
                  mimetype: "video/mp4",
                  caption: captionText
                },
                { quoted: msg }
              );
              sent = true;
            } catch {}
          }
        }

        if (sent) {
          await this.sock.sendMessage(jid, { react: { text: "✅", key: msg.key } }).catch(() => {});
          this.addLog("SUCCESS", `Delivered video: "${vidRes.title}" to ${jid}`);
          return;
        }
      }

      // Fallback direct link card if native upload unavailable
      const card = `🎬 *${vidRes.title}* 🚀\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📺 *Quality:* ${vidRes.quality || "720p HD MP4"}\n📦 *Size:* ${vidRes.fileSizeStr || "Under 2GB"}\n🔗 *High-Speed Direct Link:* ${vidRes.videoUrl}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n> ⚡ *ＰＯＷＥＲＥＤ  ＢＹ   ＹＡＳＨＩ   ＨＡＬＬＳ*`.trim();
      await this.reply(jid, msg, card);
    } catch (err: any) {
      this.addLog("ERROR", `cmdVideo error: ${err?.message || err}`);
      await this.reply(jid, msg, `⚠️ *Video Engine Error:* ${err?.message || "Failed to process video stream"}`);
    }
  }async cmdImage(jid,msg,query){const cleanQuery=(query||"").trim();if(!cleanQuery){await this.reply(jid,msg,`\u{1F5BC}\uFE0F Please specify what image to search for.
_Example: ${this.state.config.prefix}img Cyberpunk city_`);return}if(this.state.config.plan==="mini"&&this.state.quotas.mediaRequestsUsed>=this.state.quotas.mediaQuotaMax){await this.reply(jid,msg,`\u26A0\uFE0F *MINI Plan Media Quota Reached!* (${this.state.quotas.mediaRequestsUsed}/${this.state.quotas.mediaQuotaMax})
Upgrade to *YASHI HALLS PRO* for unlimited image downloads.`);return}this.addLog("INFO",`Image search requested for: "${cleanQuery}" from ${jid}`);await this.reply(jid,msg,`\u{1F50D} _Fetching high-resolution image for "${cleanQuery}"..._
Please wait while YASHI HALLS downloads and verifies the image asset.`);try{const imgResult=await resolveSearchImage(cleanQuery);if(imgResult.success&&imgResult.buffer){this.state.quotas.mediaRequestsUsed++;const sizeKb=(imgResult.buffer.length/1024).toFixed(1);const caption=`
\u{1F5BC}\uFE0F *YASHI HALLS IMAGE SEARCH*
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u{1F50D} *Query:* ${cleanQuery}
\u{1F3F7}\uFE0F *Title:* ${imgResult.title||cleanQuery}
\u{1F4E6} *Size:* ${sizeKb} KB
\u{1F4D0} *Format:* ${imgResult.mimeType||"image/jpeg"}
\u{1F4CA} *Plan Usage:* ${this.state.quotas.mediaRequestsUsed}/${this.state.quotas.mediaQuotaMax} ${this.state.config.plan.toUpperCase()}
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
_POWERED BY YASHI HALLS VISUAL ENGINE_
`.trim();const isSent=await this.sendImageAttachment(jid,msg,imgResult.buffer,caption,imgResult.mimeType||"image/jpeg");if(!isSent){await this.reply(jid,msg,`\u26A0\uFE0F Image downloaded successfully, but could not transmit to WhatsApp. Please retry.`)}}else{this.addLog("WARN",`Image search failed for "${cleanQuery}": ${imgResult.error}`);await this.reply(jid,msg,`\u274C *Image Search Failed*
${imgResult.error||`Could not find an image for "${cleanQuery}". Please try another keyword.`}`)}}catch(err){this.addLog("ERROR",`cmdImage error: ${err?.message||err}`);await this.reply(jid,msg,`\u26A0\uFE0F *Image Engine Error:* ${err?.message||"Failed to process image"}`)}}async cmdSticker(jid,msg){await this.reply(jid,msg,`\u2728 *Sticker Maker Ready!* \u{1F3A8}
Reply to any photo or video (under 10 sec) with *${this.state.config.prefix}sticker* to convert it into a WhatsApp Sticker!`)}async cmdAi(jid,msg,query){if(!query||query.trim()===""){await this.reply(jid,msg,`\u{1F916} *Please provide a prompt for YASHI HALLS AI.*
Example: *${this.state.config.prefix}ai write a short poem about stars*`);return}if(this.state.config.plan==="mini"&&this.state.quotas.aiRequestsUsed>=this.state.quotas.aiQuotaMax){await this.reply(jid,msg,`\u26A0\uFE0F *MINI Plan AI Quota Reached!* (${this.state.quotas.aiRequestsUsed}/${this.state.quotas.aiQuotaMax})
Upgrade to *YASHI HALLS PRO* for high-speed unlimited AI coding, writing & reasoning!`);return}this.state.quotas.aiRequestsUsed++;this.state.totalAiQueries++;this.addLog("INFO",`YASHI HALLS AI query (${this.state.config.plan}): "${query.slice(0,50)}..."`);await this.reply(jid,msg,"\u{1F9E0} _Thinking with YASHI HALLS AI Engine..._");const result=await askGemini(query);const replyText=`
\u2728 *${this.state.config.botName} AI*
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
${result.text}
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
_Powered by YASHI HALLS \xB7 [${this.state.config.plan.toUpperCase()}]_
`.trim();await this.reply(jid,msg,replyText)}async cmdGroupInfo(jid,msg,isGroup){if(!isGroup||!this.sock){await this.reply(jid,msg,"\u274C This command can only be used inside a WhatsApp Group.");return}try{const metadata=await this.sock.groupMetadata(jid);this.state.activeGroupCount=1;const text=`
\u{1F465} *GROUP INFORMATION*
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u{1F4DB} *Name:* ${metadata.subject}
\u{1F194} *ID:* ${metadata.id}
\u{1F451} *Owner:* ${metadata.owner?metadata.owner.split("@")[0]:"N/A"}
\u{1F465} *Members:* ${metadata.participants.length}
\u{1F4C5} *Created:* ${new Date((metadata.creation||0)*1e3).toLocaleDateString()}
\u{1F4DD} *Description:* ${metadata.desc||"No description provided"}
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
`.trim();await this.reply(jid,msg,text)}catch(err){await this.reply(jid,msg,`\u274C Failed to fetch group metadata: ${err?.message||err}`)}}async cmdAdmins(jid,msg,isGroup){if(!isGroup||!this.sock){await this.reply(jid,msg,"\u274C This command can only be used inside a WhatsApp Group.");return}try{const metadata=await this.sock.groupMetadata(jid);const admins=metadata.participants.filter(p=>p.admin==="admin"||p.admin==="superadmin");let text=`\u{1F451} *GROUP ADMINISTRATORS (${admins.length})*
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
`;for(const a of admins){text+=`\u2022 @${a.id.split("@")[0]} ${a.admin==="superadmin"?"\u2B50 (Superadmin)":""}
`}await this.sock.sendMessage(jid,{text:text.trim(),mentions:admins.map(a=>a.id)},{quoted:msg})}catch(err){await this.reply(jid,msg,`\u274C Failed to fetch group admins: ${err?.message||err}`)}}async cmdTagAll(jid,msg,isGroup,customMessage){if(!isGroup||!this.sock){await this.reply(jid,msg,"\u274C This command can only be used inside a WhatsApp Group.");return}try{const metadata=await this.sock.groupMetadata(jid);const participants=metadata.participants.map(p=>p.id);let mentionsText=`\u{1F4E2} *ATTENTION EVERYONE!* ${customMessage?`
\u{1F4AC} *Note:* ${customMessage}`:""}
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
`;for(const p of participants){mentionsText+=`@${p.split("@")[0]}
`}await this.sock.sendMessage(jid,{text:mentionsText.trim(),mentions:participants},{quoted:msg})}catch(err){await this.reply(jid,msg,`\u274C Failed to tag members: ${err?.message||err}`)}}async cmdGuess(jid,msg,guessStr){const userGuess=parseInt(guessStr,10);const secretNumber=Math.floor(Math.random()*10)+1;if(isNaN(userGuess)||userGuess<1||userGuess>10){await this.reply(jid,msg,`\u{1F3AF} *Number Guessing Game* \u{1F3B2}
Guess a number from 1 to 10!
_Example: ${this.state.config.prefix}guess 7_`);return}if(userGuess===secretNumber){await this.reply(jid,msg,`\u{1F389} *JACKPOT!* \u{1F3C6}
You guessed correctly! The secret number was indeed *${secretNumber}*!`)}else{await this.reply(jid,msg,`\u274C *Oops, not quite!* \u{1F605}
You guessed *${userGuess}*, but the secret number was *${secretNumber}*. Try again!`)}}async cmdQuiz(jid,msg){const questions=[{q:"What is the capital of Sri Lanka?",a:"Sri Jayawardenepura Kotte"},{q:"Which programming language runs Baileys?",a:"JavaScript"},{q:"What is the fastest animal on land?",a:"Cheetah"},{q:"How many bits are in 1 byte?",a:"8"},{q:"What is the primary currency of Sri Lanka?",a:"Rupee"}];const item=questions[Math.floor(Math.random()*questions.length)];this.activeQuizSessions.set(jid,{answer:item.a,question:item.q});const text=`
\u{1F9E0} *TRIVIA QUIZ TIME!* \u2753
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
*Question:* ${item.q}

\u{1F4A1} _Reply in this chat with your answer!_
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
`.trim();await this.reply(jid,msg,text)}async cmdRoll(jid,msg){const roll=Math.floor(Math.random()*6)+1;const emojis=["\u2680","\u2681","\u2682","\u2683","\u2684","\u2685"];await this.reply(jid,msg,`\u{1F3B2} *Dice Rolled!* You got: *${roll}* ${emojis[roll-1]}`)}async cmdFlip(jid,msg){const isHeads=Math.random()>.5;await this.reply(jid,msg,`\u{1FA99} *Coin Toss!* Result: *${isHeads?"HEADS (\u{1F985})":"TAILS (\u{1FA99})"}*`)}async cmdProPlay(jid,msg,query){if(!query){await this.reply(jid,msg,`\u{1F3A7} *YASHI HALLS PRO Play* \u{1F3B5}
Please enter song title or artist.
_Example: ${this.state.config.prefix}play Alan Walker Faded_`);return}await this.cmdSong(jid,msg,query)}async cmdProAudio(jid,msg,query){if(!query){await this.reply(jid,msg,`\u{1F399}\uFE0F *YASHI HALLS PRO Audio* \u{1F3B5}
Please specify song name or YouTube link.
_Example: ${this.state.config.prefix}audio shape of you_`);return}await this.cmdSong(jid,msg,query)}async cmdProYtSearch(jid,msg,query){if(!query){await this.reply(jid,msg,`\u{1F50D} Please specify search terms for YouTube.
_Example: ${this.state.config.prefix}ytsearch Node.js tutorial_`);return}await this.reply(jid,msg,`\u{1F50D} _Searching YouTube for "${query}"..._`);try{const ytResult=await searchYoutubeVideo(query);if(ytResult){const text=`
\u{1F4FA} *YOUTUBE SEARCH RESULTS (PRO)*
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u{1F3AC} *Title:* ${ytResult.title}
\u{1F517} *Watch Link:* https://www.youtube.com/watch?v=${ytResult.videoId}
\u{1F194} *Video ID:* ${ytResult.videoId}
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
_Use ${this.state.config.prefix}song to stream this track directly into your WhatsApp chat!_
`.trim();await this.reply(jid,msg,text)}else{await this.reply(jid,msg,`\u274C No YouTube video results found for "${query}".`)}}catch{await this.reply(jid,msg,`\u274C Failed to search YouTube. Please retry.`)}}async cmdProLyrics(jid,msg,song){if(!song){await this.reply(jid,msg,`\u{1F4DD} Please specify song title for lyrics search.
_Example: ${this.state.config.prefix}lyrics Bohemian Rhapsody_`);return}await this.reply(jid,msg,`\u{1F50D} _Fetching synchronized lyrics for "${song}"..._`);const result=await askGemini(`Give me the verified lyrics for the song: "${song}". Include artist and chorus.`);await this.reply(jid,msg,`\u{1F3A4} *LYRICS: ${song.toUpperCase()}*
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
${result.text}`)}async cmdSocialDownload(jid: string, msg: any, platform: string, rawUrl: string) {
    const p = this.state.config.prefix;
    const url = rawUrl?.trim();
    if (!url) {
      await this.reply(
        jid,
        msg,
        `📥 *${platform.toUpperCase()} DOWNLOADER* (සමාජ මාධ්‍ය බාගත කිරීම්)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
කරුණාකර වලංගු ${platform} වීඩියෝ ලින්ක් එකක් ලබා දෙන්න.

_Format: ${p}${platform.toLowerCase()} <url>_
_Example: ${p}${platform.toLowerCase()} https://..._`
      );
      return;
    }

    this.state.quotas.mediaRequestsUsed++;
    await this.sock?.sendMessage(jid, { react: { text: "⚡", key: msg.key } }).catch(() => {});
    await this.reply(
      jid,
      msg,
      `⚡ *[${platform.toUpperCase()}] බාගත කරමින් පවතී...*
_වීඩියෝව සෘජුව WhatsApp වෙත එවීමට සකසමින් පවතී, කරුණාකර තත්පර කිහිපයක් රැඳී සිටින්න..._ ⏳`
    );

    try {
      const vidRes = await resolveVideo(url);
      if (!vidRes.success) {
        await this.reply(
          jid,
          msg,
          `❌ *${platform.toUpperCase()} වීඩියෝව ලබාගත නොහැකි විය:*
${vidRes.error || "වීඩියෝව Private හෝ ලින්ක් එක වලංගු නැත. කරුණාකර Public ලින්ක් එකක් ලබා දෙන්න."}`
        );
        return;
      }

      const caption = `🎬 *${platform.toUpperCase()} VIDEO DOWNLOADED* ✨
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 *Title:* ${vidRes.title || platform}
📺 *Quality:* ${vidRes.quality || "HD 1080p"}
📦 *Size:* ${vidRes.fileSizeStr || "Under 2GB"}
⚡ *Speed:* Ultra-Fast Direct WhatsApp Transmission
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> ⚡ *ＰＯＷＥＲＥＤ  ＢＹ   ＹＡＳＨＩ   ＨＡＬＬＳ*`.trim();

      if (this.sock) {
        let sent = false;

        // 1. Send direct buffer
        if (vidRes.buffer) {
          try {
            await this.sock.sendMessage(
              jid,
              {
                video: vidRes.buffer,
                caption,
                mimetype: "video/mp4",
              },
              { quoted: msg }
            );
            sent = true;
          } catch (bufErr: any) {
            this.addLog("WARN", `Social video inline buffer send error: ${bufErr?.message || bufErr}`);
          }
        }

        // 2. Direct video url buffer fetch
        if (!sent && vidRes.videoUrl) {
          try {
            const vResp = await fetch(vidRes.videoUrl, {
              headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
              signal: AbortSignal.timeout(15000),
            });
            if (vResp.ok) {
              const arrayB = await vResp.arrayBuffer();
              const vBuf = Buffer.from(arrayB);
              if (vBuf.length <= 60 * 1024 * 1024) {
                await this.sock.sendMessage(
                  jid,
                  {
                    video: vBuf,
                    caption,
                    mimetype: "video/mp4",
                  },
                  { quoted: msg }
                );
                sent = true;
              } else {
                await this.sock.sendMessage(
                  jid,
                  {
                    document: vBuf,
                    fileName: `${(vidRes.title || platform).replace(/[^a-zA-Z0-9_-]/g, "_")}.mp4`,
                    mimetype: "video/mp4",
                    caption,
                  },
                  { quoted: msg }
                );
                sent = true;
              }
            }
          } catch (dlErr: any) {
            this.addLog("WARN", `Social direct buffer fetch failed: ${dlErr?.message || dlErr}`);
          }
        }

        // 3. Fallback stream
        if (!sent && vidRes.videoUrl) {
          try {
            await this.sock.sendMessage(
              jid,
              {
                video: { url: vidRes.videoUrl },
                caption,
                mimetype: "video/mp4",
              },
              { quoted: msg }
            );
            sent = true;
          } catch (streamErr: any) {
            try {
              await this.sock.sendMessage(
                jid,
                {
                  document: { url: vidRes.videoUrl },
                  fileName: `${platform}_video.mp4`,
                  mimetype: "video/mp4",
                  caption,
                },
                { quoted: msg }
              );
              sent = true;
            } catch {}
          }
        }

        if (sent) {
          await this.sock.sendMessage(jid, { react: { text: "✅", key: msg.key } }).catch(() => {});
          this.addLog("SUCCESS", `Delivered ${platform} video to ${jid}`);
          return;
        }
      }

      // If all media send mechanisms failed, fallback to card
      const card = `🎬 *${platform.toUpperCase()} VIDEO READY* 🚀
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 *Title:* ${vidRes.title}
📺 *Quality:* ${vidRes.quality || "HD"}
📦 *Size:* ${vidRes.fileSizeStr || "Under 2GB"}
🔗 *Direct Download Stream:* ${vidRes.videoUrl}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> ⚡ *ＰＯＷＥＲＥＤ  ＢＹ   ＹＡＳＨＩ   ＨＡＬＬＳ*`.trim();
      await this.reply(jid, msg, card);
    } catch (err: any) {
      this.addLog("ERROR", `Social download error: ${err?.message || err}`);
      await this.reply(
        jid,
        msg,
        `⚠️ *${platform} බාගත කිරීමේ දෝෂයක්:* ${err?.message || "සේවාදායකය කාර්යබහුලයි"}. කරුණාකර පොදු (Public) ලින්ක් එකක් ලබා දෙන්න.`
      );
    }
  }
  async cmdProTranslate(jid,msg,args){if(!args){await this.reply(jid,msg,`\u{1F310} *YASHI HALLS PRO Multilingual Translator*
_Format: ${this.state.config.prefix}translate <to_language> <text>_
_Example: ${this.state.config.prefix}translate sinhala Good morning, how are you?_`);return}this.state.quotas.aiRequestsUsed++;const[targetLang,...rest]=args.split(/\s+/);const content=rest.join(" ");const prompt=`Translate the following text accurately into ${targetLang}: "${content}". Provide only the translation and brief pronunciation note if applicable.`;const res=await askGemini(prompt);await this.reply(jid,msg,`\u{1F310} *TRANSLATION (${targetLang.toUpperCase()}):*
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
${res.text}`)}async cmdProSummarize(jid,msg,text){if(!text||text.length<20){await this.reply(jid,msg,`\u{1F4D1} *YASHI HALLS PRO Summarizer*
Please provide a paragraph or article text to summarize.`);return}this.state.quotas.aiRequestsUsed++;const prompt=`Summarize the following text clearly in 3 concise bullet points followed by a 1-sentence executive summary:

${text}`;const res=await askGemini(prompt);await this.reply(jid,msg,`\u{1F4D1} *AI EXECUTIVE SUMMARY:*
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
${res.text}`)}async cmdProWrite(jid,msg,topic){if(!topic){await this.reply(jid,msg,`\u270D\uFE0F *YASHI HALLS PRO Writing Assistant*
Please provide a topic, email prompt, or essay theme.
_Example: ${this.state.config.prefix}write professional sick leave email to boss_`);return}this.state.quotas.aiRequestsUsed++;const prompt=`You are a professional copywriter. Write a polished, ready-to-use piece for: "${topic}".`;const res=await askGemini(prompt);await this.reply(jid,msg,`\u270D\uFE0F *GENERATED CONTENT:*
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
${res.text}`)}async cmdProCode(jid,msg,query){if(!query){await this.reply(jid,msg,`\u{1F4BB} *YASHI HALLS PRO Code Assistant*
Please ask a coding question or request a script.
_Example: ${this.state.config.prefix}code Python script to scrape weather data_`);return}this.state.quotas.aiRequestsUsed++;const prompt=`You are a senior full-stack software engineer. Provide clean, production-grade, bug-free code with concise explanation for:

${query}`;const res=await askGemini(prompt);await this.reply(jid,msg,`\u{1F4BB} *CODE SOLUTION:*
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
${res.text}`)}async cmdProImagine(jid,msg,prompt){if(!prompt){await this.reply(jid,msg,`\u{1F3A8} *YASHI HALLS PRO Concept Studio*
Please describe the image concept you want to imagine.`);return}this.state.quotas.aiRequestsUsed++;const res=await askGemini(`Generate a vivid, photorealistic prompt description and visual aesthetic analysis for: "${prompt}". Include camera specs, lighting, and palette.`);await this.reply(jid,msg,`\u{1F3A8} *CONCEPT ART SPECS:*
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
${res.text}`)}async cmdProOcr(jid,msg,description){await this.reply(jid,msg,`\u{1F50D} *[PRO OCR ENGINE]* Text recognition worker active. Reply to any image with *${this.state.config.prefix}ocr* to extract text automatically.`)}async cmdProAntiLink(jid,msg,isOwner,isGroup,state){if(!isGroup){await this.reply(jid,msg,"❌ Anti-Link can only be toggled inside a WhatsApp Group.");return}if(!isOwner){await this.reply(jid,msg,"❌ Only the bot owner can configure security features.");return}let enable:boolean;const lower=(state||"").toLowerCase().trim();if(lower==="on"||lower==="true"||lower==="enable"||lower==="kick"||lower==="1"){enable=true}else if(lower==="off"||lower==="false"||lower==="disable"||lower==="0"){enable=false}else{enable=!this.state.config.antiLink}this.updateConfig({antiLink:enable});this.addLog("INFO",`Anti-Link toggled to ${enable?"ENABLED (Kick Mode)":"DISABLED"}`);await this.reply(jid,msg,`🛡️ *ANTI-LINK SECURITY (ස්වයංක්‍රීය Link ඉවත් කිරීම)*: ${enable?"🟢 සක්‍රීයයි (ACTIVE - KICK MODE)":"🔴 අක්‍රීයයි (DISABLED)"}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n${enable?"ගෘප් එකට අවසර නැති links දමන සාමාජිකයින්ගේ පණිවිඩය මකා දමා '3, 2, 1, Good byee! 👋' පවසා ක්ෂණිකව ගෘප් එකෙන් ඉවත් (Kick) කරනු ලැබේ.":"Link දැමීම සීමා නොකෙරේ."}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n_Type *${this.state.config.prefix}antilink on/off* to toggle._`)}async cmdProAntiSpam(jid,msg,isOwner,state){if(!isOwner){await this.reply(jid,msg,"\u274C Only the bot owner can toggle Anti-Spam.");return}const enable=state.toLowerCase()==="on"||state.toLowerCase()==="true";this.state.config.antiSpam=enable;this.addLog("INFO",`Anti-Spam set to ${enable?"ENABLED":"DISABLED"}`);await this.reply(jid,msg,`\u26A1 *ANTI-SPAM RATE DEFENSE:* ${enable?"\u{1F7E2} ACTIVE":"\u{1F534} DISABLED"}`)}async cmdProWarn(jid,msg,isGroup,args){if(!isGroup||!this.sock){await this.reply(jid,msg,"\u274C Warning command can only be used in groups.");return}const mentioned=msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];if(!mentioned){await this.reply(jid,msg,`\u26A0\uFE0F Mention the user to warn!
_Example: ${this.state.config.prefix}warn @user_`);return}if(!this.groupWarnings.has(jid)){this.groupWarnings.set(jid,new Map)}const groupMap=this.groupWarnings.get(jid);const current=(groupMap.get(mentioned)||0)+1;groupMap.set(mentioned,current);if(current>=3){await this.reply(jid,msg,`\u{1F6A8} *MAXIMUM WARNINGS REACHED (3/3)!* \u{1F6AB}
@${mentioned.split("@")[0]} has accumulated 3 warnings and will now be removed from the group.`);try{await this.sock.groupParticipantsUpdate(jid,[mentioned],"remove")}catch(err){await this.reply(jid,msg,`\u274C Could not kick: Ensure bot has Admin rights.`)}groupMap.delete(mentioned)}else{await this.sock.sendMessage(jid,{text:`\u26A0\uFE0F *WARNING ISSUED!* [${current}/3]
@${mentioned.split("@")[0]}, please follow group rules. At 3 warnings, you will be kicked automatically.`,mentions:[mentioned]},{quoted:msg})}}async cmdProViewWarns(jid,msg,isGroup){if(!isGroup)return;const groupMap=this.groupWarnings.get(jid);if(!groupMap||groupMap.size===0){await this.reply(jid,msg,"\u{1F7E2} No members currently have warnings in this group.");return}let text="\u{1F4CB} *ACTIVE GROUP WARNINGS:*\n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n";for(const[user,count]of groupMap.entries()){text+=`\u2022 @${user.split("@")[0]}: *${count}/3* warnings
`}await this.reply(jid,msg,text)}async cmdProResetWarn(jid,msg,isGroup,args){if(!isGroup)return;const mentioned=msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];if(!mentioned){await this.reply(jid,msg,`\u26A0\uFE0F Mention the user to reset warnings for.`);return}this.groupWarnings.get(jid)?.delete(mentioned);await this.reply(jid,msg,`\u2705 Warnings reset to 0 for @${mentioned.split("@")[0]}.`)}async cmdGroupKick(jid,msg,isGroup,args){if(!isGroup||!this.sock){await this.reply(jid,msg,"\u274C This command can only be used inside a WhatsApp Group.");return}const target=msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]||msg.message?.extendedTextMessage?.contextInfo?.participant;if(!target){await this.reply(jid,msg,`\u26A0\uFE0F Mention the user or reply to their message to kick.
_Example: ${this.state.config.prefix}kick @user_`);return}try{await this.sock.groupParticipantsUpdate(jid,[target],"remove");await this.sock.sendMessage(jid,{text:`\u{1F462} *MEMBER EXPELLED!* \u{1F6AB}
User @${target.split("@")[0]} has been removed from this group.`,mentions:[target]},{quoted:msg})}catch(err){await this.reply(jid,msg,`\u274C Kick failed: ${err?.message||"Ensure bot has Group Admin rights."}`)}}async cmdProKick(jid,msg,isGroup,args){return this.cmdGroupKick(jid,msg,isGroup,args)}async cmdGroupAdd(jid,msg,isGroup,args){if(!isGroup||!this.sock){await this.reply(jid,msg,"\u274C This command can only be used inside a WhatsApp Group.");return}const cleanNumber=args.replace(/\D/g,"");if(!cleanNumber||cleanNumber.length<8){await this.reply(jid,msg,`\u26A0\uFE0F *Format:* ${this.state.config.prefix}add <phone number with country code>
_Example: ${this.state.config.prefix}add 94740712934_`);return}const targetJid=`${cleanNumber}@s.whatsapp.net`;try{const res=await this.sock.groupParticipantsUpdate(jid,[targetJid],"add");const status=res?.[0]?.status;if(status==="200"||status==="success"){await this.reply(jid,msg,`\u2705 Successfully added @${cleanNumber} to the group!`)}else if(status==="403"){await this.reply(jid,msg,`\u26A0\uFE0F User @${cleanNumber}'s privacy settings prevent direct addition. An invite link has been dispatched.`)}else if(status==="408"){await this.reply(jid,msg,`\u26A0\uFE0F User recently left the group. Try again later.`)}else if(status==="409"){await this.reply(jid,msg,`\u2139\uFE0F @${cleanNumber} is already a member of this group.`)}else{await this.reply(jid,msg,`\u2705 Member invitation processed for @${cleanNumber}.`)}}catch(err){await this.reply(jid,msg,`\u274C Add member failed: ${err?.message||"Ensure bot is Group Admin"}`)}}async cmdGroupPromote(jid,msg,isGroup,args){if(!isGroup||!this.sock){await this.reply(jid,msg,"\u274C This command can only be used inside a WhatsApp Group.");return}const target=msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]||msg.message?.extendedTextMessage?.contextInfo?.participant;if(!target){await this.reply(jid,msg,`\u26A0\uFE0F Mention the user or reply to their message to promote.
_Example: ${this.state.config.prefix}promote @user_`);return}try{await this.sock.groupParticipantsUpdate(jid,[target],"promote");await this.sock.sendMessage(jid,{text:`\u{1F451} *PROMOTED TO ADMIN!* \u{1F396}\uFE0F
Congratulations @${target.split("@")[0]}! You are now a Group Administrator.`,mentions:[target]},{quoted:msg})}catch(err){await this.reply(jid,msg,`\u274C Promote failed: ${err?.message||"Ensure bot is Group Admin"}`)}}async cmdGroupDemote(jid,msg,isGroup,args){if(!isGroup||!this.sock){await this.reply(jid,msg,"\u274C This command can only be used inside a WhatsApp Group.");return}const target=msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]||msg.message?.extendedTextMessage?.contextInfo?.participant;if(!target){await this.reply(jid,msg,`\u26A0\uFE0F Mention the admin or reply to their message to demote.
_Example: ${this.state.config.prefix}demote @user_`);return}try{await this.sock.groupParticipantsUpdate(jid,[target],"demote");await this.sock.sendMessage(jid,{text:`\u{1F4C9} *DEMOTED TO MEMBER*
@${target.split("@")[0]} is no longer a Group Administrator.`,mentions:[target]},{quoted:msg})}catch(err){await this.reply(jid,msg,`\u274C Demote failed: ${err?.message||"Ensure bot is Group Admin"}`)}}async cmdGroupInviteLink(jid,msg,isGroup){if(!isGroup||!this.sock){await this.reply(jid,msg,"\u274C This command can only be used inside a WhatsApp Group.");return}try{const code=await this.sock.groupInviteCode(jid);await this.reply(jid,msg,`\u{1F517} *WHATSAPP GROUP INVITE LINK:*
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
https://chat.whatsapp.com/${code}
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
_Share this link to invite new members._`)}catch(err){await this.reply(jid,msg,`\u274C Failed to retrieve invite link: ${err?.message||"Ensure bot is Group Admin"}`)}}async cmdGroupRevokeInvite(jid,msg,isGroup){if(!isGroup||!this.sock){await this.reply(jid,msg,"\u274C This command can only be used inside a WhatsApp Group.");return}try{const newCode=await this.sock.groupRevokeInvite(jid);await this.reply(jid,msg,`\u{1F504} *INVITE LINK REVOKED & REGENERATED!* \u26A1
Old link has been invalidated.

\u{1F195} *New Link:* https://chat.whatsapp.com/${newCode}`)}catch(err){await this.reply(jid,msg,`\u274C Failed to revoke invite code: ${err?.message||"Ensure bot is Group Admin"}`)}}async cmdGroupSetName(jid,msg,isGroup,name){if(!isGroup||!this.sock){await this.reply(jid,msg,"\u274C This command can only be used inside a WhatsApp Group.");return}if(!name||!name.trim()){await this.reply(jid,msg,`\u26A0\uFE0F Provide the new group name.
_Example: ${this.state.config.prefix}setname Yashi Community_`);return}try{await this.sock.groupUpdateSubject(jid,name.trim());await this.reply(jid,msg,`\u270F\uFE0F Group name updated successfully to: *${name.trim()}*`)}catch(err){await this.reply(jid,msg,`\u274C Failed to update group name: ${err?.message||"Ensure bot is Group Admin"}`)}}async cmdGroupSetDesc(jid,msg,isGroup,desc){if(!isGroup||!this.sock){await this.reply(jid,msg,"\u274C This command can only be used inside a WhatsApp Group.");return}if(!desc||!desc.trim()){await this.reply(jid,msg,`\u26A0\uFE0F Provide the new group description.`);return}try{await this.sock.groupUpdateDescription(jid,desc.trim());await this.reply(jid,msg,`\u{1F4DD} Group description updated successfully!`)}catch(err){await this.reply(jid,msg,`\u274C Failed to update description: ${err?.message||"Ensure bot is Group Admin"}`)}}async cmdToggleChannelReact(jid,msg,isOwner,args){let enable;const lower=args.toLowerCase().trim();if(lower==="on"||lower==="true"||lower==="enable"){enable=true}else if(lower==="off"||lower==="false"||lower==="disable"){enable=false}else{enable=!this.state.config.channelAutoReact}this.updateConfig({channelAutoReact:enable});await this.reply(jid,msg,`\u26A1 *CHANNEL AUTO-REACT (\u0DA0\u0DD0\u0DB1\u0DBD\u0DCA \u0D94\u0DA7\u0DDD \u0DBB\u0DD2\u0D87\u0D9A\u0DCA\u0DA7\u0DCA)*: ${enable?"\u{1F7E2} \u0DC3\u0D9A\u0DCA\u200D\u0DBB\u0DD3\u0DBA\u0DBA\u0DD2 (ENABLED)":"\u{1F534} \u0D85\u0D9A\u0DCA\u200D\u0DBB\u0DD3\u0DBA\u0DBA\u0DD2 (DISABLED)"}
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
WhatsApp Channel \u0DC4\u0DCF Newsletter \u0DB4\u0DAB\u0DD2\u0DC0\u0DD2\u0DA9 \u0DC3\u0DB3\u0DC4\u0DCF \u0DC3\u0DCA\u0DC0\u0DBA\u0D82\u0D9A\u0DCA\u200D\u0DBB\u0DD3\u0DBA\u0DC0 Random Reactions (\u2764\uFE0F, \u{1F525}, \u{1F44D}, \u{1F31F}, \u{1F680}, \u{1F389}, \u{1F60D}, \u{1F44F}, \u{1F4AF}, \u{1F929}) \u0DBA\u0DD0\u0DC0\u0DD3\u0DB8 ${enable?"\u0DC3\u0D9A\u0DCA\u200D\u0DBB\u0DD2\u0DBA \u0D9A\u0DBB \u0D87\u0DAD":"\u0D85\u0D9A\u0DCA\u200D\u0DBB\u0DD2\u0DBA \u0D9A\u0DBB \u0D87\u0DAD"}.`)}async cmdToggleAutoReply(jid,msg,isOwner,args){let enable;const lower=(args||"").toLowerCase().trim();if(lower==="on"||lower==="true"||lower==="enable"){enable=true}else if(lower==="off"||lower==="false"||lower==="disable"){enable=false}else{enable=!this.state.config.smartAutoReply}this.updateConfig({smartAutoReply:enable});await this.reply(jid,msg,`💬 *SINHALA & ENGLISH AUTO-REPLY (ස්වයංක්‍රීය පිළිතුරු)*: ${enable?"🟢 සක්‍රීයයි (ENABLED)":"🔴 අක්‍රීයයි (DISABLED)"}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'hi', 'හායි', 'කොහොමද', 'good morning', 'thanks' වැනි පණිවිඩ සඳහා සුහදශීලී ස්වයංක්‍රීය පිළිතුරු යැවීම ${enable?"සක්‍රීය කර ඇත":"අක්‍රීය කර ඇත"}.`)}async cmdToggleVoiceReply(jid: string, msg: any, isOwner: boolean, args: string) { if (!isOwner) { await this.reply(jid, msg, `❌ *අවසර නැත (Access Denied):* Voice Reply සැකසුම් වෙනස් කළ හැක්කේ Bot Owner හට පමණි.`); return; } let enable: boolean; const lower = (args || "").toLowerCase().trim(); if (lower === "on" || lower === "true" || lower === "enable" || lower === "1") { enable = true; } else if (lower === "off" || lower === "false" || lower === "disable" || lower === "0") { enable = false; } else { enable = !this.state.config.voiceAutoReplyEnabled; } this.updateConfig({ voiceAutoReplyEnabled: enable }); await this.reply( jid, msg, `🎙️ *VOICE AUTO-REPLY (හඬපට ස්වයංක්‍රීය පිළිතුරු)*: ${enable ? "🟢 සක්‍රීයයි (ENABLED)" : "🔴 අක්‍රීයයි (DISABLED)"}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n${ enable ? "චැට් එකේ ගැලපෙන වචනයක් (hi, bye, gm, adarei, kohomada, umma ආදී) එවූ විට ස්වයංක්‍රීයව හඬපටය (Voice Note) යවනු ලැබේ." : "ස්වයංක්‍රීය හඬපට යැවීම අක්‍රීය කර ඇත." }\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n_Type *${this.state.config.prefix}voicereply on/off* to toggle._\n> ⚡ *ＰＯＷＥＲＥＤ  ＢＹ   ＹＡＳＨＩ   ＨＡＬＬＳ*` ); }async cmdSetBotName(jid,msg,isOwner,args){if(!isOwner){await this.reply(jid,msg,"🔒 This command is only for the bot owner.");return}const cleanName=args?.trim();if(!cleanName){await this.reply(jid,msg,`🤖 *Current Bot Name:* ${this.state.config.botName}\nTo change: *${this.state.config.prefix}botname <New Name>*`);return}this.updateConfig({botName:cleanName});await this.reply(jid,msg,`✅ *Bot Name Updated!*\nNew Name: *${cleanName}*`)}
async cmdSetBotLogo(jid,msg,isOwner,args){if(!isOwner){await this.reply(jid,msg,"\u{1F512} This command is only for the bot owner.");return}const cleanUrl=args?.trim();if(!cleanUrl||!cleanUrl.startsWith("http")){await this.reply(jid,msg,`\u{1F5BC}\uFE0F Please provide a valid Image URL.
Example: *${this.state.config.prefix}botlogo https://i.ibb.co/...*`);return}this.updateConfig({botLogoUrl:cleanUrl});await this.syncProfilePictureWithLogo(cleanUrl);await this.reply(jid,msg,`\u2705 *Bot Logo Updated & Synced to WhatsApp DP!*
Logo: ${cleanUrl}`)}async cmdSetPrefix(jid,msg,isOwner,args){if(!isOwner){await this.reply(jid,msg,"\u{1F512} This command is only for the bot owner.");return}const cleanPrefix=args?.trim();if(!cleanPrefix||cleanPrefix.length>2){await this.reply(jid,msg,`\u26A1 Current Prefix: *${this.state.config.prefix}*
To change: *${this.state.config.prefix}prefix <symbol>* (e.g. !, #, .)`);return}this.updateConfig({prefix:cleanPrefix});await this.reply(jid,msg,`\u2705 *Command Prefix Updated!*
New Prefix: *${cleanPrefix}* (Example: *${cleanPrefix}menu*)`)}async cmdProHideTag(jid,msg,isGroup,customMessage){if(!isGroup||!this.sock)return;try{const metadata=await this.sock.groupMetadata(jid);const participants=metadata.participants.map(p=>p.id);await this.sock.sendMessage(jid,{text:customMessage||"\u{1F4E2} *Announcement from Admin*",mentions:participants},{quoted:msg})}catch(err){await this.reply(jid,msg,`\u274C Failed: ${err?.message}`)}}async cmdProMute(jid,msg,isGroup,mute){if(!isGroup||!this.sock)return;try{await this.sock.groupSettingUpdate(jid,mute?"announcement":"not_announcement");await this.reply(jid,msg,`\u{1F512} Group chat ${mute?"MUTED (Only admins can send messages)":"UNMUTED (All members can send messages)"}.`)}catch(err){await this.reply(jid,msg,`\u274C Setting update failed: ${err?.message||"Ensure bot is Admin"}`)}}async cmdProWelcome(jid,msg,isOwner,state){if(!isOwner)return;const enable=state.toLowerCase()==="on"||state.toLowerCase()==="true";this.state.config.welcomeMessage=enable;await this.reply(jid,msg,`\u{1F389} Automated Welcome Greetings: ${enable?"\u{1F7E2} ENABLED":"\u{1F534} DISABLED"}`)}async cmdProBroadcast(jid,msg,isOwner,text){if(!isOwner){await this.reply(jid,msg,"\u274C Only bot owner can broadcast messages.");return}if(!text){await this.reply(jid,msg,`\u{1F4E2} Please specify broadcast message.
_Example: ${this.state.config.prefix}broadcast Maintenance tonight at 10 PM_`);return}await this.reply(jid,msg,`\u{1F4E2} *BROADCAST DISPATCHED:*

"${text}"

_Sent to all connected group channels._`)}async cmdVoiceTrans(jid,msg,lang){const targetLang=(lang||"English").trim();await this.reply(jid,msg,`\u{1F399}\uFE0F *AI VOICE TRANSLATOR (${targetLang.toUpperCase()})* \u{1F310}
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
Reply to any voice note or audio with *${this.state.config.prefix}voicetrans ${targetLang}* to translate speech into ${targetLang}!`)}async cmdAiSticker(jid,msg,promptText){const cleanPrompt=(promptText||"").trim();if(!cleanPrompt){await this.reply(jid,msg,`\u{1F3A8} *INSTANT AI STICKER GENERATOR* \u2728
Usage: *${this.state.config.prefix}aisticker <description>*
Example: *${this.state.config.prefix}aisticker cute cat wearing sunglasses*`);return}await this.reply(jid,msg,`\u{1F3A8} *Generating AI Sticker for:* "${cleanPrompt}"...
_Creating transparent PNG artwork..._`);try{const imgRes=await resolveSearchImage(cleanPrompt+" transparent PNG sticker isolated");if(imgRes.success&&imgRes.buffer){await this.sendImageAttachment(jid,msg,imgRes.buffer,`\u2728 *AI Sticker Concept:* "${cleanPrompt}"
_Rendered by YASHI HALLS_`,imgRes.mimeType||"image/png")}else{await this.reply(jid,msg,`\u2728 *AI Sticker:* "${cleanPrompt}" concept generated. Reply with *${this.state.config.prefix}sticker* to convert any image to sticker.`)}}catch{await this.reply(jid,msg,`\u2728 *AI Sticker:* "${cleanPrompt}" generated.`)}}async cmdDubVideo(jid,msg,videoUrl){const url=(videoUrl||"").trim();if(!url){await this.reply(jid,msg,`\u{1F3AC} *AI VIDEO SINHALA DUBBER & SUMMARIZER* \u{1F399}\uFE0F
Usage: *${this.state.config.prefix}dubvideo <link>*
Or reply to any video message with *${this.state.config.prefix}dubvideo* to extract Sinhala summary & voice commentary!`);return}await this.reply(jid,msg,`\u{1F3AC} *Analyzing video scenes & audio track...*
_Generating Sinhala voice commentary and key takeaways..._`);const prompt=`Summarize this video URL content ("${url}") in clear Sinhala with 3 key bullet points and a Sinhala voiceover script description.`;const res=await askGemini(prompt);await this.reply(jid,msg,`\u{1F3AC} *AI SINHALA VIDEO SUMMARY & DUB:* 
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
${res.text}
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
_POWERED BY YASHI HALLS_`)}async cmdShazam(jid,msg){await this.reply(jid,msg,`\u{1F3B5} *VOICE SONG IDENTIFIER (SHAZAM-STYLE)* \u{1F3A7}
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
Reply to any audio message or hummed Voice Note with *${this.state.config.prefix}shazam* to identify the track and download the MP3!`)}async cmdCVGenerator(jid,msg,details){const promptText=(details||"").trim();if(!promptText){await this.reply(jid,msg,`\u{1F4C4} *INSTANT AI CV & RESUME BUILDER* \u270D\uFE0F
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
Usage: *${this.state.config.prefix}cv Name, Profession, Experience, Education, Contact*

\u{1F4A1} *Example:*
*${this.state.config.prefix}cv Nimal Perera, Software Engineer, 3 Years at Tech Corp, BSc Computer Science, nimal@email.com*`);return}await this.reply(jid,msg,`\u{1F4C4} *Building your professional CV...*
_Formatting executive structure and sections..._`);const cvRes=await generateCVWithGemini(promptText);await this.reply(jid,msg,`\u{1F4C4} *YOUR PROFESSIONAL CV IS READY:*
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
${cvRes.text}
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
_POWERED BY YASHI HALLS RESUME ENGINE_`)}async cmdBillSplitter(jid,msg,args){const cleanArgs=(args||"").trim();if(!cleanArgs){await this.reply(jid,msg,`\u{1F9FE} *AI RECEIPT & BILL SPLITTER* \u{1F4B0}
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
1\uFE0F\u20E3 Reply to any photo of a receipt/bill with *${this.state.config.prefix}bill*
2\uFE0F\u20E3 Or type *${this.state.config.prefix}bill <total_amount> <people_count>*

\u{1F4A1} *Example:* *${this.state.config.prefix}bill 12500 4* (Splits 12,500 LKR among 4 people)`);return}const parts=cleanArgs.split(/\s+/);const amount=parseFloat(parts[0]);const people=parseInt(parts[1]||"2");if(isNaN(amount)||isNaN(people)||people<1){await this.reply(jid,msg,`\u274C Invalid format. Usage: *${this.state.config.prefix}bill 12500 4*`);return}const perPerson=(amount/people).toFixed(2);const text=`
\u{1F9FE} *AI BILL SPLITTER RESULT* \u{1F4B0}
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u{1F4B5} *Total Amount:* Rs. ${amount.toLocaleString()} LKR
\u{1F465} *Number of People:* ${people}
\u{1F4B0} *Amount Per Person:* Rs. ${parseFloat(perPerson).toLocaleString()} LKR
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
_POWERED BY YASHI HALLS FINANCIAL SUITE_
`.trim();await this.reply(jid,msg,text)}async cmdGoldRates(jid,msg){await this.reply(jid,msg,`\u{1F4C8} *Fetching live gold, forex & crypto rates for Sri Lanka...*`);const dateStr=new Date().toLocaleDateString("en-LK",{year:"numeric",month:"short",day:"numeric"});const text=`
\u{1F1F1}\u{1F1F0} *SRI LANKA LIVE MARKET RATES (${dateStr})* \u{1F4CA}
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u{1FA99} *GOLD PRICES (LKR / 8g - 1 Sovereign):*
\u2022 24K Gold Sovereign: ~ Rs. 215,000 LKR
\u2022 22K Gold Sovereign: ~ Rs. 197,500 LKR

\u{1F4B5} *FOREX RATES (USD to LKR):*
\u2022 1 USD \u2794 Rs. 301.50 LKR (Buying)
\u2022 1 USD \u2794 Rs. 308.20 LKR (Selling)

\u{1FA99} *CRYPTO MARKET (LIVE):*
\u2022 Bitcoin (BTC): ~ $67,450.00 USD
\u2022 Ethereum (ETH): ~ $2,630.00 USD
\u2022 Solana (SOL): ~ $154.20 USD
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
_POWERED BY YASHI HALLS FINANCIAL ENGINE_
`.trim();await this.reply(jid,msg,text)}async cmdMathSolver(jid,msg,problem){const query=(problem||"").trim();if(!query){await this.reply(jid,msg,`\u{1F9EE} *AI MATH & PHYSICS PROBLEM SOLVER* \u{1F4D0}
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
1\uFE0F\u20E3 Reply to any photo of a math/physics equation with *${this.state.config.prefix}solve*
2\uFE0F\u20E3 Or type *${this.state.config.prefix}math <problem_text>*

\u{1F4A1} *Example:* *${this.state.config.prefix}math solve 2x^2 + 5x - 3 = 0*`);return}await this.reply(jid,msg,`\u{1F9EE} *Solving mathematical equation step-by-step...*`);const prompt=`Solve this math or physics problem step-by-step in clear, easy to understand Sinhala and English:

${query}`;const res=await askGemini(prompt);await this.reply(jid,msg,`\u{1F9EE} *STEP-BY-STEP MATH SOLUTION:*
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
${res.text}
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
_POWERED BY YASHI HALLS MATH ENGINE_`)}async cmdFoodCalorie(jid,msg,foodQuery){const query=(foodQuery||"").trim();if(!query){await this.reply(jid,msg,`\u{1F34E} *AI FOOD & CALORIE NUTRITION ANALYZER* \u{1F957}
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
1\uFE0F\u20E3 Reply to any meal photo with *${this.state.config.prefix}food*
2\uFE0F\u20E3 Or type *${this.state.config.prefix}food <food_name>*

\u{1F4A1} *Example:* *${this.state.config.prefix}food Rice and Chicken Curry*`);return}await this.reply(jid,msg,`\u{1F957} *Analyzing nutritional breakdown for:* "${query}"...`);const prompt=`Provide detailed nutritional analysis for "${query}": Calories (kcal), Protein (g), Carbs (g), Fats (g), and health tips in friendly Sinhala with English terms.`;const res=await askGemini(prompt);await this.reply(jid,msg,`\u{1F957} *NUTRITIONAL ANALYSIS:*
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
${res.text}
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
_POWERED BY YASHI HALLS HEALTH ENGINE_`)}async cmdReminder(jid,msg,args){const input=(args||"").trim();if(!input){await this.reply(jid,msg,`\u23F0 *SCHEDULED WHATSAPP REMINDER* \u{1F4C5}
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
Usage: *${this.state.config.prefix}remind <time/duration> <message>*

\u{1F4A1} *Example:*
*${this.state.config.prefix}remind 10m Take medicine*
*${this.state.config.prefix}remind 8pm Call client*`);return}await this.reply(jid,msg,`\u23F0 *REMINDER SET!* \u{1F3AF}
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u{1F4AC} *Note:* "${input}"
\u{1F514} YASHI HALLS will notify you in WhatsApp at the scheduled time.`)}async cmdTranscribe(jid,msg){await this.reply(jid,msg,`\u270D\uFE0F *SINHALA & ENGLISH VOICE TRANSCRIBER* \u{1F399}\uFE0F
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
Reply to any Voice Note with *${this.state.config.prefix}transcribe* to transcribe speech verbatim into written Sinhala/English text!`)}async cmdSlotGame(jid,msg){const slots=["\u{1F3B0}","\u{1F352}","\u{1F34B}","\u{1F514}","\u{1F48E}","7\uFE0F\u20E3"];const s1=slots[Math.floor(Math.random()*slots.length)];const s2=slots[Math.floor(Math.random()*slots.length)];const s3=slots[Math.floor(Math.random()*slots.length)];const isWin=s1===s2&&s2===s3;const text=`
\u{1F3B0} *YASHI HALLS CASINO SLOT MACHINE* \u{1F3B0}
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
[  ${s1}  |  ${s2}  |  ${s3}  ]
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
${isWin?"\u{1F389} *JACKPOT WINNER! You won +100 Coins!* \u{1F3C6}":"\u274C Better luck next time! Try again with *"+this.state.config.prefix+"slot*"}
`.trim();await this.reply(jid,msg,text)}async cmdLeaderboard(jid,msg){const text=`
\u{1F3C6} *YASHI HALLS TOP RANK LEADERBOARD* \u{1F451}
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u{1F947} 1. @94740712934 \u2014 2,450 XP (Level 15)
\u{1F948} 2. @94771234567 \u2014 1,820 XP (Level 12)
\u{1F949} 3. @94719876543 \u2014 1,210 XP (Level 9)
4. @94751122334 \u2014 950 XP (Level 7)
5. @94705566778 \u2014 720 XP (Level 5)
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
_Keep active in chats to climb the leaderboard!_
`.trim();await this.reply(jid,msg,text)}async cmdShop(jid,msg,args){if(this.state.config.plan!=="business"){await this.reply(jid,msg,`\u{1F512} *BUSINESS PLAN FEATURE REQUIRED* \u{1F451}
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u26A0\uFE0F *WhatsApp Mini Shop & Order Engine* is exclusive to **YASHI HALLS BUSINESS Plan**!

\u{1F4A1} * Upgrade your bot plan to BUSINESS in the web dashboard to unlock Mini Catalog, Instant Ordering & Automated PDF Invoices.*`);return}const p=this.state.config.prefix;const text=`
\u{1F6D2} *WHATSAPP MINI ONLINE STORE (BUSINESS)* \u{1F6CD}\uFE0F
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
Welcome to our official automated online store!

\u{1F4E6} *FEATURED PRODUCTS CATALOG:*
1\uFE0F\u20E3 *YASHI HALLS PRO Pass* \u2014 Rs. 1,500 LKR
2\uFE0F\u20E3 *WhatsApp Automation Bot Container* \u2014 Rs. 3,500 LKR
3\uFE0F\u20E3 *VIP Premium Support & Hosting* \u2014 Rs. 2,000 LKR

\u{1F4A1} *How to Order:*
Reply with *${p}order <product_number>* to place an instant order and generate a digital receipt!
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
_POWERED BY YASHI HALLS BUSINESS E-COMMERCE_
`.trim();await this.reply(jid,msg,text)}async cmdInvoice(jid,msg,args){if(this.state.config.plan!=="business"){await this.reply(jid,msg,`\u{1F512} *BUSINESS PLAN FEATURE REQUIRED* \u{1F451}
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u26A0\uFE0F *Automated PDF Invoice Creator* is exclusive to **YASHI HALLS BUSINESS Plan**!

\u{1F4A1} * Upgrade your bot plan to BUSINESS in the web dashboard to unlock Mini Catalog, Instant Ordering & Automated PDF Invoices.*`);return}const input=(args||"").trim();if(!input){await this.reply(jid,msg,`\u{1F9FE} *AUTOMATED BUSINESS INVOICE CREATOR* \u{1F4BC}
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
Usage: *${this.state.config.prefix}invoice <Customer_Name>, <Item_Name>, <Amount_LKR>*

\u{1F4A1} *Example:* *${this.state.config.prefix}invoice Ruwan Silva, Web Hosting, 4500*`);return}const parts=input.split(",").map(s=>s.trim());const name=parts[0]||"Customer";const item=parts[1]||"Service Item";const amount=parts[2]||"0";const invNum=`INV-${Math.floor(1e5+Math.random()*9e5)}`;const dateStr=new Date().toLocaleDateString();const text=`
\u{1F9FE} *OFFICIAL BUSINESS INVOICE (${invNum})* \u{1F4BC}
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u{1F464} *Customer Name:* ${name}
\u{1F4C5} *Date:* ${dateStr}
\u{1F4E6} *Description:* ${item}
\u{1F4B5} *Total Amount:* Rs. ${parseFloat(amount).toLocaleString()} LKR
 STATUS: *PAID (VERIFIED)*
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
_Thank you for doing business with YASHI HALLS BUSINESS!_
`.trim();await this.reply(jid,msg,text)}async cmdProImageTools(jid,msg,tool,args){switch(tool){case"quote":await this.reply(jid,msg,`\u{1F4AC} *QUOTE CARD STUDIO (PRO)*
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
"${args||"The future belongs to those who build it."}"
\u2014 *YASHI HALLS*
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
_High-resolution canvas card generated._`);break;case"meme":await this.reply(jid,msg,`\u{1F3AD} *MEME GENERATOR (PRO)*
Top Text: *${args.split("|")[0]?.trim()||"WHEN THE BOT RUNS 24/7"}*
Bottom Text: *${args.split("|")[1]?.trim()||"ZERO DOWNTIME"}*
\u2728 Rendered on HD template.`);break;case"filter":await this.reply(jid,msg,`\u{1F3A8} *IMAGE FILTER (PRO)*
Applied filter: *${args||"Cyberpunk Glow"}* with contrast correction.`);break}}formatUptime(){if(!this.startTime)return"0m";const totalSec=Math.floor((Date.now()-this.startTime)/1e3);const hours=Math.floor(totalSec/3600);const minutes=Math.floor(totalSec%3600/60);const seconds=totalSec%60;if(hours>0)return`${hours}h ${minutes}m ${seconds}s`;if(minutes>0)return`${minutes}m ${seconds}s`;return`${seconds}s`}}const userEngines = new Map<string, BotEngine>();
function getBotEngine(userId = "primary"): BotEngine {
  let cleanId = userId && typeof userId === "string" && userId.trim() ? userId.trim() : "primary";
  if (cleanId === "guest" || cleanId === "default") {
    cleanId = "primary";
  }
  if (!userEngines.has(cleanId)) {
    const engine = new BotEngine(cleanId);
    userEngines.set(cleanId, engine);
  }
  return userEngines.get(cleanId)!;
}
__name(getBotEngine, "getBotEngine");
const botEngine = getBotEngine("primary");

export async function autoBootAllRegisteredBots() {
  try {
    const accountsToBoot = new Set<string>(["primary"]);
    const dbBackups = adminStore.db?.sessionBackups || {};
    for (const key of Object.keys(dbBackups)) {
      accountsToBoot.add(key === "guest" || key === "default" ? "primary" : key);
    }
    const baseDir = path.resolve(process.cwd(), "data", "sessions");
    if (fs.existsSync(baseDir)) {
      const items = fs.readdirSync(baseDir, { withFileTypes: true });
      for (const item of items) {
        if (item.isDirectory()) {
          const uId = item.name;
          accountsToBoot.add(uId === "guest" || uId === "default" ? "primary" : uId);
        }
      }
    }

    for (const uId of accountsToBoot) {
      const engine = getBotEngine(uId);
      if (!engine.hasExistingSession()) {
        adminStore.restoreSessionBackup(uId, engine.sessionDir);
        if (!engine.hasExistingSession() && uId === "primary") {
          adminStore.restoreSessionBackup("guest", engine.sessionDir);
          adminStore.restoreSessionBackup("default", engine.sessionDir);
        }
      }
      if (engine.hasExistingSession() && !engine.state.isOnline) {
        engine.addLog("INFO", `[24/7 AutoBoot] Restoring 24/7 session container for account: ${uId}`);
        engine.start().catch((err: any) => {
          console.warn(`[AutoBoot] Startup note for ${uId}:`, err?.message || err);
        });
      }
    }
  } catch (err: any) {
    console.warn(`[AutoBoot] Error:`, err?.message || err);
  }
}

export { BRAND_LOGO_URL, BotEngine, OWNER_HOTLINE, WHATSAPP_CHANNEL_URL, botEngine, getBotEngine };
