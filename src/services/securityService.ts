/**
 * Service de Sécurité, Détection d'Intrusions, Blocage d'IPs & Anti-Extraction de Données
 * Zone Équipements Sénégal
 */

export type ThreatLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type SecurityAction = 'BLOCKED' | 'RATE_LIMITED' | 'LOGGED' | 'WARNING';

export interface SecurityAuditLog {
  id: string;
  timestamp: string;
  ip: string;
  method: string;
  path: string;
  userAgent: string;
  threatLevel: ThreatLevel;
  reason: string;
  actionTaken: SecurityAction;
}

export interface BlockedIpRecord {
  ip: string;
  reason: string;
  threatLevel: ThreatLevel;
  blockedAt: string;
  expiresAt?: string;
  manual: boolean;
  attemptsCount?: number;
}

export interface SecuritySettings {
  autoBlockEnabled: boolean;
  antiScrapingShield: boolean;
  strictRateLimit: boolean;
  blockDurationHours: number;
  maxRequestsPerMinute: number;
  blockHeadlessBots: boolean;
}

const DEFAULT_SETTINGS: SecuritySettings = {
  autoBlockEnabled: true,
  antiScrapingShield: true,
  strictRateLimit: true,
  blockDurationHours: 24,
  maxRequestsPerMinute: 90,
  blockHeadlessBots: true
};

const STORAGE_KEYS = {
  BLOCKED_IPS: 'ze_security_blocked_ips',
  LOGS: 'ze_security_logs',
  SETTINGS: 'ze_security_settings'
};

class SecurityService {
  private listeners: Set<() => void> = new Set();
  private localLogs: SecurityAuditLog[] = [];
  private localBlockedIps: BlockedIpRecord[] = [];
  private settings: SecuritySettings = DEFAULT_SETTINGS;

  constructor() {
    this.loadFromStorage();
    this.syncWithBackend();
  }

  private loadFromStorage() {
    try {
      const savedLogs = localStorage.getItem(STORAGE_KEYS.LOGS);
      if (savedLogs) {
        this.localLogs = JSON.parse(savedLogs);
      }
      const savedIps = localStorage.getItem(STORAGE_KEYS.BLOCKED_IPS);
      if (savedIps) {
        this.localBlockedIps = JSON.parse(savedIps);
      }
      const savedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (savedSettings) {
        this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) };
      }
    } catch (e) {
      console.warn('SecurityService storage load error:', e);
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(this.localLogs.slice(0, 500)));
      localStorage.setItem(STORAGE_KEYS.BLOCKED_IPS, JSON.stringify(this.localBlockedIps));
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(this.settings));
    } catch (e) {
      console.warn('SecurityService storage save error:', e);
    }
  }

  public subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify() {
    this.saveToStorage();
    this.listeners.forEach(cb => cb());
  }

  public async syncWithBackend(): Promise<void> {
    try {
      const res = await fetch('/api/security/status');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.blockedIps)) {
          this.localBlockedIps = data.blockedIps;
        }
        if (Array.isArray(data.logs)) {
          this.localLogs = data.logs;
        }
        if (data.settings) {
          this.settings = { ...this.settings, ...data.settings };
        }
        this.notify();
      }
    } catch (err) {
      // Backend may be offline or starting, local state remains
    }
  }

  public getSettings(): SecuritySettings {
    return { ...this.settings };
  }

  public async updateSettings(newSettings: Partial<SecuritySettings>): Promise<void> {
    this.settings = { ...this.settings, ...newSettings };
    this.notify();

    try {
      await fetch('/api/security/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.settings)
      });
    } catch (err) {
      console.warn('Failed to sync settings to server:', err);
    }
  }

  public getBlockedIps(): BlockedIpRecord[] {
    return [...this.localBlockedIps];
  }

  public getLogs(): SecurityAuditLog[] {
    return [...this.localLogs];
  }

  public async blockIp(ip: string, reason: string, threatLevel: ThreatLevel = 'HIGH', durationHours = 24): Promise<boolean> {
    const cleanIp = ip.trim();
    if (!cleanIp) return false;

    const expiresAt = durationHours > 0 
      ? new Date(Date.now() + durationHours * 3600 * 1000).toISOString()
      : undefined;

    const newRecord: BlockedIpRecord = {
      ip: cleanIp,
      reason,
      threatLevel,
      blockedAt: new Date().toISOString(),
      expiresAt,
      manual: true,
      attemptsCount: 1
    };

    // Remove if already present, then prepend
    this.localBlockedIps = [newRecord, ...this.localBlockedIps.filter(r => r.ip !== cleanIp)];

    // Add log
    this.addLog({
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toISOString(),
      ip: cleanIp,
      method: 'ADMIN',
      path: '/api/security/block-ip',
      userAgent: 'Admin Manual Action',
      threatLevel,
      reason: `Blocage manuel : ${reason}`,
      actionTaken: 'BLOCKED'
    });

    this.notify();

    try {
      await fetch('/api/security/block-ip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip: cleanIp, reason, threatLevel, durationHours })
      });
      return true;
    } catch (err) {
      console.warn('Failed to sync block to server:', err);
      return true;
    }
  }

  public async unblockIp(ip: string): Promise<boolean> {
    const cleanIp = ip.trim();
    this.localBlockedIps = this.localBlockedIps.filter(r => r.ip !== cleanIp);

    this.addLog({
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toISOString(),
      ip: cleanIp,
      method: 'ADMIN',
      path: '/api/security/unblock-ip',
      userAgent: 'Admin Manual Action',
      threatLevel: 'LOW',
      reason: `Déblocage manuel de l'adresse IP`,
      actionTaken: 'LOGGED'
    });

    this.notify();

    try {
      await fetch('/api/security/unblock-ip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip: cleanIp })
      });
      return true;
    } catch (err) {
      console.warn('Failed to sync unblock to server:', err);
      return true;
    }
  }

  public addLog(log: SecurityAuditLog) {
    this.localLogs = [log, ...this.localLogs.slice(0, 499)];
    this.notify();
  }

  public async clearLogs(): Promise<void> {
    this.localLogs = [];
    this.notify();

    try {
      await fetch('/api/security/clear-logs', { method: 'POST' });
    } catch (err) {
      console.warn('Failed to clear logs on server:', err);
    }
  }
}

export const securityService = new SecurityService();
