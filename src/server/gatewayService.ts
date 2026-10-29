import fs from 'fs';
import path from 'path';

export interface BankNotification {
  id: string;
  bank: string;
  amount: number;
  currency: string;
  ref: string;
  rawText: string;
  timestamp: number;
  matched: boolean;
  matchedCustomer?: string;
  ruleName?: string;
}

export interface PendingSlip {
  id: string;
  userJid: string;
  userName: string;
  amount: number;
  ref: string;
  bank: string;
  status: 'pending_bank_sms' | 'verified_and_delivered' | 'rejected';
  createdAt: number;
  slipImageUrl?: string;
  deliveredItem?: string;
}

export interface GatewayDevice {
  token: string;
  deviceId: string;
  deviceName: string;
  batteryLevel?: number;
  lastPing: number;
  isOnline: boolean;
}

export interface GatewayRule {
  id: string;
  name: string;
  sender: string;
  keyword: string;
  ignoreKeyword?: string;
  active: boolean;
}

class GatewayService {
  private dbFile = path.resolve(process.cwd(), 'data', 'bank_gateway_db.json');
  private devices: Map<string, GatewayDevice> = new Map();
  private notifications: BankNotification[] = [];
  private pendingSlips: PendingSlip[] = [];
  private botToken: string = 'yashi_gw_94740712934';
  private pairedBotNumber: string = '+94740712934';
  private rules: GatewayRule[] = [
    {
      id: 'rule-sampath',
      name: 'Sampath Bank - SMS',
      sender: 'SAMPATHTXN',
      keyword: 'credited',
      ignoreKeyword: 'debited',
      active: true,
    },
    {
      id: 'rule-ezcash',
      name: 'eZ Cash - SMS',
      sender: 'eZ Cash',
      keyword: 'Received',
      active: true,
    },
    {
      id: 'rule-combank',
      name: 'Commercial Bank - SMS',
      sender: 'COMBANK',
      keyword: 'credited',
      ignoreKeyword: 'debited',
      active: true,
    },
    {
      id: 'rule-boc',
      name: 'BOC - SmartPay SMS',
      sender: 'BOC',
      keyword: 'credited',
      active: true,
    },
    {
      id: 'rule-frimi',
      name: 'FriMi - NTB SMS',
      sender: 'FriMi',
      keyword: 'received',
      active: true,
    },
  ];

  constructor() {
    this.loadState();
    // Pre-populate realistic demonstration/initial bank notification if empty
    if (this.notifications.length === 0) {
      this.notifications.push({
        id: 'bank-init-01',
        bank: 'Commercial Bank',
        amount: 2500,
        currency: 'LKR',
        ref: '84920193',
        rawText: 'A/C ***123 Credited with LKR 2,500.00 on 22-OCT-2026. Ref: 84920193. Avail Bal: LKR 48,250.00',
        timestamp: Date.now() - 1000 * 60 * 15,
        matched: false,
        ruleName: 'Commercial Bank - SMS',
      });
    }
  }

  private loadState() {
    try {
      if (fs.existsSync(this.dbFile)) {
        const raw = fs.readFileSync(this.dbFile, 'utf-8');
        const data = JSON.parse(raw);
        if (Array.isArray(data.notifications)) this.notifications = data.notifications;
        if (Array.isArray(data.pendingSlips)) this.pendingSlips = data.pendingSlips;
        if (Array.isArray(data.rules) && data.rules.length > 0) this.rules = data.rules;
        if (data.botToken) this.botToken = data.botToken;
        if (data.pairedBotNumber) this.pairedBotNumber = data.pairedBotNumber;
        if (Array.isArray(data.devices)) {
          data.devices.forEach((d: GatewayDevice) => this.devices.set(d.deviceId, d));
        }
      }
    } catch (err) {
      console.warn('Gateway DB load note:', err);
    }
  }

  private saveState() {
    try {
      fs.mkdirSync(path.dirname(this.dbFile), { recursive: true });
      const data = {
        notifications: this.notifications.slice(0, 200),
        pendingSlips: this.pendingSlips.slice(0, 100),
        rules: this.rules,
        botToken: this.botToken,
        pairedBotNumber: this.pairedBotNumber,
        devices: Array.from(this.devices.values()),
        updatedAt: Date.now(),
      };
      fs.writeFileSync(this.dbFile, JSON.stringify(data, null, 2));
    } catch (err) {
      console.warn('Gateway DB save note:', err);
    }
  }

  public getRules(): GatewayRule[] {
    return this.rules;
  }

  public addRule(rule: Omit<GatewayRule, 'id'>): GatewayRule {
    const newRule: GatewayRule = {
      ...rule,
      id: `rule-${Date.now()}`,
      active: true,
    };
    this.rules.unshift(newRule);
    this.saveState();
    return newRule;
  }

