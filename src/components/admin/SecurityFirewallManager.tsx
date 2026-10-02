import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Lock,
  Eye,
  AlertTriangle,
  Ban,
  CheckCircle2,
  RefreshCw,
  Trash2,
  Search,
  Plus,
  Server,
  Zap,
  Filter,
  Globe,
  Activity,
  Terminal,
  FileText
} from 'lucide-react';
import {
  securityService,
  BlockedIpRecord,
  SecurityAuditLog,
  SecuritySettings,
  ThreatLevel
} from '../../services/securityService';

interface SecurityFirewallManagerProps {
  onNotify?: (message: string) => void;
}

export const SecurityFirewallManager: React.FC<SecurityFirewallManagerProps> = ({ onNotify }) => {
  const [settings, setSettings] = useState<SecuritySettings>(securityService.getSettings());
  const [blockedIps, setBlockedIps] = useState<BlockedIpRecord[]>(securityService.getBlockedIps());
  const [logs, setLogs] = useState<SecurityAuditLog[]>(securityService.getLogs());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Manual block form
  const [newIp, setNewIp] = useState('');
  const [newReason, setNewReason] = useState('');
  const [newThreat, setNewThreat] = useState<ThreatLevel>('HIGH');
  const [newDuration, setNewDuration] = useState(24);
  const [isSubmittingBlock, setIsSubmittingBlock] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedThreatFilter, setSelectedThreatFilter] = useState<string>('all');
  const [activeSubTab, setActiveSubTab] = useState<'logs' | 'blacklist' | 'rules'>('logs');

  const reloadData = async () => {
    setIsRefreshing(true);
    await securityService.syncWithBackend();
    setSettings(securityService.getSettings());
    setBlockedIps(securityService.getBlockedIps());
    setLogs(securityService.getLogs());
    setTimeout(() => setIsRefreshing(false), 300);
  };

  useEffect(() => {
    reloadData();
    const unsub = securityService.subscribe(() => {
      setSettings(securityService.getSettings());
      setBlockedIps(securityService.getBlockedIps());
      setLogs(securityService.getLogs());
    });
    return () => unsub();
  }, []);

  const handleToggleSetting = async (key: keyof SecuritySettings, val: any) => {
    const updated = { ...settings, [key]: val };
    setSettings(updated);
    await securityService.updateSettings({ [key]: val });
    if (onNotify) {
      onNotify(`Paramètre de sécurité mis à jour : ${String(key)}`);
    }
  };

  const handleManualBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIp.trim()) return;

    setIsSubmittingBlock(true);
    const success = await securityService.blockIp(
      newIp.trim(),
      newReason.trim() || 'Blocage manuel administrateur',
      newThreat,
      newDuration
    );
    setIsSubmittingBlock(false);

    if (success) {
      setNewIp('');
      setNewReason('');
      if (onNotify) onNotify(`Adresse IP ${newIp} ajoutée à la liste noire.`);
    }
  };

  const handleUnblock = async (ip: string) => {
    if (window.confirm(`Confirmez-vous le déblocage de l'adresse IP ${ip} ?`)) {
      await securityService.unblockIp(ip);
      if (onNotify) onNotify(`Adresse IP ${ip} débloquée.`);
    }
  };

  const handleClearLogs = async () => {
    if (window.confirm("Êtes-vous sûr de vouloir vider le journal des menaces et logs de sécurité ?")) {
      await securityService.clearLogs();
      if (onNotify) onNotify("Journal de sécurité réinitialisé.");
    }
  };

  // Filter logs
  const filteredLogs = logs.filter(log => {
    const matchesSearch =
      log.ip.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userAgent.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesThreat = selectedThreatFilter === 'all' || log.threatLevel === selectedThreatFilter;
    return matchesSearch && matchesThreat;
  });

  const getThreatBadge = (level: ThreatLevel) => {
    switch (level) {
      case 'CRITICAL':
        return <span className="px-2 py-0.5 rounded bg-red-950/80 text-red-400 border border-red-500/50 text-[10px] font-bold">CRITIQUE</span>;
      case 'HIGH':
        return <span className="px-2 py-0.5 rounded bg-orange-950/80 text-orange-400 border border-orange-500/50 text-[10px] font-bold">ÉLEVÉ</span>;
      case 'MEDIUM':
        return <span className="px-2 py-0.5 rounded bg-amber-950/80 text-amber-400 border border-amber-500/50 text-[10px] font-bold">MOYEN</span>;
      case 'LOW':
      default:
        return <span className="px-2 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-500/50 text-[10px] font-bold">FAIBLE</span>;
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'BLOCKED':
        return <span className="px-2 py-0.5 rounded bg-red-900/60 text-red-300 text-[10px] font-mono font-bold flex items-center gap-1 w-fit"><Ban className="w-3 h-3" /> BLOQUÉ</span>;
      case 'RATE_LIMITED':
        return <span className="px-2 py-0.5 rounded bg-amber-900/60 text-amber-300 text-[10px] font-mono font-bold flex items-center gap-1 w-fit"><Zap className="w-3 h-3" /> RATE LIMITÉ</span>;
      default:
        return <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-mono flex items-center gap-1 w-fit"><Activity className="w-3 h-3" /> AUDITÉ</span>;
    }
  };

  return (
    <div className="space-y-6 text-slate-200">
      {/* ================= BANNIÈRE DE STATUT DE SÉCURITÉ ================= */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-6 rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-emerald-950/80 border border-emerald-500/50 rounded-2xl shadow-lg shadow-emerald-950/50">
              <ShieldCheck className="w-8 h-8 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white tracking-wide uppercase">
                  Bouclier de Sécurité & Détection d'Intrusions
                </h2>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Actif & Isolé
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                Protection globale anti-scraping, filtrage d'en-têtes HTTP de niveau Helmet, limitation de débit adaptative et blocage automatique des adresses IP malveillantes.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={reloadData}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700/80 transition-all cursor-pointer shrink-0 shadow"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-orange-400' : ''}`} />
            <span>Actualiser en direct</span>
          </button>
        </div>

        {/* 4 Indicateurs Clés */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800/80">
          <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-blue-400" /> IPs Bloquées
            </div>
            <div className="text-xl font-black text-white mt-1.5 font-mono flex items-center gap-2">
              <span>{blockedIps.length}</span>
              <span className="text-[10px] font-normal text-slate-400">actives</span>
            </div>
          </div>

          <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" /> Menaces Interceptées
            </div>
            <div className="text-xl font-black text-amber-400 mt-1.5 font-mono">
              {logs.filter(l => l.threatLevel === 'HIGH' || l.threatLevel === 'CRITICAL').length}
            </div>
          </div>

          <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-emerald-400" /> Anti-Scraping
            </div>
            <div className="text-xs font-bold text-emerald-300 mt-2 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{settings.antiScrapingShield ? 'Verrouillage Actif' : 'Désactivé'}</span>
            </div>
          </div>

          <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-purple-400" /> Piège Honeypot
            </div>
            <div className="text-xs font-bold text-purple-300 mt-2 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-purple-400" />
              <span>Surveillance 24/7</span>
            </div>
          </div>
        </div>
      </div>

      {/* ================= SOUS-ONGLETS DE NAVIGATION ================= */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-950 border border-slate-800 rounded-2xl">
        <button
          type="button"
          onClick={() => setActiveSubTab('logs')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeSubTab === 'logs'
              ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Journal d'Audit & Intrusions ({logs.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('blacklist')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeSubTab === 'blacklist'
              ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Ban className="w-4 h-4" />
          <span>Liste Noire & Blocage d'IPs ({blockedIps.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('rules')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeSubTab === 'rules'
              ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Règles Anti-Extraction & Pare-Feu</span>
        </button>
      </div>

      {/* ================= SOUS-ONGLET 1: LOGS DE SÉCURITÉ ================= */}
      {activeSubTab === 'logs' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Barre d'outils et filtres */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex flex-1 items-center gap-2 bg-slate-900 px-3.5 py-2 rounded-xl border border-slate-700/80">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher par adresse IP, chemin, motif ou robot..."
                className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-700/80 text-xs">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={selectedThreatFilter}
                  onChange={(e) => setSelectedThreatFilter(e.target.value)}
                  className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer"
                >
                  <option value="all">Toutes les menaces</option>
                  <option value="CRITICAL">Critiques uniquement</option>
                  <option value="HIGH">Élevées</option>
                  <option value="MEDIUM">Moyennes</option>
                  <option value="LOW">Faibles / Audit</option>
                </select>
              </div>

              <button
                type="button"
                onClick={handleClearLogs}
                className="px-3 py-2 bg-slate-900 hover:bg-red-950/60 text-slate-400 hover:text-red-300 border border-slate-800 hover:border-red-800/60 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                title="Vider le journal"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Vider</span>
              </button>
            </div>
          </div>

          {/* Table des logs */}
          <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Horodatage</th>
                    <th className="py-3 px-4">Adresse IP</th>
                    <th className="py-3 px-4">Niveau</th>
                    <th className="py-3 px-4">Méthode & Chemin</th>
                    <th className="py-3 px-4">Motif de l'événement</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">User-Agent / Empreinte</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500 font-sans">
                        <ShieldCheck className="w-8 h-8 text-emerald-400/50 mx-auto mb-2" />
                        <p className="text-xs font-bold text-slate-400">Aucune menace ou événement suspect détecté.</p>
                        <p className="text-[11px] text-slate-600 mt-0.5">Le bouclier anti-intrusion filtre et protège le trafic en continu.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-900/50 transition-colors">
                        <td className="py-2.5 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleTimeString('fr-FR')} - {new Date(log.timestamp).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="py-2.5 px-4 text-white font-bold whitespace-nowrap">
                          {log.ip}
                        </td>
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          {getThreatBadge(log.threatLevel)}
                        </td>
                        <td className="py-2.5 px-4 text-slate-300 font-sans whitespace-nowrap">
                          <span className="font-mono text-[10px] font-bold text-orange-400 mr-1.5">{log.method}</span>
                          <span className="text-[11px] truncate max-w-xs inline-block align-bottom">{log.path}</span>
                        </td>
                        <td className="py-2.5 px-4 text-slate-200 font-sans text-[11px]">
                          {log.reason}
                        </td>
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          {getActionBadge(log.actionTaken)}
                        </td>
                        <td className="py-2.5 px-4 text-slate-500 font-sans text-[10px] truncate max-w-[200px]" title={log.userAgent}>
                          {log.userAgent}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= SOUS-ONGLET 2: LISTE NOIRE D'IPS ================= */}
      {activeSubTab === 'blacklist' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Formulaire de blocage manuel */}
          <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 shadow-xl">
            <h3 className="text-xs font-bold uppercase tracking-wider text-orange-400 flex items-center gap-2 mb-4">
              <Plus className="w-4 h-4" /> Bloquer manuellement une Adresse IP suspecte
            </h3>
            <form onSubmit={handleManualBlock} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Adresse IP *</label>
                <input
                  type="text"
                  required
                  value={newIp}
                  onChange={(e) => setNewIp(e.target.value)}
                  placeholder="Ex: 198.51.100.42"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 font-mono"
                />
              </div>

              <div className="lg:col-span-2">
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Motif du blocage</label>
                <input
                  type="text"
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  placeholder="Ex: Tentative d'extraction massive ou de scan automatisé"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Niveau de menace</label>
                <select
                  value={newThreat}
                  onChange={(e) => setNewThreat(e.target.value as ThreatLevel)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500 cursor-pointer"
                >
                  <option value="CRITICAL">Critique</option>
                  <option value="HIGH">Élevé</option>
                  <option value="MEDIUM">Moyen</option>
                  <option value="LOW">Faible</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={isSubmittingBlock}
                  className="w-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-2 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Ban className="w-4 h-4" />
                  <span>{isSubmittingBlock ? 'Blocage...' : 'Bloquer IP'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Table des IPs Bloquées */}
          <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="p-4 bg-slate-900/70 border-b border-slate-800 flex justify-between items-center">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Ban className="w-4 h-4 text-red-400" /> Adresses IP actuellement interdites d'accès
              </h4>
              <span className="text-[11px] text-slate-400">{blockedIps.length} IPs blacklistées</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Adresse IP</th>
                    <th className="py-3 px-4">Motif</th>
                    <th className="py-3 px-4">Niveau</th>
                    <th className="py-3 px-4">Date de blocage</th>
                    <th className="py-3 px-4">Expiration</th>
                    <th className="py-3 px-4">Tentatives bloquées</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {blockedIps.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-500 font-sans">
                        <CheckCircle2 className="w-7 h-7 text-emerald-400 mx-auto mb-2" />
                        <p className="text-xs font-bold text-slate-300">Aucune adresse IP n'est actuellement bloquée.</p>
                      </td>
                    </tr>
                  ) : (
                    blockedIps.map((b, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/40">
                        <td className="py-3 px-4 text-white font-bold">{b.ip}</td>
                        <td className="py-3 px-4 text-slate-300 font-sans text-[11px]">{b.reason}</td>
                        <td className="py-3 px-4">{getThreatBadge(b.threatLevel)}</td>
                        <td className="py-3 px-4 text-slate-400 text-[11px]">
                          {new Date(b.blockedAt).toLocaleString('fr-FR')}
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-[11px]">
                          {b.expiresAt ? new Date(b.expiresAt).toLocaleString('fr-FR') : 'Permanent'}
                        </td>
                        <td className="py-3 px-4 text-orange-400 font-bold">{b.attemptsCount || 1}</td>
                        <td className="py-3 px-4 text-right font-sans">
                          <button
                            type="button"
                            onClick={() => handleUnblock(b.ip)}
                            className="px-3 py-1 bg-slate-800 hover:bg-emerald-900 text-slate-300 hover:text-emerald-200 border border-slate-700 hover:border-emerald-600 rounded-lg text-xs font-bold transition-all cursor-pointer"
                          >
                            Débloquer
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= SOUS-ONGLET 3: RÈGLES & PARAMÈTRES ANTI-EXTRACTION ================= */}
      {activeSubTab === 'rules' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-6">
            <div>
              <h3 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#FF6600]" /> Paramétrage du Pare-Feu Applicatif & Bouclier Anti-Extraction
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Configurez les règles automatiques d'interception de scrapers, de protection des fiches techniques et de limitation de débit.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Toggle 1 : Anti-Scraping */}
              <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 flex items-start justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wide">
                    Bouclier Anti-Extraction de Données
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Bloque les aspirateurs de catalogue, frameworks de scraping (Scrapy, Puppeteer, cURL, Python) et crawlers non déclarés.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                  <input
                    type="checkbox"
                    checked={settings.antiScrapingShield}
                    onChange={(e) => handleToggleSetting('antiScrapingShield', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* Toggle 2 : Auto-Block IPs */}
              <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 flex items-start justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wide">
                    Bannissement Automatique des Intrusions
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Bannit automatiquement toute adresse IP effectuant des scans de failles (.env, wp-admin, path traversal) ou tombant dans le piège Honeypot.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                  <input
                    type="checkbox"
                    checked={settings.autoBlockEnabled}
                    onChange={(e) => handleToggleSetting('autoBlockEnabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* Toggle 3 : Strict Rate Limiting */}
              <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 flex items-start justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wide">
                    Limitation de Débit Adaptative (Rate Limiting)
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Empêche la saturation de l'API et les requêtes en rafale (protection DoS et quota de sécurité).
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                  <input
                    type="checkbox"
                    checked={settings.strictRateLimit}
                    onChange={(e) => handleToggleSetting('strictRateLimit', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* Toggle 4 : Block Headless Bots */}
              <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 flex items-start justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wide">
                    Filtrage des Navigateurs Headless
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Refuse l'accès aux requêtes HTTP automatisées dépourvues d'empreinte de navigateur utilisateur valide.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                  <input
                    type="checkbox"
                    checked={settings.blockHeadlessBots}
                    onChange={(e) => handleToggleSetting('blockHeadlessBots', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>
            </div>

            {/* Durée de blocage et seuil de requêtes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-800">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Durée par défaut du bannissement automatique d'IP
                </label>
                <select
                  value={settings.blockDurationHours}
                  onChange={(e) => handleToggleSetting('blockDurationHours', Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-orange-500 cursor-pointer"
                >
                  <option value={12}>12 Heures</option>
                  <option value={24}>24 Heures (Recommandé)</option>
                  <option value={48}>48 Heures</option>
                  <option value={72}>72 Heures (3 jours)</option>
                  <option value={168}>1 Semaine</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Seuil maximal de requêtes par minute (par IP)
                </label>
                <select
                  value={settings.maxRequestsPerMinute}
                  onChange={(e) => handleToggleSetting('maxRequestsPerMinute', Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-orange-500 cursor-pointer"
                >
                  <option value={60}>60 requêtes / min (Très strict)</option>
                  <option value={90}>90 requêtes / min (Équilibré standard)</option>
                  <option value={120}>120 requêtes / min (Souple)</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