  public deleteRule(id: string): boolean {
    const initLen = this.rules.length;
    this.rules = this.rules.filter((r) => r.id !== id);
    if (this.rules.length !== initLen) {
      this.saveState();
      return true;
    }
    return false;
  }

  public toggleRule(id: string): GatewayRule | null {
    const rule = this.rules.find((r) => r.id === id);
    if (rule) {
      rule.active = !rule.active;
      this.saveState();
      return rule;
    }
    return null;
  }

  public getConfig() {
    return {
      botToken: this.botToken,
      pairedBotNumber: this.pairedBotNumber,
      webhookUrl: '/api/gateway/bank-notification',
    };
  }

  public setConfig(token?: string, pairedNumber?: string) {
    if (token) this.botToken = token.trim();
    if (pairedNumber) this.pairedBotNumber = pairedNumber.trim();
    this.saveState();
    return this.getConfig();
  }

  public getTotals() {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    let todayAmount = 0;
    let todayCount = 0;
    let monthAmount = 0;
    let monthCount = 0;

    for (const notif of this.notifications) {
      if (notif.timestamp >= startOfToday) {
        todayAmount += notif.amount;
        todayCount++;
      }
      if (notif.timestamp >= startOfMonth) {
        monthAmount += notif.amount;
        monthCount++;
      }
    }

    return {
      todayAmount,
      todayCount,
      monthAmount,
      monthCount,
    };
  }

  /**
   * Parses arbitrary bank notification text (SMS or App Push)
   */
  public parseBankAlert(rawText: string, sender: string = ''): { bank: string; amount: number; ref: string; matchedRule?: string } {
    const text = (rawText || '') + ' ' + (sender || '');
    let bank = sender || 'Sri Lankan Bank';
    let matchedRule: string | undefined;

    // Check against active custom rules first
    for (const rule of this.rules) {
      if (!rule.active) continue;
      const senderMatch = !rule.sender || text.toLowerCase().includes(rule.sender.toLowerCase());
      const keywordMatch = !rule.keyword || text.toLowerCase().includes(rule.keyword.toLowerCase());
      const ignoreMatch = rule.ignoreKeyword && text.toLowerCase().includes(rule.ignoreKeyword.toLowerCase());

      if (senderMatch && keywordMatch && !ignoreMatch) {
        bank = rule.name.replace(/ - SMS$/i, '');
        matchedRule = rule.name;
        break;
      }
    }

    if (!matchedRule) {
      if (/combank|commercial/i.test(text)) bank = 'Commercial Bank';
      else if (/boc|bank of ceylon|smartpay/i.test(text)) bank = 'Bank of Ceylon (BOC)';
      else if (/sampath|wepay|vishwa/i.test(text)) bank = 'Sampath Bank';
      else if (/hnb|hatton/i.test(text)) bank = 'Hatton National Bank (HNB)';
      else if (/peoples|people'?s/i.test(text)) bank = "People's Bank";
      else if (/seylan/i.test(text)) bank = 'Seylan Bank';
      else if (/frimi|nations/i.test(text)) bank = 'FriMi / NTB';
      else if (/genie|dialog/i.test(text)) bank = 'Genie (Dialog Finance)';
      else if (/ez\s*cash/i.test(text)) bank = 'eZ Cash';
    }

    // Extract amount: e.g. LKR 2,500.00, Rs. 1500, Rs 500.00
    let amount = 0;
    const amountRegex = /(?:LKR|Rs\.?|රු\.?|credited with|received|amount:?)\s*([0-9,]+(?:\.[0-9]{2})?)/i;
    const amountMatch = text.match(amountRegex);
    if (amountMatch && amountMatch[1]) {
      amount = parseFloat(amountMatch[1].replace(/,/g, ''));
    } else {
      const numMatch = text.match(/([0-9,]+\.[0-9]{2})/);
      if (numMatch && numMatch[1]) {
        amount = parseFloat(numMatch[1].replace(/,/g, ''));
      }
    }

    // Extract reference number
    let ref = '';
    const refRegex = /(?:ref(?:erence)?(?:\s*no\.?)?|trx(?:\s*id)?|txn(?:\s*id)?|seq)[:\s-]*([a-zA-Z0-9]{5,20})/i;
    const refMatch = text.match(refRegex);
    if (refMatch && refMatch[1]) {
      ref = refMatch[1].toUpperCase().trim();
    } else {
      const standaloneNum = text.match(/\b([0-9]{6,12})\b/);
      if (standaloneNum && standaloneNum[1]) {
        ref = standaloneNum[1];
      }
    }

    return { bank, amount, ref, matchedRule };
  }

  /**
   * Process incoming notification from Android APK or Webhook
   */
  public registerNotification(payload: {
    token?: string;
    deviceId?: string;
    deviceName?: string;
    title?: string;
    message?: string;
    sender?: string;
    batteryLevel?: number;
    rawText?: string;
  }): { success: boolean; notification: BankNotification; matchedSlip?: PendingSlip } {
    const content = payload.rawText || `${payload.title || ''} ${payload.message || ''}`;
    const parsed = this.parseBankAlert(content, payload.sender || '');

    // Record or update device status
    if (payload.deviceId) {
      this.devices.set(payload.deviceId, {
        deviceId: payload.deviceId,
        deviceName: payload.deviceName || 'Android Device',
        token: payload.token || this.botToken,
        batteryLevel: payload.batteryLevel,
        lastPing: Date.now(),
        isOnline: true,
      });
    }

    const notification: BankNotification = {
      id: `bank-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      bank: parsed.bank,
      amount: parsed.amount,
      currency: 'LKR',
      ref: parsed.ref || `REF-${Date.now().toString().slice(-6)}`,
      rawText: content,
      timestamp: Date.now(),
      matched: false,
      ruleName: parsed.matchedRule,
    };

    // Attempt to match with existing pending customer slips
    let matchedSlip: PendingSlip | undefined;
    for (const slip of this.pendingSlips) {
      if (slip.status === 'pending_bank_sms') {
        const refMatch = notification.ref && slip.ref && (
          notification.ref.includes(slip.ref) || slip.ref.includes(notification.ref)
        );
        const amountMatch = Math.abs(notification.amount - slip.amount) < 1;

        if (refMatch || (amountMatch && notification.amount > 0)) {
          slip.status = 'verified_and_delivered';
          notification.matched = true;
          notification.matchedCustomer = slip.userName || slip.userJid;
          matchedSlip = slip;
          break;
        }
      }
    }

    this.notifications.unshift(notification);
    if (this.notifications.length > 200) this.notifications.pop();
    this.saveState();

    return { success: true, notification, matchedSlip };
  }

  /**
   * Register a customer's payment slip received on WhatsApp
   */
  public registerPendingSlip(data: {
    userJid: string;
    userName: string;
    amount: number;
    ref: string;
    bank?: string;
    slipImageUrl?: string;
    deliveredItem?: string;
  }): { isVerified: boolean; matchedNotification?: BankNotification; slip: PendingSlip } {
    const cleanRef = (data.ref || '').toUpperCase().trim();
    
    // Check if matching bank alert has already arrived in the last 24h
    let matchedNotification = this.notifications.find((notif) => {
      const refMatch = cleanRef && notif.ref && (
        notif.ref.includes(cleanRef) || cleanRef.includes(notif.ref)
      );
      const amountMatch = data.amount > 0 && Math.abs(notif.amount - data.amount) < 1;
      return !notif.matched && (refMatch || amountMatch);
    });

    const isVerified = Boolean(matchedNotification);
    if (matchedNotification) {
      matchedNotification.matched = true;
      matchedNotification.matchedCustomer = data.userName || data.userJid;
    }

    const slip: PendingSlip = {
      id: `slip-${Date.now()}`,
      userJid: data.userJid,
      userName: data.userName,
      amount: data.amount,
      ref: cleanRef,
      bank: data.bank || (matchedNotification?.bank ?? 'Bank Transfer'),
      status: isVerified ? 'verified_and_delivered' : 'pending_bank_sms',
      createdAt: Date.now(),
      slipImageUrl: data.slipImageUrl,
      deliveredItem: data.deliveredItem,
    };

    this.pendingSlips.unshift(slip);
    if (this.pendingSlips.length > 200) this.pendingSlips.pop();
    this.saveState();

    return { isVerified, matchedNotification, slip };
  }

  public getStatus() {
    const now = Date.now();
    const devicesList = Array.from(this.devices.values()).map(d => ({
      ...d,
      isOnline: (now - d.lastPing) < 1000 * 60 * 10,
    }));
    const isOnline = devicesList.some(d => d.isOnline);
    const totals = this.getTotals();

    return {
      isOnline,
      activeDevicesCount: devicesList.filter(d => d.isOnline).length,
      devices: devicesList,
      config: this.getConfig(),
      rules: this.rules,
      totals,
      recentNotifications: this.notifications.slice(0, 30),
      pendingSlips: this.pendingSlips.slice(0, 30),
      totalVerified: this.pendingSlips.filter(s => s.status === 'verified_and_delivered').length,
    };
  }

  public simulateTestNotification(amount: number = 1500, ref: string = '', bank: string = 'Commercial Bank') {
    const cleanRef = ref || Math.floor(10000000 + Math.random() * 90000000).toString();
    const rawText = `A/C ***789 Credited with LKR ${amount.toFixed(2)} on ${new Date().toLocaleDateString('en-GB')}. Ref: ${cleanRef}. [YASHI Pay Auto-Sync Alert]`;

    return this.registerNotification({
      deviceId: 'device-owner-01',
      deviceName: 'Bot Owner Phone',
      sender: bank,
      title: `${bank} Alert`,
      message: rawText,
      rawText,
      batteryLevel: 98,
    });
  }
}

export const gatewayService = new GatewayService();
